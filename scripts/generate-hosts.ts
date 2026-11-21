#!/usr/bin/env bun
// Builds the Codex and Claude Code instruction surfaces from one source:
//   bun scripts/generate-hosts.ts                      write AGENTS.md, agents/, briefs/, and claude/ artifacts
//   bun scripts/generate-hosts.ts --check              fail when an artifact is stale or missing
//   bun scripts/generate-hosts.ts --install [--home D] link artifacts into D/.claude and D/.agents, merge settings
//   bun scripts/generate-hosts.ts --check-installed [--home D]  verify the live install, read-only
import { spawnSync } from "node:child_process"
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { claudeSkillState, readLock, resolvePaths } from "./external-skills.ts"
import { roles as registry, toolNotes, type Provider, type Role, type Seat } from "../roles/roles.ts"

export type Host = "codex" | "claude"
type Json = Record<string, unknown>

const hosts: Host[] = ["codex", "claude"]
const header = "<!-- Generated from instructions/ by scripts/generate-hosts.ts. Edit the source, then regenerate. -->"
const hostOpen = /^\s*<!--\s*host:(\S+)\s*-->\s*$/
const hostClose = /^\s*<!--\s*\/host\s*-->\s*$/
const include = /^\s*<!--\s*include:(\S+)\s*-->\s*$/

function expand(source: string, host: Host, readInclude: (name: string) => string, stack: string[]): string[] {
  const out: string[] = []
  let block: Host | null = null
  for (const line of source.split("\n")) {
    const open = hostOpen.exec(line)
    if (open) {
      if (!hosts.includes(open[1] as Host)) throw new Error(`unknown host block: ${open[1]}`)
      block = open[1] as Host
      continue
    }
    if (hostClose.test(line)) {
      if (!block) throw new Error("<!-- /host --> without an open host block")
      block = null
      continue
    }
    if (block && block !== host) continue
    const inc = include.exec(line)
    if (inc) {
      if (stack.includes(inc[1]!)) throw new Error(`include cycle: ${[...stack, inc[1]].join(" -> ")}`)
      out.push(...expand(readInclude(inc[1]!), host, readInclude, [...stack, inc[1]!]))
    } else out.push(line)
  }
  if (block) throw new Error(`unclosed host block: ${block}`)
  return out
}

/** Renders one host's view: keeps shared and matching host-block lines, resolves includes, strips comments. */
export function renderInstructions(source: string, host: Host, readInclude: (name: string) => string): string {
  return expand(source, host, readInclude, []).join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n"
}

/** Renders one host's view of a role's instructions: the role's markdown, the skills it loads unless preloaded, and its tool notes. */
const roleBody = (role: Role, instructions: string, preloaded: boolean) =>
  instructions.trim() +
  (role.skills.length && !preloaded ? `\n\nLoad these skills before work: ${role.skills.map(skill => `\`${skill}\``).join(", ")}.` : "") +
  role.toolNotes.map(tool => `\n\n${toolNotes[tool]}`).join("")

const readOnlyTools = "Edit, Write, NotebookEdit, Agent"
const providerInstance: Record<Provider, string> = { codex: "codex", claude: "claudeAgent" }
const effortOption: Record<Provider, string> = { codex: "reasoningEffort", claude: "effort" }

/** The delegate_task target for one seat, as T3's orchestrator_capabilities names providers and options. */
export const seatTarget = (seat: Seat) => ({ providerInstanceId: providerInstance[seat.provider], model: seat.model, options: { [effortOption[seat.provider]]: seat.effort } })

/** Read-only roles run delegated children in plan mode; every child runs with full access so nothing waits on Q's approval. */
export const delegateModes = (role: Role) => ({ runtimeMode: "full-access", interactionMode: role.authority === "read-only" ? "plan" : "default" })

function seatFor(name: string, role: Role, provider: Provider): Seat | undefined {
  const seats = role.seats.filter(seat => seat.provider === provider)
  if (seats.length > 1) throw new Error(`roles/roles.ts: ${name} has two ${provider} seats`)
  return seats[0]
}

function checkRoles(roles: Record<string, Role>, instructions: Map<string, string>) {
  for (const [name, role] of Object.entries(roles)) {
    if (!role.seats.length) throw new Error(`roles/roles.ts: ${name} has no seats`)
    for (const provider of ["codex", "claude"] as const) seatFor(name, role, provider)
    const body = instructions.get(name)
    if (!body?.trim()) throw new Error(`roles/roles.ts: no roles/${name}.md for ${name}`)
    if (body.includes("'''")) throw new Error(`roles/${name}.md must not contain '''`)
  }
  const orphans = [...instructions.keys()].filter(name => !roles[name])
  if (orphans.length) throw new Error(`roles/: no role in roles/roles.ts for ${orphans.map(name => `${name}.md`).join(", ")}`)
}

/** Native Codex profiles, one per role with a Codex seat. */
export function renderCodexProfiles(roles: Record<string, Role>, instructions: Map<string, string>): Map<string, string> {
  checkRoles(roles, instructions)
  const profiles = new Map<string, string>()
  for (const [name, role] of Object.entries(roles)) {
    const seat = seatFor(name, role, "codex")
    if (!seat) continue
    profiles.set(name, [
      "# Generated from roles/ by scripts/generate-hosts.ts. Edit the source, then regenerate.",
      `name = ${JSON.stringify(name)}`,
      `description = ${JSON.stringify(role.description)}`,
      `model = ${JSON.stringify(seat.model)}`,
      `model_reasoning_effort = ${JSON.stringify(seat.effort)}`,
      `sandbox_mode = ${JSON.stringify(role.authority === "read-only" ? "read-only" : "workspace-write")}`,
      // A literal string keeps backslashes in instructions verbatim; checkRoles rejects ''' inside them.
      `developer_instructions = '''\n${roleBody(role, instructions.get(name)!, false)}\n'''`,
      "",
    ].join("\n"))
  }
  return profiles
}

