import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SCRIPT = join(import.meta.dir, "cleanup-merged.sh")
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

type Fixture = ReturnType<typeof fixture>

function run(cmd: string[], cwd: string, env: Record<string, string> = {}) {
  const result = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" })
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() }
}

function git(cwd: string, ...args: string[]) {
  const result = run(["git", ...args], cwd, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" })
  if (result.code !== 0) throw new Error(`git ${args.join(" ")}: ${result.err}`)
  return result.out.trim()
}

function commit(cwd: string, file: string) {
  writeFileSync(join(cwd, file), file)
  git(cwd, "add", file)
  git(cwd, "commit", "-qm", file)
  return git(cwd, "rev-parse", "HEAD")
}

// Real `wt` when installed, so a bad wt invocation fails the suite; otherwise a
// Bun stub that emulates `wt list --format=json` and `wt remove` for this layout.
const REAL_WT = Bun.which("wt")
const STUB_WT = `#!/usr/bin/env bun
const [, , , main, cmd, branch] = process.argv
const git = (...args: string[]) => Bun.spawnSync(["git", "-C", main!, ...args]).stdout.toString()
const entries = git("worktree", "list", "--porcelain").trim().split("\\n\\n").map((block) => {
  const line = (key: string) => block.split("\\n").find((l) => l.startsWith(key + " "))?.slice(key.length + 1)
  return { path: line("worktree")!, branch: line("branch")?.replace("refs/heads/", "") }
})
if (cmd === "list") {
  const items = entries.map((e, i) => ({
    branch: e.branch ?? null,
    worktree: {
      path: e.path,
      main: i === 0,
      branch_mismatch: i !== 0 && e.path !== process.env.WT_STUB_ROOT + "/repo/" + e.branch?.replaceAll("/", "-"),
      duplicate_branch: entries.filter((o) => o.branch === e.branch).length > 1,
    },
  }))
  console.log(JSON.stringify({ schema: 2, items }))
} else if (cmd === "remove") {
  const path = entries.find((e) => e.branch === branch)!.path
  process.exit(Bun.spawnSync(["git", "-C", main!, "worktree", "remove", path]).exitCode)
} else process.exit(2)
`

// Temp origin + main checkout `repo` + a worktree for `feature` at the Worktrunk
// worktree-path, with stub `gh` (runs $GH_BEFORE, then prints $GH_STUB_OUT, or
// fails when it is unset) and a logging `wt` wrapper that runs $WT_BEFORE_REMOVE
// before a removal. `hook` commits a project pre-remove hook that wt must approve.
function fixture({ worktreeAt = "template" as "template" | "elsewhere" | "renamed", hook = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "cleanup-merged-"))
  roots.push(root)
  const [home, bin, origin, main] = ["home", "bin", "origin.git", "repo"].map((name) => join(root, name))
  const wsRoot = join(root, "ws")
  const config = join(home, ".config/worktrunk/config.toml")
  for (const dir of [bin, wsRoot, join(home, ".config/worktrunk")]) mkdirSync(dir, { recursive: true })
  writeFileSync(config, `worktree-path = "${wsRoot}/{{ repo }}/{{ branch | sanitize }}"\n`)
  const log = join(root, "calls.log")
  writeFileSync(join(bin, "gh"), `#!/usr/bin/env bash\necho "gh $*" >>"${log}"\nif [[ -n "\${GH_BEFORE:-}" ]]; then bash -c "$GH_BEFORE"; fi\n[[ -n "\${GH_STUB_OUT+x}" ]] || exit 1\nprintf '%s' "$GH_STUB_OUT"\n`)
  const impl = REAL_WT ?? join(bin, "wt-stub")
  if (!REAL_WT) writeFileSync(impl, STUB_WT)
  writeFileSync(
    join(bin, "wt"),
    `#!/usr/bin/env bash\necho "wt $*" >>"${log}"\nif [[ "$3" == remove && -n "\${WT_BEFORE_REMOVE:-}" ]]; then bash -c "$WT_BEFORE_REMOVE"; fi\nexec "${impl}" "$@"\n`,
  )
  for (const stub of ["gh", "wt", ...(REAL_WT ? [] : ["wt-stub"])]) chmodSync(join(bin, stub), 0o755)

  git(root, "init", "-q", "--bare", "-b", "main", origin)
  git(root, "clone", "-q", origin, main)
  commit(main, "base")
  if (hook) {
    mkdirSync(join(main, ".config"))
    writeFileSync(join(main, ".config/wt.toml"), `[pre-remove]\nnote = "echo pre-remove ran"\n`)
    git(main, "add", ".config/wt.toml")
    git(main, "commit", "-qm", "hook")
  }
  git(main, "push", "-q", "origin", "main")
  git(main, "remote", "set-head", "origin", "main")
  const wt = { template: join(wsRoot, "repo", "feature"), elsewhere: join(root, "elsewhere", "feature"), renamed: join(wsRoot, "repo", "other-name") }[worktreeAt]
  git(main, "worktree", "add", "-q", "-b", "feature", wt)
  const tip = commit(wt, "feature-change")
  git(wt, "push", "-q", "-u", "origin", "feature")
  return { root, home, bin, origin, main, wt, wsRoot, config, tip, log }
}

