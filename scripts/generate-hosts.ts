#!/usr/bin/env bun
// Builds the Codex and Claude Code instruction surfaces from one source:
//   bun scripts/generate-hosts.ts                      write AGENTS.md and claude/ artifacts
//   bun scripts/generate-hosts.ts --check              fail when an artifact is stale or missing
//   bun scripts/generate-hosts.ts --install [--home D] link artifacts into D/.claude, merge settings
//   bun scripts/generate-hosts.ts --check-installed [--home D]  verify the live install, read-only
import { spawnSync } from "node:child_process"
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { roles as claudeRoles, toolNotes, type ClaudeRole } from "../claude/roles.ts"

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

export function renderAgents(profiles: { filename: string; contents: string }[], roles: Record<string, ClaudeRole>): Map<string, string> {
  const agents = new Map<string, string>()
  for (const { filename, contents } of profiles) {
    const a = Bun.TOML.parse(contents) as Record<string, string>
    const role = roles[a.name!]
    if (!role) throw new Error(`agents/${filename}: no Claude role for ${a.name} in claude/roles.ts`)
    const fm = [
      "---",
      `name: ${a.name}`,
      `description: ${JSON.stringify(a.description)}`,
      `model: ${role.model}`,
      `effort: ${role.effort}`,
      `disallowedTools: ${role.disallowedTools}`,
      `color: ${role.color}`,
      ...(role.skills.length ? ["skills:", ...role.skills.map(skill => `  - ${skill}`)] : []),
      "---",
      "",
    ]
    const instructions = a.developer_instructions!.trim()
    const notes = role.toolNotes.map(tool => `\n\n${toolNotes[tool]}`).join("")
    agents.set(a.name!, fm.join("\n") + instructions + notes + "\n")
  }
  const orphans = Object.keys(roles).filter(name => !agents.has(name))
  if (orphans.length) throw new Error(`claude/roles.ts: no agents/*.toml for ${orphans.join(", ")}`)
  return agents
}

/** Every generated artifact, keyed by repo-relative path. */
export function buildArtifacts(repo: string, roles = claudeRoles): Map<string, string> {
  const dir = join(repo, "instructions")
  const readInclude = (name: string) => readFileSync(join(dir, name), "utf8")
  const global = readFileSync(join(dir, "global.md"), "utf8")
  const profiles = readdirSync(join(repo, "agents")).filter(f => f.endsWith(".toml")).sort()
    .map(filename => ({ filename, contents: readFileSync(join(repo, "agents", filename), "utf8") }))
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
  for (const [name, content] of renderAgents(profiles, roles)) artifacts.set(`claude/agents/${name}.md`, content)
  return artifacts
}

/** Entries in generator-owned directories that no artifact accounts for; directories end in "/". */
function strays(repo: string, artifacts: Map<string, string>): string[] {
  return ["claude/agents", "claude/output-styles"].flatMap(dir => {
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

function links(repo: string, home: string, codexHome = join(home, ".codex")): Link[] {
  return [
    { path: join(home, ".claude/CLAUDE.md"), target: join(repo, "claude/CLAUDE.md") },
    { path: join(home, ".claude/agents"), target: join(repo, "claude/agents") },
    { path: join(home, ".claude/output-styles/q.md"), target: join(repo, "claude/output-styles/q.md") },
    { path: join(home, ".claude/hooks/reply-guard.ts"), target: join(repo, "claude/hooks/reply-guard.ts") },
    { path: join(home, ".claude/skills/review-agent"), target: join(codexHome, "skills/.system/review-agent"), optional: true },
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
  return fragment
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Json)[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

/** Fragment-owned top-level keys whose installed values differ. Installed-only keys and env are not drift. */
export function settingsDrift(installed: Json, fragment: Json): string[] {
  return Object.keys(fragment).sort().filter(key => canonical(installed[key]) !== canonical(fragment[key]))
}

/** The fragment replaces each top-level key it contains, wholesale; installed-only keys, including env, are kept. */
export function mergeSettings(installed: Json, fragment: Json): Json {
  if ("env" in fragment) throw new Error("claude/settings.fragment.json must not contain env")
  return { ...installed, ...fragment }
}

const asObject = (value: unknown): Json => (value && typeof value === "object" && !Array.isArray(value) ? value as Json : {})
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [])

/** Names what the merge changes: permission rules removed/added, hook events changed, other keys replaced. Never values. */
export function settingsChanges(installed: Json, fragment: Json): string[] {
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
      const after = asObject(fragment[key])
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

export function install(repo: string, home: string, { codexHome, stamp = new Date().toISOString().replace(/[:.]/g, "-"), onLine }: InstallOptions = {}): string[] {
  const stale = checkArtifacts(repo)
  if (stale.length) throw new Error(`regenerate before installing:\n${stale.join("\n")}`)
  assertMainWorktree(repo)
  // Parse everything before any link changes so a bad file leaves the install untouched.
  const settingsPath = join(home, ".claude/settings.json")
  if (isLink(settingsPath) && !existsSync(settingsPath)) throw new Error(`${settingsPath} is a dangling symlink; fix or remove it, then rerun`)
  // Write through a symlinked settings.json so a dotfiles link survives.
  const destination = isLink(settingsPath) ? realpathSync(settingsPath) : settingsPath
  const hadSettings = existsSync(settingsPath)
  const installed = hadSettings ? readJsonObject(settingsPath) : {}
  const fragment = readFragment(repo)
  const merged = mergeSettings(installed, fragment)

  const backups = join(home, ".claude/backups")
  const backupPath = (path: string) => {
    mkdirSync(backups, { recursive: true, mode: 0o700 })
    return join(backups, `${basename(path)}.${stamp}`)
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
      const backup = backupPath(path)
      renameSync(path, backup)
      note(`backed up: ${path} -> ${backup}`)
    }
    symlinkSync(target, path)
    note(`linked: ${path} -> ${target}`)
  }

  if (canonical(merged) !== canonical(installed) || !hadSettings) {
    if (hadSettings) {
      const backup = backupPath(settingsPath)
      copyFileSync(settingsPath, backup)
      chmodSync(backup, 0o600)
      note(`backed up: ${settingsPath} -> ${backup}`)
    }
    for (const line of settingsChanges(installed, fragment)) note(line)
    const temp = `${destination}.tmp-${process.pid}`
    writeFileSync(temp, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600 })
    chmodSync(temp, 0o600)
    renameSync(temp, destination)
    note(`merged settings: ${settingsPath}`)
  }
  return log
}

export function checkInstalled(repo: string, home: string, { codexHome }: InstallOptions = {}): { problems: string[]; warnings: string[] } {
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

  const lockPath = join(home, ".agents/.skill-lock.json")
  if (existsSync(lockPath)) {
    const lock = readJsonObject(lockPath) as { skills?: Record<string, { source?: string }> }
    for (const [name, entry] of Object.entries(lock.skills ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      if (entry.source !== skillsLockSource) continue
      const diff = spawnSync("diff", ["-rq", join(home, ".agents/skills", name), join(repo, "skills", name)], { stdio: "ignore" })
      if (diff.status === 1) problems.push(`skill: ~/.agents/skills/${name} differs from skills/${name}`)
      else if (diff.status !== 0) problems.push(`skill: could not compare ~/.agents/skills/${name} with skills/${name}`)
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