/** Native Claude agents, one per role with a Claude seat. */
export function renderClaudeAgents(roles: Record<string, Role>, instructions: Map<string, string>): Map<string, string> {
  checkRoles(roles, instructions)
  const agents = new Map<string, string>()
  for (const [name, role] of Object.entries(roles)) {
    const seat = seatFor(name, role, "claude")
    if (!seat) continue
    const fm = [
      "---",
      `name: ${name}`,
      `description: ${JSON.stringify(role.description)}`,
      `model: ${seat.model}`,
      `effort: ${seat.effort}`,
      `disallowedTools: ${role.authority === "write" ? "Agent" : readOnlyTools}`,
      `color: ${role.color}`,
      ...(role.skills.length ? ["skills:", ...role.skills.map(skill => `  - ${skill}`)] : []),
      "---",
      "",
    ]
    agents.set(name, fm.join("\n") + roleBody(role, instructions.get(name)!, true) + "\n")
  }
  return agents
}

const seatLabel = (seat: Seat) => `${seat.model} at ${seat.effort}`
const hostName: Record<Provider, string> = { codex: "Codex", claude: "Claude Code" }
const otherHost = (provider: Provider) => hostName[provider === "codex" ? "claude" : "codex"]

/** T3 delegation briefs: how to launch each seat, then the instructions a delegated child starts with. */
export function renderBriefs(roles: Record<string, Role>, instructions: Map<string, string>): Map<string, string> {
  checkRoles(roles, instructions)
  const briefs = new Map<string, string>()
  for (const [name, role] of Object.entries(roles)) {
    const modes = delegateModes(role)
    const seats = role.seats.map(seat =>
      `- ${seatLabel(seat)}: the native \`${name}\` agent in ${hostName[seat.provider]}; from ${otherHost(seat.provider)}, \`delegate_task\` with target \`${JSON.stringify(seatTarget(seat))}\`.`)
    briefs.set(name, [
      "<!-- Generated from roles/ by scripts/generate-hosts.ts. Edit the source, then regenerate. -->",
      `# ${name}`,
      "",
      role.seats.length > 1 ? "Launch both seats in parallel with the same assignment, and a `judge` reconciles them, unless the calling skill asks for one seat; then launch the seat native to your host." : "Launch this seat:",
      ...seats,
      "",
      `Every \`delegate_task\` call passes \`runtimeMode: "${modes.runtimeMode}"\` and \`interactionMode: "${modes.interactionMode}"\`.`,
      "After each launch, read `t3_thread_configuration` for the child. If its model, effort option, runtime mode, or interaction mode differs from this brief, cancel it with `task_cancel` and relaunch once; report a second mismatch instead of retrying.",
      "Launch exactly the model named here. If the provider reports it unavailable, recheck `orchestrator_capabilities` and retry once when it is listed; otherwise report a blocked seat and try this model again at the next launch.",
      "A delegated child starts with everything below the line, followed by the assignment.",
      "",
      "---",
      "",
      `You are the \`${name}\` subagent. ${role.description}`,
      "",
      roleBody(role, instructions.get(name)!, false),
      "",
    ].join("\n"))
  }
  return briefs
}

/** Where --install links the briefs, so both hosts read them at one path. */
export const briefsHome = "~/.agents/briefs"