const hermetic = (f: Fixture): Record<string, string> => ({
  HOME: f.home,
  PATH: `${f.bin}:${process.env.PATH}`,
  XDG_CONFIG_HOME: join(f.home, ".config"),
  WORKTRUNK_CONFIG_PATH: f.config,
  WT_STUB_ROOT: f.wsRoot,
})

function cleanup(f: Fixture, args: string[], ghOut?: string, extra: Record<string, string> = {}) {
  const env: Record<string, string> = { ...hermetic(f), ...extra }
  if (ghOut !== undefined) env.GH_STUB_OUT = ghOut
  return run([SCRIPT, ...args], f.main, env)
}

// Advance origin/main with a squash commit of the feature and drop the remote branch.
function squashMerge(f: Fixture) {
  git(f.main, "checkout", "-q", "-b", "squash")
  const squashed = commit(f.main, "squashed")
  git(f.main, "push", "-q", "origin", "squash:main", ":feature")
  git(f.main, "checkout", "-q", "main")
  git(f.main, "branch", "-q", "-D", "squash")
  return squashed
}

const calls = (f: Fixture) => (existsSync(f.log) ? readFileSync(f.log, "utf8") : "")
const branchExists = (f: Fixture) => run(["git", "show-ref", "--verify", "--quiet", "refs/heads/feature"], f.main).code === 0
const removed = (f: Fixture) => calls(f).includes(" remove ")

