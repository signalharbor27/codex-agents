import { describe, expect, test } from "bun:test"
import { cpSync, existsSync, symlinkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildArtifacts, delegateModes, hookFiles, renderPstackModels, mergeSettings, renderBriefs, renderClaudeAgents, renderCodexProfiles, renderInstructions, renderRoleTable, settingsChanges, settingsDrift, skillsLockSource } from "./generate-hosts.ts"
import { roles as registry, toolNotes, type Role } from "../roles/roles.ts"

const repoRoot = join(import.meta.dir, "..")
const includes: Record<string, string> = { "style.md": "<!-- style note -->\n- short replies\n", "nested.md": "<!-- include:style.md -->\n" }
const render = (source: string, host: "codex" | "claude") => renderInstructions(source, host, name => includes[name]!)

describe("instruction rendering", () => {
  const source = [
    "# Title",
    "<!-- host:codex -->",
    "codex only",
    "<!-- host:claude -->",
    "claude only",
    "<!-- /host -->",
    "",
    "",
    "",
    "<!-- host:claude -->",
    "claude tail",
    "<!-- /host -->",
    "shared <!-- inline comment --> text",
    "<!--",
    "multi-line comment",
    "-->",
    "<!-- include:nested.md -->",
  ].join("\n")

  test("keeps shared and matching host lines, resolves includes, strips comments", () => {
    expect(render(source, "codex")).toBe("# Title\ncodex only\n\nshared  text\n\n- short replies\n")
    expect(render(source, "claude")).toBe("# Title\nclaude only\n\nclaude tail\nshared  text\n\n- short replies\n")
  })

  test("rejects malformed host blocks and include cycles", () => {
    expect(() => render("<!-- host:codex -->\nx", "codex")).toThrow("unclosed host block")
    expect(() => render("<!-- /host -->", "codex")).toThrow("without an open host block")
    expect(() => render("<!-- host:gemini -->\n<!-- /host -->", "codex")).toThrow("unknown host block")
    expect(() => renderInstructions("<!-- include:a.md -->", "codex", () => "<!-- include:a.md -->")).toThrow("include cycle")
  })
})