/** The role table included into AGENTS.md and CLAUDE.md as `<!-- include:roles.md -->`; seats live in the briefs, so the always-loaded table stays model-free. */
export function renderRoleTable(roles: Record<string, Role>): string {
  return Object.entries(roles).map(([name, role]) => `- \`${name}\` (${role.authority}): \`${briefsHome}/${name}.md\`.`).join("\n") + "\n"
}

/** pstack's per-role model lines, each mapped onto the seats of the roles it launches through, optionally narrowed to one provider's seat. */
const pstackLines: [line: string, picks: [role: string, provider?: Provider][]][] = [
  ["feature, refactoring", [["implementer"]]],
  ["bug-fix", [["implementer"]]],
  ["perf-issue", [["implementer"]]],
  ["hillclimb", [["implementer"]]],
  ["judgment and prose", [["implementer"]]],
  ["hardest tasks", [["architect", "claude"]]],
  ["how explorer", [["explorer"]]],
  ["how explainer", [["judge"]]],
  ["why investigators", [["explorer"]]],
  ["why synthesizer", [["judge"]]],
  ["reflect tooling", [["explorer"]]],
  ["reflect judgment, divergent, synthesizer", [["judge"]]],
  ["arena runners", [["architect"]]],
  ["arena cross-judge pool", [["judge"]]],
  ["architect runners", [["architect"]]],
  ["interrogate reviewers", [["verifier"], ["implementer"]]],
]

/** The model rule pstack's skills read from ~/.cursor/rules/pstack-models.mdc, generated so they run on our seats. A value is `<model>-<effort>` slugs followed by the role whose brief launches them. */
export function renderPstackModels(roles: Record<string, Role>): string {
  const pick = ([name, provider]: [string, Provider?]) => {
    const role = roles[name]
    if (!role) throw new Error(`pstack-models: no role ${name} in roles/roles.ts`)
    const seats = role.seats.filter(seat => !provider || seat.provider === provider)
    if (!seats.length) throw new Error(`pstack-models: ${name} has no ${provider} seat`)
    return `${seats.map(seat => `${seat.model}-${seat.effort}`).join(", ")} (${name})`
  }
  return [
    "---",
    "description: pstack per-role model choices (overrides skill defaults)",
    "alwaysApply: true",
    "---",
    "# Generated from roles/roles.ts by scripts/generate-hosts.ts. Each value lists `<model>-<effort>` slugs and, in parentheses, the role that runs them;",
    `# launch each call through the brief of the role its function maps to (${briefsHome}/<role>.md), per ~/.agents/third-party-skills.md.`,
    ...pstackLines.map(([line, picks]) => `${line}: ${picks.map(pick).join(", ")}`),
    "",
  ].join("\n")
}

function readRoleInstructions(repo: string): Map<string, string> {
  const dir = join(repo, "roles")
  return new Map(readdirSync(dir).filter(f => f.endsWith(".md")).sort()
    .map(f => [f.slice(0, -".md".length), readFileSync(join(dir, f), "utf8")]))
}

/** Every generated artifact, keyed by repo-relative path. */
export function buildArtifacts(repo: string, roles = registry): Map<string, string> {
  const dir = join(repo, "instructions")
  const roleInstructions = readRoleInstructions(repo)
  const generated: Record<string, () => string> = { "roles.md": () => renderRoleTable(roles) }
  const readInclude = (name: string) => generated[name]?.() ?? readFileSync(join(dir, name), "utf8")
  const global = readFileSync(join(dir, "global.md"), "utf8")
  const style = [
    "---",
    "name: Q",
    `description: ${JSON.stringify("Q's reply rules: telegram-style, budgeted, evidence in artifacts")}`,
    "keep-coding-instructions: true",
    "---",
    "",
    renderInstructions(readInclude("response-style.md"), "claude", readInclude),
  ].join("\n")
  const artifacts = new Map([
    ["AGENTS.md", `${header}\n\n${renderInstructions(global, "codex", readInclude)}`],
    ["claude/CLAUDE.md", `${header}\n\n${renderInstructions(global, "claude", readInclude)}`],
    ["claude/output-styles/q.md", style],
  ])
  for (const [name, content] of renderCodexProfiles(roles, roleInstructions)) artifacts.set(`agents/${name}.toml`, content)
  for (const [name, content] of renderClaudeAgents(roles, roleInstructions)) artifacts.set(`claude/agents/${name}.md`, content)
  for (const [name, content] of renderBriefs(roles, roleInstructions)) artifacts.set(`briefs/${name}.md`, content)
  artifacts.set("external/pstack-models.mdc", renderPstackModels(roles))
  return artifacts
}