describe("cleanup-merged.sh refusals", () => {
  test("refuses a worktree with modified files", () => {
    const f = fixture()
    writeFileSync(join(f.wt, "feature-change"), "edited")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(1)
    expect(result.err).toContain("uncommitted or untracked")
    expect(removed(f)).toBe(false)
    expect(branchExists(f)).toBe(true)
  })

  test("refuses a worktree with only untracked files", () => {
    const f = fixture()
    writeFileSync(join(f.wt, "notes.txt"), "evidence")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(1)
    expect(result.err).toContain("notes.txt")
    expect(existsSync(f.wt)).toBe(true)
  })

  test("refuses an unmerged branch", () => {
    const f = fixture()
    const result = cleanup(f, ["feature"], "")
    expect(result.code).toBe(1)
    expect(result.err).toContain("feature is not merged")
    expect(calls(f)).toContain("gh api -X GET repos/{owner}/{repo}/pulls -F head={owner}:feature -f state=closed -f per_page=100 ")
    expect(branchExists(f)).toBe(true)
  })

  test("refuses local commits made after the merged PR head", () => {
    const f = fixture()
    commit(f.wt, "after-merge")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(1)
    expect(result.err).toContain("not merged")
  })

  for (const worktreeAt of ["elsewhere", "renamed"] as const) {
    test(`refuses a worktree off the Worktrunk worktree-path (${worktreeAt})`, () => {
      const f = fixture({ worktreeAt })
      const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
      expect(result.code).toBe(1)
      expect(result.err).toContain("is not at the Worktrunk worktree-path for feature")
      expect(removed(f)).toBe(false)
      expect(branchExists(f)).toBe(true)
    })
  }

  test("passes a Unicode branch name to gh as a raw query field for gh to encode", () => {
    const f = fixture()
    git(f.main, "branch", "féature/ü 1".replace(" ", "-"), f.tip)
    const result = cleanup(f, ["féature/ü-1"], "")
    expect(result.code).toBe(1)
    expect(result.err).toContain("féature/ü-1 is not merged")
    expect(calls(f)).toContain("gh api -X GET repos/{owner}/{repo}/pulls -F head={owner}:féature/ü-1 -f state=closed")
  })

  test("refuses a merged branch that a worktree is rebasing (stopped interactive rebase)", () => {
    const f = fixture()
    squashMerge(f)
    const rebase = run(["git", "rebase", "-q", "-i", "HEAD~1"], f.wt, { GIT_SEQUENCE_EDITOR: "sed -i 's/^pick/edit/'" })
    expect(rebase.code).toBe(0)
    expect(git(f.main, "worktree", "list", "--porcelain")).not.toContain("branch refs/heads/feature")
    for (const args of [["--dry-run", "feature"], ["feature"]]) {
      const result = cleanup(f, args, `7 ${f.tip}\n`)
      expect(result.code).toBe(1)
      expect(result.err).toContain(`worktree ${f.wt} has a rebase-merge in progress on feature`)
    }
    expect(branchExists(f)).toBe(true)
    expect(existsSync(f.wt)).toBe(true)
  })

  // feature (merged, no worktree) <- mid <- top, with `top` checked out in another
  // worktree that stops in `git rebase -i --update-refs <base>` on its first commit.
  function stackedRebase(f: Fixture, base: string) {
    squashMerge(f)
    git(f.main, "worktree", "remove", f.wt)
    const top = join(f.root, "top")
    git(f.main, "worktree", "add", "-q", "-b", "mid", top, "feature")
    commit(top, "mid-change")
    git(top, "checkout", "-q", "-b", "top")
    commit(top, "top-change")
    const rebase = run(["git", "rebase", "-q", "-i", "--update-refs", base], top, { GIT_SEQUENCE_EDITOR: "sed -i '0,/^pick/s//edit/'" })
    expect(rebase.code).toBe(0)
    return top
  }

  test("refuses a merged branch that another worktree's stacked rebase will update", () => {
    const f = fixture()
    const top = stackedRebase(f, "feature~1")
    for (const args of [["--dry-run", "feature"], ["feature"]]) {
      const result = cleanup(f, args, `7 ${f.tip}\n`)
      expect(result.code).toBe(1)
      expect(result.err).toContain(`worktree ${top} has a stacked rebase in progress that will update feature`)
    }
    expect(branchExists(f)).toBe(true)
  })

  test("cleans a merged branch below a stacked rebase that does not update it", () => {
    const f = fixture()
    stackedRebase(f, "feature")
    const result = cleanup(f, ["--dry-run", "feature"], `7 ${f.tip}\n`)
    expect(result.err).toBe("")
    expect(result.code).toBe(0)
    expect(result.out).toContain("would run: git -C")
  })

  test("refuses a merged branch that a worktree is bisecting", () => {
    const f = fixture()
    squashMerge(f)
    git(f.wt, "bisect", "start", "feature", "main~1")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(1)
    expect(result.err).toContain(`worktree ${f.wt} has a BISECT_START in progress on feature`)
    expect(branchExists(f)).toBe(true)
  })

  test("refuses an unmerged branch without a worktree", () => {
    const f = fixture()
    git(f.main, "worktree", "remove", f.wt)
    const result = cleanup(f, ["feature"], "")
    expect(result.code).toBe(1)
    expect(result.out).toContain("feature is not checked out in any worktree")
    expect(result.err).toContain("feature is not merged")
    expect(branchExists(f)).toBe(true)
  })

  test("keeps a branch without a worktree that moves during the merge proof", () => {
    const f = fixture()
    git(f.main, "worktree", "remove", f.wt)
    const moved = `git -C "${f.main}" update-ref refs/heads/feature "$(git -C "${f.main}" rev-parse main)"`
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`, { GH_BEFORE: moved })
    expect(result.code).toBe(1)
    expect(result.err).toContain(`feature moved after its checks (was ${f.tip}, now `)
    expect(result.err).toContain("nothing was removed")
    expect(branchExists(f)).toBe(true)
  })

  test("refuses a missing worktree directory without pruning it", () => {
    const f = fixture()
    rmSync(f.wt, { recursive: true, force: true })
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(1)
    expect(result.err).toContain(`worktree directory ${f.wt} is missing`)
    expect(removed(f)).toBe(false)
    expect(branchExists(f)).toBe(true)
    expect(git(f.main, "worktree", "list", "--porcelain")).toContain(`worktree ${f.wt}`)
  })

  test("keeps a branch that moves while its worktree is removed", () => {
    const f = fixture()
    squashMerge(f)
    const before = `cd "${f.wt}" && echo late >late && git add late && git -c user.name=t -c user.email=t@t commit -qm late`
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`, { WT_BEFORE_REMOVE: before })
    expect(result.code).not.toBe(0)
    expect(result.err).toContain(`feature moved after its checks (was ${f.tip}, now `)
    expect(result.err).toContain(`its worktree ${f.wt} is gone, and the branch kept its new commits`)
    expect(result.err).not.toContain("rerun")
    expect(branchExists(f)).toBe(true)
    expect(git(f.main, "rev-parse", "feature")).not.toBe(f.tip)
  })
})