describe("role rendering", () => {
  const role: Role = {
    description: 'Use "quoted" text',
    seats: [{ provider: "claude", model: "opus", effort: "medium" }, { provider: "codex", model: "sol", effort: "high" }],
    authority: "read-only",
    skills: ["review-agent"],
    toolNotes: ["grep_app"],
    color: "red",
  }
  const instructions = new Map([["a", "Use grep_app.\n"]])

  test("renders a Claude agent for the Claude seat with preloaded skills and tool notes", () => {
    const agent = renderClaudeAgents({ a: role }, instructions).get("a")!
    expect(agent).toStartWith('---\nname: a\ndescription: "Use \\"quoted\\" text"\nmodel: opus\neffort: medium\ndisallowedTools: Edit, Write, NotebookEdit, Agent\ncolor: red\nskills:\n  - review-agent\n---\nUse grep_app.\n\ngrep_app search ignores case')
    expect(renderClaudeAgents({ a: { ...role, authority: "write", skills: [], toolNotes: [] } }, instructions).get("a")).toEndWith("disallowedTools: Agent\ncolor: red\n---\nUse grep_app.\n")
  })

  test("renders a Codex profile for the Codex seat that names its skills", () => {
    const profile = Bun.TOML.parse(renderCodexProfiles({ a: role }, instructions).get("a")!) as Record<string, string>
    expect(profile).toEqual({
      name: "a",
      description: 'Use "quoted" text',
      model: "sol",
      model_reasoning_effort: "high",
      sandbox_mode: "read-only",
      developer_instructions: `Use grep_app.\n\nLoad these skills before work: \`review-agent\`.\n\n${toolNotes.grep_app}\n`,
    })
    expect(renderCodexProfiles({ a: { ...role, seats: [role.seats[0]!] } }, instructions).size).toBe(0)
    const verbatim = 'Keep \\q, \\n, \\u1234, and "quotes" verbatim.\n'
    const parsed = Bun.TOML.parse(renderCodexProfiles({ a: { ...role, skills: [], toolNotes: [] } }, new Map([["a", verbatim]])).get("a")!) as Record<string, string>
    expect(parsed.developer_instructions).toBe(verbatim)
  })

  test("briefs name a delegate_task target per seat and never ask Q to approve", () => {
    const brief = renderBriefs({ a: role }, instructions).get("a")!
    expect(brief).toContain('`{"providerInstanceId":"claudeAgent","model":"opus","options":{"effort":"medium"}}`')
    expect(brief).toContain('`{"providerInstanceId":"codex","model":"sol","options":{"reasoningEffort":"high"}}`')
    expect(brief).toContain('`runtimeMode: "full-access"` and `interactionMode: "plan"`')
    expect(brief).toEndWith(`---\n\nYou are the \`a\` subagent. Use "quoted" text\n\nUse grep_app.\n\nLoad these skills before work: \`review-agent\`.\n\n${toolNotes.grep_app}\n`)
    expect(renderRoleTable({ a: role })).toBe("- `a` (read-only): opus at medium + sol at high. Brief: `~/.agents/briefs/a.md`.\n")
  })

  test("every registry role runs delegated children with full access, and read-only roles in plan mode", () => {
    const artifacts = buildArtifacts(repoRoot)
    for (const [name, r] of Object.entries(registry)) {
      const interactionMode = r.authority === "read-only" ? "plan" : "default"
      expect(delegateModes(r), name).toEqual({ runtimeMode: "full-access", interactionMode })
      const brief = artifacts.get(`briefs/${name}.md`)!
      expect(brief, name).toContain(`\`runtimeMode: "full-access"\` and \`interactionMode: "${interactionMode}"\``)
      for (const mode of ["approval-required", "auto-accept-edits"]) expect(brief, name).not.toContain(mode)
    }
  })

  test("fails on a role without instructions, instructions without a role, and two seats on one provider", () => {
    expect(() => renderBriefs({ a: role, b: role }, instructions)).toThrow("no roles/b.md for b")
    expect(() => renderBriefs({}, instructions)).toThrow("no role in roles/roles.ts for a.md")
    expect(() => renderBriefs({ a: { ...role, seats: [role.seats[1]!, role.seats[1]!] } }, instructions)).toThrow("a has two codex seats")
    expect(() => renderBriefs({ a: role }, new Map([["a", "say '''"]]))).toThrow("must not contain '''")
  })

  test("pstack model lines name each mapped seat as <model>-<effort>", () => {
    const rule = renderPstackModels(registry)
    expect(rule).toStartWith("---\ndescription: pstack per-role model choices (overrides skill defaults)\nalwaysApply: true\n---\n")
    expect(rule).toContain("\narena runners: claude-opus-5-5-high, gpt-6-astra-high\n")
    expect(rule).toContain("\ninterrogate reviewers: gpt-6.1-sol-high, claude-opus-5-5-medium\n")
    expect(rule).toContain("\nfeature, refactoring: claude-opus-5-5-medium\n")
  })

  test("the checked-in role table includes every registry role", () => {
    for (const path of ["AGENTS.md", "claude/CLAUDE.md"]) {
      const checkedIn = readFileSync(join(repoRoot, path), "utf8")
      for (const line of renderRoleTable(registry).trimEnd().split("\n")) expect(checkedIn, path).toContain(`${line}\n`)
    }
  })
})

describe("settings merge", () => {
  // Policy: the fragment owns each top-level key it contains, wholesale. Installed-only keys, env included, are kept and are not drift.
  const installed = { env: { TOKEN: "x" }, theme: "light", mine: 1, permissions: { allow: ["A"], deny: ["SendMessage", "Keep"] } }
  const fragment = { theme: "dark", permissions: { allow: ["A"], deny: ["Keep", "New"] }, hooks: { Stop: [1], UserPromptSubmit: [2] } }

  test("replaces owned keys wholesale and keeps installed-only keys", () => {
    const merged = mergeSettings(installed, fragment)
    expect(merged).toEqual({ env: { TOKEN: "x" }, mine: 1, ...fragment })
    expect(settingsDrift({ ...merged, hooks: { UserPromptSubmit: [2], Stop: [1] } }, fragment)).toEqual([])
    expect(settingsDrift(installed, fragment)).toEqual(["hooks", "permissions", "theme"])
    expect(() => mergeSettings(installed, { env: {} })).toThrow("must not contain env")
  })

  test("summarizes changes by rule and event name only", () => {
    expect(settingsChanges({ ...installed, hooks: { Stop: [1], Old: [3] } }, fragment)).toEqual([
      "settings: hooks changed: Old, UserPromptSubmit",
      "settings: permissions.deny removed: SendMessage",
      "settings: permissions.deny added: New",
      "settings: replaced theme",
    ])
  })
})