/** Entries in generator-owned directories that no artifact accounts for; directories end in "/". */
function strays(repo: string, artifacts: Map<string, string>): string[] {
  return ["agents", "briefs", "claude/agents", "claude/output-styles"].flatMap(dir => {
    if (!existsSync(join(repo, dir))) return []
    return readdirSync(join(repo, dir), { withFileTypes: true })
      .map(entry => `${dir}/${entry.name}${entry.isDirectory() ? "/" : ""}`)
      .filter(path => !artifacts.has(path))
  }).sort()
}

/** Lists stale, missing, and unexpected artifacts without writing. */
export function checkArtifacts(repo: string): string[] {
  const artifacts = buildArtifacts(repo)
  const problems: string[] = []
  for (const [path, content] of artifacts) {
    const file = join(repo, path)
    if (!existsSync(file)) problems.push(`missing: ${path}`)
    else if (readFileSync(file, "utf8") !== content) problems.push(`stale: ${path}`)
  }
  for (const path of strays(repo, artifacts)) problems.push(`unexpected: ${path}`)
  return problems
}

export function writeArtifacts(repo: string): string[] {
  const artifacts = buildArtifacts(repo)
  const changed: string[] = []
  for (const [path, content] of artifacts) {
    const file = join(repo, path)
    if (existsSync(file) && readFileSync(file, "utf8") === content) continue
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
    changed.push(`wrote: ${path}`)
  }
  for (const path of strays(repo, artifacts)) {
    if (path.endsWith("/")) {
      changed.push(`unexpected directory left in place; remove it by hand: ${path}`)
      continue
    }
    rmSync(join(repo, path))
    changed.push(`removed: ${path}`)
  }
  return changed
}

/** Source of the skills this checkout publishes, as recorded in ~/.agents/.skill-lock.json. */
export const skillsLockSource = "signalharbor27/codex-agents"

// onLine reports each install step as it happens, so a failure midway still shows backups and old link targets.
export type InstallOptions = { codexHome?: string; stamp?: string; onLine?: (line: string) => void }
type Link = { path: string; target: string; optional?: boolean }

/** Hook scripts the install links one by one, so other files in ~/.claude/hooks stay untouched. */
export function hookFiles(repo: string): string[] {
  return readdirSync(join(repo, "claude/hooks")).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts")).sort()
}

const codexSessionDateHook: Json = {
  type: "command",
  command: 'bun "$HOME/.claude/hooks/session-date.ts"',
  timeout: 5,
}

/** Managed SessionStart hook group appended to Codex's hooks.json after existing hooks so prior hook indices stay stable. */
const codexSessionDateGroup: Json = {
  hooks: [codexSessionDateHook],
}

/** Managed named hook merged into Antigravity's ~/.gemini/config/hooks.json alongside other hooks. */
const antigravitySessionDateHook: Json = {
  SessionStart: [
    {
      type: "command",
      command: 'bun "$HOME/.claude/hooks/session-date.ts" --format antigravity',
      timeout: 5,
    },
  ],
}

function isCodexSessionDateCommand(command: string): boolean {
  const normalized = command.replace(/^bun\s+--no-env-file\s+/, "bun ")
  return ownHookFile(normalized) === "session-date.ts"
}

export function mergeCodexHooks(installed: Json): Json {
  const existing = asObject(installed.hooks)
  const groups = [existing.SessionStart ?? []].flat()
  let matches = 0
  for (const group of groups) {
    const hooks = asObject(group).hooks
    if (!Array.isArray(hooks)) continue
    for (const hook of hooks) {
      if (isCodexSessionDateCommand(String(asObject(hook).command ?? ""))) matches++
    }
  }
  if (matches > 1) {
    throw new Error("codex hooks.json has duplicate session-date.ts entries; remove duplicates manually so existing hook indices stay stable")
  }
  const next = groups.map(group => {
    const hooks = asObject(group).hooks
    if (!Array.isArray(hooks)) return group
    const idx = hooks.findIndex(hook => isCodexSessionDateCommand(String(asObject(hook).command ?? "")))
    if (idx === -1) return group
    return { ...asObject(group), hooks: hooks.map((hook, i) => (i === idx ? codexSessionDateHook : hook)) }
  })
  if (matches === 0) next.push(codexSessionDateGroup)
  return { ...installed, hooks: { ...existing, SessionStart: next } }
}

export function mergeAntigravityHooks(installed: Json): Json {
  return { ...installed, "session-date": antigravitySessionDateHook }
}

/** Existing T3 Antigravity per-instance config directories under ~/.t3/userdata/providers/antigravity. */
function t3AntigravityInstances(home: string): { name: string; hooksPath: string }[] {
  const root = join(home, ".t3/userdata/providers/antigravity")
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({ name: entry.name, dir: join(root, entry.name, "config") }))
    .filter(({ dir }) => existsSync(dir))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, dir }) => ({ name, hooksPath: join(dir, "hooks.json") }))
}

