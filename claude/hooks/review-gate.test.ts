import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { denyReason, handle, publishOf, recordSyntax, type ResolvePrHead } from "./review-gate.ts"
import { commands } from "./shell.ts"

const recordScript = join(import.meta.dir, "../../skills/review-and-simplify-changes/scripts/record-review.sh")
const run = (cwd: string, cmd: string[]) => {
  const result = spawnSync(cmd[0]!, cmd.slice(1), { cwd, encoding: "utf8" })
  if (result.status !== 0) throw new Error(`${cmd.join(" ")}: ${result.stderr}`)
  return result.stdout.trim()
}
const record = (repo: string, openFindings = 0) =>
  run(repo, ["bash", recordScript, "HEAD", "--reviewed", run(repo, ["git", "rev-parse", "HEAD"]), "--reviewers", "reviewer", "--open-findings", String(openFindings)])
const commit = (repo: string, text: string) => {
  writeFileSync(join(repo, "a.txt"), text)
  run(repo, ["git", "commit", "-qam", text])
}

// A checkout on branch `feat` that tracks a local bare remote, plus a GitHub remote naming o/r.
type Fixture = { root: string; repo: string }
const withRepo = (body: (f: Fixture) => void) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "review-gate-")))
  const repo = join(root, "repo")
  try {
    mkdirSync(repo)
    run(root, ["git", "init", "-q", "--bare", "origin.git"])
    run(repo, ["git", "init", "-q", "-b", "feat"])
    run(repo, ["git", "config", "user.email", "t@example.com"])
    run(repo, ["git", "config", "user.name", "T"])
    run(repo, ["git", "remote", "add", "origin", join(root, "origin.git")])
    run(repo, ["git", "remote", "add", "github", "git@github.com:o/r.git"])
    writeFileSync(join(repo, "a.txt"), "a\n")
    run(repo, ["git", "add", "."])
    run(repo, ["git", "commit", "-qm", "init"])
    run(repo, ["git", "push", "-q", "-u", "origin", "feat"])
    body({ root, repo })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const noLookup: ResolvePrHead = () => {
  throw new Error("unexpected PR lookup")
}
const bash = (command: string, cwd: string) => ({ tool_name: "Bash", cwd, tool_input: { command } })
const decide = (command: string, cwd: string, resolve = noLookup) => denyReason(command, cwd, resolve) ?? "allow"

describe("publish detection", () => {
  const publishes = (src: string) => commands(src, { cwd: "/w", remote: false }).some(c => !c.ctx.remote && publishOf(c))
  const gated = [
    "gh pr create --title x --body y",
    "gh pr create --draft=false",
    "gh pr new --fill",
    "gh pr ready",
    "gh pr ready 42",
    "gh -R o/r pr ready 42",
    "git push -u origin HEAD && gh pr create --fill",
    "GH_TOKEN=x gh pr create --fill",
    "env GH_PAGER= gh pr ready",
    "timeout 30 gh pr ready",
    `sg docker -c "gh pr ready"`,
    `bash -c 'gh pr create --fill'`,
    "/usr/bin/gh pr create --title 'a && b' --body \"x; y\"",
    "gh pr create --fill 2>&1 | tail -n 3",
    "gh api repos/o/r/pulls -f head=feat -f base=main -f title=t",
    "gh api -X POST repos/{owner}/{repo}/pulls -F draft=false -f head=feat",
    `gh api repos/o/r/pulls --input - <<'EOF'\n{"head":"feat","base":"main"}\nEOF`,
    `gh api graphql -f query='mutation { markPullRequestReadyForReview(input: {pullRequestId: "PR_x"}) { clientMutationId } }'`,
  ]
  for (const command of gated) test(`gates: ${command}`, () => expect(publishes(command)).toBe(true))

  const free = [
    "gh pr create --draft --fill",
    "gh pr create -d --fill",
    "gh pr create --dry-run --fill",
    "gh pr new --draft",
    "gh pr ready --undo 4",
    "gh pr view 4",
    "gh api repos/o/r/pulls",
    "gh api repos/o/r/pulls -X GET -f state=open",
    "gh api repos/o/r/pulls -f head=feat -F draft=true",
    `gh api repos/o/r/pulls --input - <<'EOF'\n{"head":"feat","draft": true}\nEOF`,
    "gh api -X POST repos/o/r/pulls/3/comments -f body=x",
    "gh api graphql -f query='query { viewer { login } }'",
    "gh pr ready --help",
    "gh pr ready -h",
    "gh pr create --help",
    "gh api repos/o/r/pulls -f head=feat --help",
    "echo 'gh pr create'",
    "git commit -m \"gh pr ready later\"",
    "git commit -F - <<'EOF'\nThen run gh pr ready.\nEOF",
    `git commit -m "$(cat <<'EOF'\nGate gh pr ready (R2-3)\nEOF\n)"`,
    "ssh box gh pr ready",
  ]
  for (const command of free) test(`ignores: ${command}`, () => expect(publishes(command)).toBe(false))
})

describe("review record gate", () => {
  test("denies until the HEAD tree has a record, naming the directory, tree, and record syntax", () => withRepo(({ repo }) => {
    const tree = run(repo, ["git", "rev-parse", "HEAD^{tree}"])
    const reason = decide("gh pr create --fill", repo)
    expect(reason).toContain(`Checked ${repo} at HEAD tree ${tree}.`)
    expect(reason).toContain(recordSyntax)
    expect(reason).toMatch(/write the review record first/i)
    expect(reason).toMatch(/publish in a separate tool call/i)
    record(repo)
    expect(decide("gh pr create --fill", repo)).toBe("allow")
    expect(decide("gh pr ready", repo)).toBe("allow")
  }))

  test("a new commit needs a new record, and a record with open findings does not pass", () => withRepo(({ repo }) => {
    record(repo)
    commit(repo, "b\n")
    expect(decide("gh pr ready", repo)).toContain("needs a review record")
    record(repo, 1)
    expect(decide("gh pr ready", repo)).toContain("needs a review record")
  }))

  test("HEAD must match its upstream unless the same command pushes first", () => withRepo(({ repo }) => {
    commit(repo, "b\n")
    record(repo)
    expect(decide("gh pr ready", repo)).toContain("push the reviewed commit first: push in its own command or without a pipe, then publish.")
    expect(decide("git push && gh pr ready", repo)).toBe("allow")
    run(repo, ["git", "push", "-q"])
    expect(decide("gh pr ready", repo)).toBe("allow")
  }))

  test("only a real push of this branch joined by && stands in for the upstream match", () => withRepo(({ root, repo }) => {
    commit(repo, "b\n")
    record(repo)
    mkdirSync(join(repo, "sub"))
    const other = join(root, "other")
    run(root, ["git", "init", "-q", other])
    for (const push of [
      "git push origin HEAD",
      "git push -u origin feat",
      "git push --force-with-lease origin +refs/heads/feat:feat",
      `git -C ${repo} push`,
      "git -C .. push",
      `git -c push.default=current -C ${repo} push origin HEAD`,
      "git push && echo pushed",
      "cd . && git push",
    ]) expect({ push, decision: decide(`${push} && gh pr ready`, push === "git -C .. push" ? join(repo, "sub") : repo) }).toEqual({ push, decision: "allow" })
    for (const push of [
      "git push --dry-run",
      "git push -n",
      "git push -fn",
      "git push origin other",
      "git push origin HEAD:refs/heads/elsewhere",
      "git push --tags",
      "git push --all origin",
      "git push origin --delete feat",
      `git -C ${other} push`,
      "git push | tee log",
      "git push;",
      "git push ||",
      "git push; true",
      "git --git-dir=.git push",
    ]) expect({ push, decision: decide(`${push} && gh pr ready`, repo) }).toEqual({ push, decision: expect.stringContaining("push the reviewed commit first") })
  }))

  test("a commit, merge, or pull earlier in the same command blocks the publish", () => withRepo(({ repo }) => {
    record(repo)
    for (const before of ["git commit -am x && git push &&", "git -C . merge other &&", "git pull --rebase &&", "git reset --hard HEAD~1;", "git rebase main &&", "git cherry-pick abc &&", "git am p.patch &&", "git revert HEAD &&", `bash -c "git commit -m x" &&`])
      expect({ before, reason: decide(`${before} gh pr ready`, repo) }).toEqual({ before, reason: expect.stringContaining("Commit, record the review, then publish in a separate command.") })
    for (const before of ["git status &&", "git log -1 &&", "git push &&", "git commit --help;", "gh pr view &&"])
      expect({ before, reason: decide(`${before} gh pr ready`, repo) }).toEqual({ before, reason: "allow" })
    expect(decide("gh pr ready && git commit -am x", repo)).toBe("allow")
  }))

  test("a branch switch earlier in the same command blocks the publish; path restores and new branches at HEAD do not", () => withRepo(({ repo }) => {
    record(repo)
    const blocked = expect.stringContaining("Commit, record the review, then publish in a separate command.")
    expect(decide("git switch other && gh pr create --fill", repo)).toEqual(blocked)
    expect(decide("git checkout other && gh pr ready", repo)).toEqual(blocked)
    for (const before of ["git checkout --detach HEAD~1 &&", "git checkout -b x main &&", "git switch -c x origin/main &&", "git checkout -t origin/x &&", "git switch - &&", "git commit -c HEAD -m x &&"])
      expect({ before, reason: decide(`${before} gh pr ready`, repo) }).toEqual({ before, reason: blocked })
    for (const before of ["git checkout -- a.txt &&", "git checkout HEAD~1 -- a.txt &&", "git checkout -b x &&", "git checkout -B x &&", "git switch -c x &&", "git switch --help &&"])
      expect({ before, reason: decide(`${before} gh pr ready`, repo) }).toEqual({ before, reason: "allow" })
  }))

  test("without @{u}, HEAD must match refs/remotes/<push remote>/<branch> when it exists", () => withRepo(({ repo }) => {
    run(repo, ["git", "branch", "--unset-upstream"])
    commit(repo, "b\n")
    record(repo)
    expect(decide("gh pr ready", repo)).toContain("differs from refs/remotes/origin/feat")
    run(repo, ["git", "remote", "add", "fork", join(repo, "../origin.git")])
    run(repo, ["git", "config", "remote.pushDefault", "fork"])
    expect(decide("gh pr ready", repo)).toBe("allow")
    run(repo, ["git", "fetch", "-q", "fork"])
    expect(decide("gh pr ready", repo)).toContain("differs from refs/remotes/fork/feat")
    run(repo, ["git", "push", "-q", "fork", "feat"])
    expect(decide("gh pr ready", repo)).toBe("allow")
  }))

  test("a numeric selector resolves the PR head with one lookup and compares trees", () => withRepo(({ repo }) => {
    const first = run(repo, ["git", "rev-parse", "HEAD"])
    commit(repo, "b\n")
    run(repo, ["git", "push", "-q"])
    record(repo)
    const head = run(repo, ["git", "rev-parse", "HEAD"])
    const calls: unknown[][] = []
    const lookup = (sha: string | undefined): ResolvePrHead => (...args) => {
      calls.push(args)
      return sha
    }
    expect(decide("gh pr ready 42", repo, lookup(head))).toBe("allow")
    expect(decide("gh -R o/r pr ready 42", repo, lookup(head))).toBe("allow")
    expect(decide("gh pr ready https://github.com/o/r/pull/42", repo, lookup(head))).toBe("allow")
    expect(calls).toEqual([[repo, undefined, "42"], [repo, "o/r", "42"], [repo, "o/r", "42"]])
    expect(decide("gh pr ready 42", repo, lookup(first))).toContain("is not this checkout's tree")
    const failed = decide("gh pr ready 42", repo, lookup(undefined))
    expect(failed).toContain("could not be looked up")
    expect(failed).toContain("run it from the PR's checkout")
  }))

  test("--head, a branch selector, and -R must name this checkout's branch and repo", () => withRepo(({ repo }) => {
    record(repo)
    expect(decide("gh pr create --head feat --fill", repo)).toBe("allow")
    expect(decide("gh pr create --head=o:feat --fill", repo)).toBe("allow")
    expect(decide("gh pr create -Hfeat --fill", repo)).toBe("allow")
    expect(decide("gh pr create -R github.com/o/r --fill", repo)).toBe("allow")
    expect(decide("gh pr create --head=x:feat --fill", repo)).toContain("names head owner x, but this branch pushes to o")
    expect(decide("gh pr create -Hother --fill", repo)).toContain("names head other")
    expect(decide("gh pr create -Rx/y --fill", repo)).toContain("targets x/y")
    expect(decide("gh -Rx/y pr ready", repo)).toContain("targets x/y")
    expect(decide("gh pr create -R ghe.example.com/o/r --fill", repo)).toContain("targets ghe.example.com/o/r")
    expect(decide("GH_HOST=ghe.example.com gh pr create -R o/r --fill", repo)).toContain("which is not a remote")
    expect(decide("gh api --hostname ghe.example.com repos/o/r/pulls -f head=feat", repo)).toContain("which is not a remote")
    expect(decide("gh pr ready https://ghe.example.com/o/r/pull/1", repo)).toContain("targets ghe.example.com/o/r")
    expect(decide("GH_REPO=x/y bash -c 'gh pr create --fill'", repo)).toContain("targets x/y")
    expect(decide("export GH_REPO=x/y; gh pr ready", repo)).toContain("targets x/y")
    expect(decide("gh pr ready feat", repo)).toBe("allow")
    expect(decide("gh pr create -R o/r --fill", repo)).toBe("allow")
    expect(decide("gh pr create --head other --fill", repo)).toContain("names head other, not the current branch feat")
    expect(decide("gh pr ready other", repo)).toContain("names branch other")
    expect(decide("gh pr create -R x/y --fill", repo)).toContain("targets x/y, which is not a remote")
    expect(decide("GH_REPO=x/y gh pr create --fill", repo)).toContain("targets x/y")
    expect(decide("gh pr ready https://github.com/x/y/pull/1", repo)).toContain("targets github.com/x/y")
  }))

  test("gh api pull creation must name this branch; the ready mutation is refused", () => withRepo(({ repo }) => {
    record(repo)
    expect(decide("gh api repos/o/r/pulls -f head=feat -f base=main -f title=t", repo)).toBe("allow")
    expect(decide("gh api repos/{owner}/{repo}/pulls -f head=other -f base=main", repo)).toContain("names head other")
    expect(decide("gh api repos/o/r/pulls -f base=main -f title=t", repo)).toContain("names no head branch")
    expect(decide(`gh api graphql -f query='mutation { markPullRequestReadyForReview(input: {pullRequestId: "x"}) { clientMutationId } }'`, repo)).toContain("use `gh pr ready` instead")
  }))

  test("checks the directory a leading cd selects; a non-checkout is refused", () => withRepo(({ root, repo }) => {
    record(repo)
    expect(decide(`cd ${repo} && gh pr ready`, root)).toBe("allow")
    expect(decide("gh pr ready", root)).toContain(`runs in ${root}, which is not a git checkout`)
    expect(decide("cd $DIR && gh pr ready", repo)).toContain("could not tell which directory")
  }))

  test("allows drafts, unrelated commands, non-Bash tools, and the env override", () => withRepo(({ repo }) => {
    expect(decide("gh pr create --draft --fill", repo)).toBe("allow")
    expect(decide("gh pr view && git status", repo)).toBe("allow")
    expect(handle({ tool_name: "Read", cwd: repo, tool_input: { command: "gh pr ready" } }, {})).toBeUndefined()
    expect(handle(bash("gh pr ready", repo), { AGENT_REVIEW_GATE: "off" })).toBeUndefined()
    expect(JSON.parse(handle(bash("gh pr ready", repo), {}, noLookup)!).hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" })
  }))
})

describe("hook subprocess", () => {
  const hook = (stdin: string) => {
    const result = spawnSync("bun", [join(import.meta.dir, "review-gate.ts")], { input: stdin, encoding: "utf8", env: { ...process.env, AGENT_REVIEW_GATE: "" } })
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status }
  }

  test("denies through stdin JSON", () => withRepo(({ repo }) => {
    const result = hook(JSON.stringify(bash("gh pr ready", repo)))
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision).toBe("deny")
  }))

  test("malformed input exits 0 with one stderr line", () => {
    for (const input of ["not json", "null", ""]) {
      const result = hook(input)
      expect(result).toMatchObject({ exitCode: 0, stdout: "" })
      expect(result.stderr.trim().split("\n")).toHaveLength(1)
    }
  })
})