function copyRepo() {
  const root = mkdtempSync(join(tmpdir(), "generate-hosts-"))
  const repo = join(root, "repo")
  for (const path of ["scripts/generate-hosts.ts", "scripts/external-skills.ts", "roles", "claude/settings.fragment.json", "claude/hooks", "instructions"]) {
    cpSync(join(repoRoot, path), join(repo, path), { recursive: true })
  }
  git(repo, "init", "-q")
  return { root, repo }
}

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync({ cmd: ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], cwd, stdout: "pipe", stderr: "pipe" })
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`)
}

// HOME points into the temp root so a missing --home can never reach the real home.
async function run(repo: string, ...args: string[]) {
  return runWith(repo, { HOME: join(repo, "..") }, ...args)
}

async function runWith(repo: string, envOverrides: Record<string, string | undefined>, ...args: string[]) {
  const env = { ...process.env, CODEX_HOME: undefined, ...envOverrides }
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key]
  const child = Bun.spawn({ cmd: ["bun", join(repo, "scripts/generate-hosts.ts"), ...args], env, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { stdout, stderr, exitCode }
}

const withRepo = (body: (paths: { root: string; repo: string; home: string }) => Promise<void>) => async () => {
  const { root, repo } = copyRepo()
  try {
    await body({ root, repo, home: join(root, "home") })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe("generator subprocess", () => {
  test("--check passes after generate and names hand-edited, missing, and unexpected artifacts", withRepo(async ({ repo }) => {
    expect((await run(repo, "--check")).exitCode).toBe(1)
    expect((await run(repo)).exitCode).toBe(0)
    expect(await run(repo, "--check")).toMatchObject({ exitCode: 0, stdout: "host artifacts are current\n" })
    const agents = readdirSync(join(repo, "claude/agents"))
    for (const path of ["AGENTS.md", "claude/CLAUDE.md", "claude/output-styles/q.md", `claude/agents/${agents[0]}`, "agents/reviewer.toml", "briefs/reviewer.md"]) {
      const file = join(repo, path)
      const original = readFileSync(file, "utf8")
      writeFileSync(file, original + "hand edit\n")
      const result = await run(repo, "--check")
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain(`stale: ${path}`)
      writeFileSync(file, original)
    }
    rmSync(join(repo, "claude/CLAUDE.md"))
    writeFileSync(join(repo, "claude/agents/extra.md"), "x")
    writeFileSync(join(repo, "claude/output-styles/old.md"), "x")
    writeFileSync(join(repo, "agents/retired.toml"), "x")
    writeFileSync(join(repo, "briefs/retired.md"), "x")
    mkdirSync(join(repo, "claude/agents/nested"))
    const result = await run(repo, "--check")
    expect(result.stderr).toContain("missing: claude/CLAUDE.md")
    expect(result.stderr).toContain("unexpected: claude/agents/extra.md")
    expect(result.stderr).toContain("unexpected: claude/output-styles/old.md")
    expect(result.stderr).toContain("unexpected: agents/retired.toml")
    expect(result.stderr).toContain("unexpected: briefs/retired.md")
    expect(result.stderr).toContain("unexpected: claude/agents/nested/")
    const regenerated = await run(repo)
    expect(regenerated.exitCode).toBe(0)
    expect(regenerated.stdout).toContain("unexpected directory left in place; remove it by hand: claude/agents/nested/")
    for (const path of ["claude/agents/extra.md", "claude/output-styles/old.md", "agents/retired.toml", "briefs/retired.md"]) {
      expect(regenerated.stdout).toContain(`removed: ${path}`)
      expect(existsSync(join(repo, path)), path).toBe(false)
    }
    rmSync(join(repo, "claude/agents/nested"), { recursive: true })
    expect((await run(repo, "--check")).exitCode).toBe(0)
  }))

  test("--install links, backs up, and merges owned keys; --check-installed verifies without printing values", withRepo(async ({ root, repo, home }) => {
    const secret = "sekrit-token-value"
    expect((await run(repo)).exitCode).toBe(0)
    mkdirSync(join(home, ".claude/agents"), { recursive: true })
    mkdirSync(join(home, ".claude/output-styles"), { recursive: true })
    writeFileSync(join(home, ".claude/agents/old.md"), "old agent")
    mkdirSync(join(home, ".claude/hooks"), { recursive: true })
    writeFileSync(join(home, ".claude/hooks/mine.sh"), "keep")
    writeFileSync(join(home, ".claude/CLAUDE.md"), "old instructions")
    symlinkSync(join(root, "elsewhere.md"), join(home, ".claude/output-styles/q.md"))
    const fragment = JSON.parse(readFileSync(join(repo, "claude/settings.fragment.json"), "utf8"))
    writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({
      env: { TOKEN: secret },
      theme: "light",
      mine: true,
      permissions: { deny: ["SendMessage", ...fragment.permissions.deny.slice(1)] },
    }), { mode: 0o644 })
    mkdirSync(join(home, ".codex/skills/.system/review-agent"), { recursive: true })
    for (const [name, body] of [["same", "same"], ["drifted", "installed"]]) {
      mkdirSync(join(home, ".agents/skills", name!), { recursive: true })
      mkdirSync(join(repo, "skills", name!), { recursive: true })
      writeFileSync(join(home, ".agents/skills", name!, "SKILL.md"), body!)
      writeFileSync(join(repo, "skills", name!, "SKILL.md"), "same")
    }
    writeFileSync(join(home, ".agents/.skill-lock.json"), JSON.stringify({ skills: {
      same: { source: skillsLockSource },
      drifted: { source: skillsLockSource },
      other: { source: "someone/else" },
    } }))

    const installed = await run(repo, "--install", "--home", home)
    expect(installed.exitCode).toBe(0)
    for (const [link, target] of [
      [".claude/CLAUDE.md", join(repo, "claude/CLAUDE.md")],
      [".claude/agents", join(repo, "claude/agents")],
      [".agents/briefs", join(repo, "briefs")],
      [".cursor/rules/pstack-models.mdc", join(repo, "external/pstack-models.mdc")],
      [".claude/output-styles/q.md", join(repo, "claude/output-styles/q.md")],
      ...hookFiles(repo).map(f => [`.claude/hooks/${f}`, join(repo, "claude/hooks", f)]),
      [".claude/skills/review-agent", join(home, ".codex/skills/.system/review-agent")],
    ]) {
      expect(lstatSync(join(home, link!)).isSymbolicLink()).toBe(true)
      expect(readlinkSync(join(home, link!))).toBe(target!)
    }
    expect(installed.stdout).toContain(`replaced link: ${join(home, ".claude/output-styles/q.md")} (was -> ${join(root, "elsewhere.md")})`)
    expect(installed.stdout).toContain(`settings: permissions.deny removed: SendMessage\nsettings: permissions.deny added: ${fragment.permissions.deny[0]}\n`)
    expect(installed.stdout).toContain("settings: permissions.allow added: ")
    expect(installed.stdout).toContain("settings: hooks changed: PreToolUse, Stop, UserPromptSubmit\n")
    // Hooks and their shared module are linked, test files are not, and unrelated hooks stay.
    expect(readdirSync(join(home, ".claude/hooks")).sort()).toEqual(["destructive-guard.ts", "mine.sh", "reply-guard.ts", "review-gate.ts", "shell.ts"])
    expect(installed.stdout).toContain("settings: replaced theme\n")
    expect(installed.stdout).not.toContain("replaced mine")
    const backupDir = join(home, ".claude/backups")
    const backups = readdirSync(backupDir).sort()
    expect(backups.map(name => name.replace(/\.\d{4}-\d{2}-\d{2}T[^.]*$/, ""))).toEqual(["CLAUDE.md", "agents", "settings.json"])
    expect(readdirSync(join(home, ".claude")).filter(name => name.includes("backup-"))).toEqual([])
    expect(readFileSync(join(backupDir, backups[1]!, "old.md"), "utf8")).toBe("old agent")
    const settingsPath = join(home, ".claude/settings.json")
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"))
    expect(settings).toEqual({ ...fragment, env: { TOKEN: secret }, mine: true })
    expect(settings.permissions.deny).not.toContain("SendMessage")
    expect(statSync(settingsPath).mode & 0o777).toBe(0o600)
    expect(statSync(join(backupDir, backups[2]!)).mode & 0o777).toBe(0o600)

    // Installed-only keys such as `mine` are not drift; fragment-owned keys are.
    const check = await run(repo, "--check-installed", "--home", home)
    expect(check.exitCode).toBe(1)
    expect(check.stderr).toContain("skill: ~/.agents/skills/drifted differs from skills/drifted")
    expect(check.stderr).not.toContain("settings:")
    expect(check.stderr).not.toContain("skills/same")
    expect(check.stderr).not.toContain("other")

    writeFileSync(join(home, ".agents/skills/drifted/SKILL.md"), "same")
    expect(await run(repo, "--check-installed", "--home", home)).toMatchObject({ exitCode: 0, stdout: "installed Claude surface matches\n" })
    writeFileSync(settingsPath, JSON.stringify({ ...settings, theme: "light" }))
    expect((await run(repo, "--check-installed", "--home", home)).stderr).toContain("settings: key differs from claude/settings.fragment.json: theme")
    writeFileSync(settingsPath, JSON.stringify(settings))
    const rerun = await run(repo, "--install", "--home", home)
    expect(rerun.stdout).toBe("install complete\n")

    rmSync(join(home, ".claude/hooks/reply-guard.ts"))
    rmSync(join(home, ".claude/hooks/destructive-guard.ts"))
    const noHook = await run(repo, "--check-installed", "--home", home)
    expect(noHook.stderr).toContain(`link: ${join(home, ".claude/hooks/reply-guard.ts")} should point to`)
    expect(noHook.stderr).toContain(`hook: Stop script is missing: ${join(home, ".claude/hooks/reply-guard.ts")}`)
    expect(noHook.stderr).toContain(`hook: PreToolUse script is missing: ${join(home, ".claude/hooks/destructive-guard.ts")}`)
    for (const output of [installed, check, rerun, noHook]) expect(output.stdout + output.stderr).not.toContain(secret)
  }))

  test("--install skips a missing review-agent source with a warning and refuses stale artifacts", withRepo(async ({ repo, home }) => {
    const stale = await run(repo, "--install", "--home", home)
    expect(stale.exitCode).toBe(1)
    expect(stale.stderr).toContain("regenerate before installing")
    expect(existsSync(home)).toBe(false)
    await run(repo)
    const result = await run(repo, "--install", "--home", home)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("warning: skipped")
    expect(existsSync(join(home, ".claude/skills/review-agent"))).toBe(false)
    expect(JSON.parse(readFileSync(join(home, ".claude/settings.json"), "utf8"))).not.toHaveProperty("env")
  }))

  test("--install reads the review-agent source from CODEX_HOME", withRepo(async ({ root, repo, home }) => {
    await run(repo)
    const codexHome = join(root, "codex")
    mkdirSync(join(codexHome, "skills/.system/review-agent"), { recursive: true })
    expect((await runWith(repo, { HOME: root, CODEX_HOME: codexHome }, "--install", "--home", home)).exitCode).toBe(0)
    expect(readlinkSync(join(home, ".claude/skills/review-agent"))).toBe(join(codexHome, "skills/.system/review-agent"))
  }))

  test("--install prints each step before a later failure", withRepo(async ({ root, repo, home }) => {
    await run(repo)
    mkdirSync(join(home, ".claude/output-styles"), { recursive: true })
    symlinkSync("/old/target", join(home, ".claude/CLAUDE.md"))
    writeFileSync(join(home, ".claude/output-styles/q.md"), "mine\n")
    const { chmodSync } = await import("node:fs")
    chmodSync(join(home, ".claude/output-styles"), 0o555)
    try {
      const result = await run(repo, "--install", "--home", home)
      expect(result.exitCode).not.toBe(0)
      expect(result.stdout).toContain("(was -> /old/target)")
    } finally {
      chmodSync(join(home, ".claude/output-styles"), 0o755)
    }
  }))

  test("--install writes through a symlinked settings.json", withRepo(async ({ root, repo, home }) => {
    await run(repo)
    const dots = join(root, "dots/settings.json")
    mkdirSync(join(root, "dots"), { recursive: true })
    mkdirSync(join(home, ".claude"), { recursive: true })
    writeFileSync(dots, JSON.stringify({ env: { KEEP: "1" } }))
    symlinkSync(dots, join(home, ".claude/settings.json"))
    expect((await run(repo, "--install", "--home", home)).exitCode).toBe(0)
    expect(lstatSync(join(home, ".claude/settings.json")).isSymbolicLink()).toBe(true)
    const written = JSON.parse(readFileSync(dots, "utf8"))
    expect(written.env).toEqual({ KEEP: "1" })
    expect(written.outputStyle).toBe("Q")
  }))

  test("--install refuses a dangling settings.json symlink before touching links", withRepo(async ({ repo, home }) => {
    await run(repo)
    mkdirSync(join(home, ".claude"), { recursive: true })
    symlinkSync(join(home, "missing.json"), join(home, ".claude/settings.json"))
    const result = await run(repo, "--install", "--home", home)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("dangling symlink")
    expect(existsSync(join(home, ".claude/CLAUDE.md"))).toBe(false)
  }))

  test("--install validates settings and the fragment before touching any link", withRepo(async ({ repo, home }) => {
    await run(repo)
    mkdirSync(join(home, ".claude"), { recursive: true })
    writeFileSync(join(home, ".claude/CLAUDE.md"), "old instructions")
    writeFileSync(join(home, ".claude/settings.json"), '{"env":{"X":sekrit')
    const bad = await run(repo, "--install", "--home", home)
    expect(bad.exitCode).toBe(1)
    expect(bad.stderr).toContain("settings.json is not valid JSON")
    expect(bad.stdout + bad.stderr).not.toContain("sekrit")
    expect(lstatSync(join(home, ".claude/CLAUDE.md")).isSymbolicLink()).toBe(false)
    expect(readdirSync(join(home, ".claude")).sort()).toEqual(["CLAUDE.md", "settings.json"])

    writeFileSync(join(home, ".claude/settings.json"), "{}")
    const fragmentPath = join(repo, "claude/settings.fragment.json")
    writeFileSync(fragmentPath, JSON.stringify({ ...JSON.parse(readFileSync(fragmentPath, "utf8")), env: { A: "b" } }))
    const withEnv = await run(repo, "--install", "--home", home)
    expect(withEnv.exitCode).toBe(1)
    expect(withEnv.stderr).toContain("must not contain env")
    expect(readdirSync(join(home, ".claude")).sort()).toEqual(["CLAUDE.md", "settings.json"])

    const fragment = JSON.parse(readFileSync(fragmentPath, "utf8"))
    delete fragment.env
    fragment.hooks.PreToolUse[0].hooks.push({ type: "command", command: 'bun "$HOME/.claude/hooks/ghost.ts"' })
    writeFileSync(fragmentPath, JSON.stringify(fragment))
    const unknownHook = await run(repo, "--install", "--home", home)
    expect(unknownHook.exitCode).toBe(1)
    expect(unknownHook.stderr).toContain("PreToolUse hook ghost.ts has no claude/hooks/ghost.ts")
    expect(readdirSync(join(home, ".claude")).sort()).toEqual(["CLAUDE.md", "settings.json"])
  }))

  test("--install refuses a linked worktree", withRepo(async ({ root, repo, home }) => {
    await run(repo)
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "init")
    const linked = join(root, "linked")
    git(repo, "worktree", "add", "-q", linked)
    const result = await run(linked, "--install", "--home", home)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("must run from the main worktree")
    expect(existsSync(home)).toBe(false)
  }))

  test("--install and --check-installed fail fast without HOME or --home", withRepo(async ({ repo }) => {
    await run(repo)
    for (const HOME of ["", undefined]) {
      for (const mode of ["--install", "--check-installed"]) {
        const result = await runWith(repo, { HOME }, mode)
        expect(result.exitCode).toBe(2)
        expect(result.stderr).toContain("HOME is empty or unset; pass --home DIR")
      }
    }
    expect(readdirSync(repo).sort()).toEqual([".git", "AGENTS.md", "agents", "briefs", "claude", "external", "instructions", "roles", "scripts"])
  }))
})