function links(repo: string, home: string, codexHome = join(home, ".codex")): Link[] {
  const antigravityHooksTarget = join(home, ".gemini/config/hooks.json")
  const t3Links = t3AntigravityInstances(home)
    // Link when absent or already a symlink; preserve regular instance-specific hooks.json by merging in place instead.
    .filter(({ hooksPath }) => !pathExists(hooksPath) || isLink(hooksPath))
    .map(({ hooksPath }) => ({ path: hooksPath, target: antigravityHooksTarget }))
  return [
    { path: join(home, ".claude/CLAUDE.md"), target: join(repo, "claude/CLAUDE.md") },
    { path: join(home, ".claude/agents"), target: join(repo, "claude/agents") },
    { path: join(home, ".agents/briefs"), target: join(repo, "briefs") },
    { path: join(home, ".cursor/rules/pstack-models.mdc"), target: join(repo, "external/pstack-models.mdc") },
    { path: join(home, ".agents/third-party-skills.md"), target: join(repo, "instructions/third-party-skills.md") },
    { path: join(home, ".claude/output-styles/q.md"), target: join(repo, "claude/output-styles/q.md") },
    ...hookFiles(repo).map(f => ({ path: join(home, ".claude/hooks", f), target: join(repo, "claude/hooks", f) })),
    { path: join(home, ".claude/skills/review-agent"), target: join(codexHome, "skills/.system/review-agent"), optional: true },
    ...t3Links,
  ]
}