describe("cleanup-merged.sh actions", () => {
  test("dry run prints every action and changes nothing", () => {
    const f = fixture()
    git(f.main, "merge", "-q", "--ff-only", "feature")
    git(f.main, "push", "-q", "origin", "main")
    git(f.main, "reset", "-q", "--hard", "HEAD~1")
    const result = cleanup(f, ["--dry-run", "feature"])
    expect(result.code).toBe(0)
    expect(result.out).toContain("gh api lookup failed; using ancestry only")
    expect(result.out).toContain("feature is an ancestor of origin/main")
    expect(result.out).toContain(`would run: wt -C ${f.main} remove feature --no-delete-branch --foreground\n`)
    expect(result.out).toContain(`would run: git -C ${f.main} update-ref -d refs/heads/feature ${f.tip}`)
    expect(result.out).toContain(`would run: git -C ${f.main} pull --ff-only --quiet`)
    expect(removed(f)).toBe(false)
    expect(branchExists(f)).toBe(true)
    expect(existsSync(f.wt)).toBe(true)
  })

  test("squash-merged PR: removes worktree, deletes branch and stale remote ref, fast-forwards main", () => {
    const f = fixture()
    const squashed = squashMerge(f)
    git(f.main, "update-ref", "refs/remotes/origin/feature", f.tip)
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.err).not.toContain("refuse")
    expect(result.code).toBe(0)
    expect(result.out).toContain("PR #7 merged")
    expect(calls(f)).toContain(`wt -C ${f.main} remove feature --no-delete-branch --foreground\n`)
    expect(existsSync(f.wt)).toBe(false)
    expect(branchExists(f)).toBe(false)
    expect(run(["git", "show-ref", "--quiet", "refs/remotes/origin/feature"], f.main).code).toBe(1)
    expect(git(f.main, "rev-parse", "HEAD")).toBe(squashed)
    expect(run(["git", "config", "--get-regexp", "^branch\\.feature\\."], f.main).out).toBe("")
  })

  test("a merged branch without a worktree: skips wt, deletes the branch at its pinned tip", () => {
    const f = fixture()
    git(f.main, "worktree", "remove", f.wt)
    squashMerge(f)
    const dry = cleanup(f, ["--dry-run", "feature"], `7 ${f.tip}\n`)
    expect(dry.code).toBe(0)
    expect(dry.out).toContain(`would run: git -C ${f.main} update-ref -d refs/heads/feature ${f.tip}`)
    expect(dry.out).not.toContain(" remove ")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.err).toBe("")
    expect(result.code).toBe(0)
    expect(result.out).toContain("feature is not checked out in any worktree; skipping the ownership and clean checks")
    expect(result.out).toContain("PR #7 merged")
    expect(calls(f)).not.toContain("wt ")
    expect(branchExists(f)).toBe(false)
  })

  test.skipIf(!REAL_WT)("an unapproved project hook stops wt remove; a persisted approval lets it run", () => {
    const f = fixture({ hook: true })
    squashMerge(f)
    const refused = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(refused.code).toBe(1)
    expect(refused.err).toContain("wt remove stopped on an unapproved project hook, so nothing was removed")
    expect(refused.err).toContain(`wt -C ${f.main} config approvals list`)
    expect(refused.err).toContain(`wt -C ${f.main} config approvals add`)
    expect(existsSync(f.wt)).toBe(true)
    expect(branchExists(f)).toBe(true)
    const approve = run([REAL_WT!, "-C", f.main, "config", "approvals", "add", "--yes"], f.main, hermetic(f))
    expect(approve.code).toBe(0)
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.err).not.toContain("refuse")
    expect(result.code).toBe(0)
    expect(result.out).toContain("pre-remove ran")
    expect(existsSync(f.wt)).toBe(false)
    expect(branchExists(f)).toBe(false)
  })

  test("fetches a merged PR head that is missing locally", () => {
    const f = fixture()
    const other = join(f.root, "other")
    git(f.root, "clone", "-q", "-b", "feature", f.origin, other)
    const prHead = commit(other, "review-fix")
    git(other, "push", "-q", "origin", "HEAD:refs/pull/9/head")
    expect(run(["git", "cat-file", "-e", prHead], f.main).code).not.toBe(0)
    const result = cleanup(f, ["feature"], `9 ${prHead}\n`)
    expect(result.err).not.toContain("refuse")
    expect(result.code).toBe(0)
    expect(result.out).toContain("PR #9 merged")
    expect(branchExists(f)).toBe(false)
  })

  test("keeps the remote-tracking ref when origin cannot be reached", () => {
    const f = fixture()
    squashMerge(f)
    git(f.main, "update-ref", "refs/remotes/origin/feature", f.tip)
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`, { GH_BEFORE: `git -C "${f.main}" remote set-url origin "${f.root}/missing.git"` })
    expect(result.code).toBe(0)
    expect(result.out).toMatch(/skip: git ls-remote origin failed \(exit \d+\); kept refs\/remotes\/origin\/feature/)
    expect(branchExists(f)).toBe(false)
    expect(git(f.main, "rev-parse", "refs/remotes/origin/feature")).toBe(f.tip)
  })

  test("a failed fast-forward is reported and cleanup still succeeds", () => {
    const f = fixture()
    squashMerge(f)
    commit(f.main, "local-only")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(0)
    expect(result.out).toContain("skip: fast-forward failed:")
    expect(result.out).toContain("done: feature")
    expect(branchExists(f)).toBe(false)
    expect(existsSync(f.wt)).toBe(false)
  })

  test("skips the fast-forward when the main checkout has local edits", () => {
    const f = fixture()
    writeFileSync(join(f.main, "base"), "local edit")
    const result = cleanup(f, ["feature"], `7 ${f.tip}\n`)
    expect(result.code).toBe(0)
    expect(result.out).toContain("has uncommitted changes")
    expect(result.out).not.toContain("pull --ff-only")
    expect(branchExists(f)).toBe(false)
  })
})