function isLink(path: string) {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

function pathExists(path: string) {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

function linksTo(path: string, target: string) {
  return isLink(path) && resolve(dirname(path), readlinkSync(path)) === target
}

/** Parses a JSON object file. Errors name the file only: settings can hold secrets. */
function readJsonObject(path: string): Json {
  let value: unknown
  try {
    value = JSON.parse(readFileSync(path, "utf8"))
  } catch {
    throw new Error(`${path} is not valid JSON; fix it and rerun (contents not shown)`)
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must contain a JSON object`)
  return value as Json
}

function readFragment(repo: string): Json {
  const fragment = readJsonObject(join(repo, "claude/settings.fragment.json"))
  if ("env" in fragment) throw new Error("claude/settings.fragment.json must not contain env")
  // A hook registered under ~/.claude/hooks must be one the install links from claude/hooks.
  const linked = hookFiles(repo)
  for (const { event, command } of hookScripts(fragment, "$HOME")) {
    const file = ownHookFile(command)
    if (file && !linked.includes(file)) throw new Error(`claude/settings.fragment.json: ${event} hook ${file} has no claude/hooks/${file}`)
  }
  return fragment
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Json)[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

/** Fragment-owned top-level keys whose installed values differ from the merge. Installed-only keys, env, and other tools' hooks are not drift. */
export function settingsDrift(installed: Json, fragment: Json): string[] {
  const merged = mergeSettings(installed, fragment)
  return Object.keys(fragment).sort().filter(key => canonical(installed[key]) !== canonical(merged[key]))
}

/** The fragment replaces each top-level key it contains, except hooks, which merge per event; installed-only keys, including env, are kept. */
export function mergeSettings(installed: Json, fragment: Json): Json {
  if ("env" in fragment) throw new Error("claude/settings.fragment.json must not contain env")
  return { ...installed, ...fragment, ...("hooks" in fragment ? { hooks: mergeHooks(installed.hooks, fragment.hooks) } : {}) }
}

/** The ~/.claude/hooks file a hook command runs when it has this repo's form, `bun "$HOME/.claude/hooks/<file>"`. */
function ownHookFile(command: string): string | undefined {
  return /^bun\s+"\$HOME\/\.claude\/hooks\/([^/"]+)"$/.exec(command)?.[1]
}

/** An installed hook group without this repo's commands, or undefined when only ours were in it. Other shapes pass through. */
function withoutOwnHooks(group: unknown, managedFiles: Set<string>): unknown {
  const hooks = asObject(group).hooks
  if (!Array.isArray(hooks)) return group
  const foreign = hooks.filter(hook => {
    const command = String(asObject(hook).command ?? "")
    if (ownHookFile(command)) return false
    const alternate = ownHookFile(command.replace(/^bun\s+--no-env-file\s+/, "bun "))
    // Local hooks can share this directory; only normalize variants of managed scripts.
    return !alternate || !managedFiles.has(alternate)
  })
  if (foreign.length === hooks.length) return group
  return foreign.length ? { ...asObject(group), hooks: foreign } : undefined
}

/** Per event, the fragment's hook groups, then the hooks other tools installed; this repo's old hooks are dropped. */
function mergeHooks(installed: unknown, fragment: unknown): Json {
  const theirs = asObject(installed)
  const ours = asObject(fragment)
  const managedFiles = new Set(Object.values(ours).flatMap(groups =>
    [groups].flat().flatMap(group => {
      const hooks = asObject(group).hooks
      return (Array.isArray(hooks) ? hooks : []).flatMap(hook => {
        const file = ownHookFile(String(asObject(hook).command ?? ""))
        return file ? [file] : []
      })
    })))
  const merged: Json = {}
  for (const event of new Set([...Object.keys(theirs), ...Object.keys(ours)])) {
    const own = [ours[event] ?? []].flat()
    const kept = [theirs[event] ?? []].flat().map(group => withoutOwnHooks(group, managedFiles))
      .filter(group => group !== undefined && !own.some(g => canonical(g) === canonical(group)))
    if (own.length || kept.length) merged[event] = [...own, ...kept]
  }
  return merged
}

const asObject = (value: unknown): Json => (value && typeof value === "object" && !Array.isArray(value) ? value as Json : {})
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [])

/** Names what the merge changes: permission rules removed/added, hook events changed, other keys replaced. Never values. */
export function settingsChanges(installed: Json, fragment: Json): string[] {
  const merged = mergeSettings(installed, fragment)
  const lines: string[] = []
  for (const key of settingsDrift(installed, fragment)) {
    if (key === "permissions") {
      const before = asObject(installed[key])
      const after = asObject(fragment[key])
      for (const list of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
        if (canonical(before[list]) === canonical(after[list])) continue
        if (!Array.isArray(before[list] ?? []) || !Array.isArray(after[list] ?? [])) {
          lines.push(`settings: permissions.${list} replaced`)
          continue
        }
        const old = strings(before[list])
        const next = strings(after[list])
        const removed = old.filter(rule => !next.includes(rule))
        const added = next.filter(rule => !old.includes(rule))
        if (removed.length) lines.push(`settings: permissions.${list} removed: ${removed.join(", ")}`)
        if (added.length) lines.push(`settings: permissions.${list} added: ${added.join(", ")}`)
        if (!removed.length && !added.length) lines.push(`settings: permissions.${list} reordered`)
      }
    } else if (key === "hooks") {
      const before = asObject(installed[key])
      const after = asObject(merged[key])
      const events = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
        .filter(event => canonical(before[event]) !== canonical(after[event]))
      lines.push(`settings: hooks changed: ${events.join(", ")}`)
    } else lines.push(`settings: replaced ${key}`)
  }
  return lines
}

/** Hook commands in the fragment, each as event plus the script path it runs with `$HOME` expanded. */
function hookScripts(fragment: Json, home: string): { event: string; command: string; script?: string }[] {
  return Object.entries(asObject(fragment.hooks)).flatMap(([event, matchers]) =>
    (Array.isArray(matchers) ? matchers : []).flatMap(matcher => {
      const hooks = asObject(matcher).hooks
      return (Array.isArray(hooks) ? hooks : []).map(hook => {
        const command = String(asObject(hook).command ?? "")
        const script = /^bun\s+"([^"]+)"$/.exec(command)?.[1]?.replace(/^\$HOME(?=\/)/, home)
        return { event, command, script }
      })
    }))
}

/** Refuses linked worktrees: the install must point at a checkout that outlives task branches. */
function assertMainWorktree(repo: string) {
  const git = spawnSync("git", ["-C", repo, "rev-parse", "--path-format=absolute", "--git-common-dir", "--git-dir"], { encoding: "utf8" })
  const [common, gitDir] = git.status === 0 ? git.stdout.trim().split("\n") : []
  if (!common || common !== gitDir) {
    throw new Error(`--install must run from the main worktree of a git checkout, not a linked worktree or plain copy: ${repo}`)
  }
}

type PreparedJsonWrite = {
  path: string
  destination: string
  backupName: string
  hadFile: boolean
  installed: Json
  merged: Json
  summaryLines: string[]
  noteLabel: string
}

function prepareJsonWrite(path: string, backupName: string, noteLabel: string, merge: (installed: Json) => Json, summarize: (installed: Json) => string[] = () => []): PreparedJsonWrite {
  if (isLink(path) && !existsSync(path)) throw new Error(`${path} is a dangling symlink; fix or remove it, then rerun`)
  const destination = isLink(path) ? realpathSync(path) : path
  const hadFile = existsSync(path)
  const installed = hadFile ? readJsonObject(path) : {}
  return { path, destination, backupName, hadFile, installed, merged: merge(installed), summaryLines: summarize(installed), noteLabel }
}

export function install(repo: string, home: string, { codexHome = join(home, ".codex"), stamp = new Date().toISOString().replace(/[:.]/g, "-"), onLine }: InstallOptions = {}): string[] {
  const stale = checkArtifacts(repo)
  if (stale.length) throw new Error(`regenerate before installing:\n${stale.join("\n")}`)
  assertMainWorktree(repo)
  // Parse everything before any link changes so a bad file leaves the install untouched.
  const fragment = readFragment(repo)
  const t3RegularHooks = t3AntigravityInstances(home).filter(({ hooksPath }) => pathExists(hooksPath) && !isLink(hooksPath))
  const jsonWrites = [
    prepareJsonWrite(
      join(home, ".claude/settings.json"),
      "settings.json",
      "merged settings",
      installed => mergeSettings(installed, fragment),
      installed => settingsChanges(installed, fragment),
    ),
    prepareJsonWrite(join(codexHome, "hooks.json"), "codex-hooks.json", "merged codex hooks", mergeCodexHooks),
    prepareJsonWrite(join(home, ".gemini/config/hooks.json"), "antigravity-hooks.json", "merged antigravity hooks", mergeAntigravityHooks),
    ...t3RegularHooks.map(({ name, hooksPath }) =>
      prepareJsonWrite(hooksPath, `t3-antigravity-${name}-hooks.json`, "merged t3 antigravity hooks", mergeAntigravityHooks)),
  ]

  const backups = join(home, ".claude/backups")
  const backupPath = (name: string) => {
    mkdirSync(backups, { recursive: true, mode: 0o700 })
    return join(backups, `${name}.${stamp}`)
  }
  const log: string[] = []
  const note = (line: string) => {
    log.push(line)
    onLine?.(line)
  }
  for (const { path, target, optional } of links(repo, home, codexHome)) {
    if (optional && !existsSync(target)) {
      note(`warning: skipped ${path}; ${target} is missing`)
      continue
    }
    if (linksTo(path, target)) continue
    mkdirSync(dirname(path), { recursive: true })
    if (isLink(path)) {
      note(`replaced link: ${path} (was -> ${readlinkSync(path)})`)
      unlinkSync(path)
    } else if (pathExists(path)) {
      const backup = backupPath(basename(path))
      renameSync(path, backup)
      note(`backed up: ${path} -> ${backup}`)
    }
    symlinkSync(target, path)
    note(`linked: ${path} -> ${target}`)
  }

  for (const write of jsonWrites) {
    if (canonical(write.merged) === canonical(write.installed) && write.hadFile) continue
    mkdirSync(dirname(write.destination), { recursive: true })
    if (write.hadFile) {
      const backup = backupPath(write.backupName)
      copyFileSync(write.path, backup)
      chmodSync(backup, 0o600)
      note(`backed up: ${write.path} -> ${backup}`)
    }
    for (const line of write.summaryLines) note(line)
    const temp = `${write.destination}.tmp-${process.pid}`
    writeFileSync(temp, JSON.stringify(write.merged, null, 2) + "\n", { mode: 0o600 })
    chmodSync(temp, 0o600)
    renameSync(temp, write.destination)
    note(`${write.noteLabel}: ${write.path}`)
  }
  return log
}

export function checkInstalled(repo: string, home: string, { codexHome = join(home, ".codex") }: InstallOptions = {}): { problems: string[]; warnings: string[] } {
  const problems: string[] = []
  const warnings: string[] = []
  for (const { path, target, optional } of links(repo, home, codexHome)) {
    if (optional && !existsSync(target)) warnings.push(`warning: ${target} is missing; ${path} not checked`)
    else if (!linksTo(path, target)) problems.push(`link: ${path} should point to ${target}`)
  }

  const fragment = readFragment(repo)
  for (const { event, command, script } of hookScripts(fragment, home)) {
    if (!script) problems.push(`hook: ${event} command is not \`bun "<script>"\`: ${command}`)
    else if (!existsSync(script)) problems.push(`hook: ${event} script is missing: ${script}`)
  }

  const settingsPath = join(home, ".claude/settings.json")
  if (!existsSync(settingsPath)) problems.push(`settings: ${settingsPath} is missing`)
  else {
    for (const key of settingsDrift(readJsonObject(settingsPath), fragment)) {
      problems.push(`settings: key differs from claude/settings.fragment.json: ${key}`)
    }
  }

  const codexHooksPath = join(codexHome, "hooks.json")
  if (!existsSync(codexHooksPath)) problems.push(`codex hooks: ${codexHooksPath} is missing`)
  else {
    const installed = readJsonObject(codexHooksPath)
    if (canonical(installed) !== canonical(mergeCodexHooks(installed))) {
      problems.push(`codex hooks: ${codexHooksPath} differs from managed SessionStart hook`)
    }
  }

  const antigravityHooksPath = join(home, ".gemini/config/hooks.json")
  if (!existsSync(antigravityHooksPath)) problems.push(`antigravity hooks: ${antigravityHooksPath} is missing`)
  else {
    const installed = readJsonObject(antigravityHooksPath)
    if (canonical(installed) !== canonical(mergeAntigravityHooks(installed))) {
      problems.push(`antigravity hooks: ${antigravityHooksPath} differs from managed session-date hook`)
    }
  }

  for (const { hooksPath } of t3AntigravityInstances(home)) {
    if (!pathExists(hooksPath) || isLink(hooksPath)) continue
    const installed = readJsonObject(hooksPath)
    if (canonical(installed) !== canonical(mergeAntigravityHooks(installed))) {
      problems.push(`antigravity hooks: ${hooksPath} differs from managed session-date hook`)
    }
  }

  {
    // Each repo skill installs through `npx skills add` for both hosts: one copy in ~/.agents/skills, linked from ~/.claude/skills.
    const lock = readLock(resolvePaths(home).lockPath).skills ?? {}
    const repoSkills = readdirSync(join(repo, "skills")).filter(name => existsSync(join(repo, "skills", name, "SKILL.md")))
    const lockSkills = Object.keys(lock).filter(name => lock[name]?.source === skillsLockSource)
    for (const name of [...new Set([...repoSkills, ...lockSkills])].sort()) {
      if (!repoSkills.includes(name)) { problems.push(`skill: ~/.agents/skills/${name} is installed from ${skillsLockSource}, but skills/${name} is gone; run npx skills remove -g ${name}`); continue }
      if (!lockSkills.includes(name)) { problems.push(`skill: ${name} is not installed from ${skillsLockSource}; add it to the README install command's --skill list and rerun that command`); continue }
      const diff = spawnSync("diff", ["-rq", join(home, ".agents/skills", name), join(repo, "skills", name)], { stdio: "ignore" })
      if (diff.status === 1) problems.push(`skill: ~/.agents/skills/${name} differs from skills/${name}`)
      else if (diff.status !== 0) problems.push(`skill: could not compare ~/.agents/skills/${name} with skills/${name}`)
      if (claudeSkillState(home, name) !== "linked") problems.push(`skill: ~/.claude/skills/${name} should link to ~/.agents/skills/${name}`)
    }
  }
  return { problems, warnings }
}

function main(argv: string[]) {
  const repo = resolve(import.meta.dir, "..")
  const homeAt = argv.indexOf("--home")
  const mode = argv.find(arg => arg.startsWith("--") && arg !== "--home")
  const known = [undefined, "--check", "--install", "--check-installed"]
  if (!known.includes(mode) || (homeAt >= 0 && !["--install", "--check-installed"].includes(mode ?? "")) || (homeAt >= 0 && !argv[homeAt + 1])) {
    console.error("usage: bun scripts/generate-hosts.ts [--check | --install [--home DIR] | --check-installed [--home DIR]]")
    return 2
  }
  const needsHome = mode === "--install" || mode === "--check-installed"
  const homeArg = homeAt >= 0 ? argv[homeAt + 1] : process.env.HOME
  if (needsHome && !homeArg) {
    console.error("HOME is empty or unset; pass --home DIR")
    return 2
  }
  const home = resolve(homeArg ?? "")
  const options = { codexHome: process.env.CODEX_HOME ? resolve(process.env.CODEX_HOME) : join(home, ".codex") }
  if (mode === "--check") {
    const problems = checkArtifacts(repo)
    if (problems.length) {
      console.error(`host artifacts are out of date; run bun scripts/generate-hosts.ts\n${problems.join("\n")}`)
      return 1
    }
    console.log("host artifacts are current")
  } else if (mode === "--install") {
    install(repo, home, { ...options, onLine: line => console.log(line) })
    console.log("install complete")
  } else if (mode === "--check-installed") {
    const { problems, warnings } = checkInstalled(repo, home, options)
    for (const line of warnings) console.error(line)
    if (problems.length) {
      console.error(`installed Claude surface differs from this checkout\n${problems.join("\n")}`)
      return 1
    }
    console.log("installed Claude surface matches")
  } else {
    const changed = writeArtifacts(repo)
    for (const line of changed) console.log(line)
    console.log(changed.length ? "host artifacts regenerated" : "host artifacts already current")
  }
  return 0
}

if (import.meta.main) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
