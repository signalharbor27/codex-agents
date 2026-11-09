import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { reviewStatus } from "./review-status.ts"

const run = (cwd: string, ...args: string[]) => {
  const result = spawnSync(args[0]!, args.slice(1), { cwd, encoding: "utf8" })
  if (result.status !== 0) throw new Error(`${args.join(" ")}: ${result.stderr}`)
  return result.stdout.trim()
}

const withRepo = (body: (repo: string) => void) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "review-status-")))
  const repo = join(root, "repo")
  try {
    mkdirSync(repo)
    run(repo, "git", "init", "-q", "-b", "feat")
    run(repo, "git", "config", "user.email", "test@example.com")
    run(repo, "git", "config", "user.name", "Test")
    writeFileSync(join(repo, "a.txt"), "a\n")
    run(repo, "git", "add", ".")
    run(repo, "git", "commit", "-qm", "init")
    body(repo)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const writeRecord = (repo: string, openFindings = 0) => {
  const tree = run(repo, "git", "rev-parse", "HEAD^{tree}")
  const common = run(repo, "git", "rev-parse", "--path-format=absolute", "--git-common-dir")
  mkdirSync(join(common, "agent-review"), { recursive: true })
  writeFileSync(join(common, "agent-review", `${tree}.json`), JSON.stringify({ tree, open_findings: openFindings }))
}

describe("reviewStatus", () => {
  test("names the missing record and command before publication", () => withRepo(repo => {
    const result = reviewStatus(repo)
    expect(result.ok).toBe(false)
    expect(result.message).toContain("no review record covers HEAD tree")
    expect(result.message).toContain("record-review.sh")
  }))

  test("passes only for the current tree with no open findings", () => withRepo(repo => {
    writeRecord(repo)
    expect(reviewStatus(repo)).toMatchObject({ ok: true })
    run(repo, "sh", "-c", "printf 'b\\n' > a.txt && git commit -qam changed")
    const result = reviewStatus(repo)
    expect(result.ok).toBe(false)
    expect(result.message).toContain("no review record covers HEAD tree")
  }))

  test("rejects a record that still has an open finding", () => withRepo(repo => {
    writeRecord(repo, 1)
    expect(reviewStatus(repo)).toEqual(expect.objectContaining({ ok: false, message: expect.stringContaining("0 open findings") }))
  }))

  test("falls back to the push remote when no tracking upstream is configured", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "review-status-remote-")))
    const repo = join(root, "repo")
    const bare = join(root, "origin.git")
    try {
      mkdirSync(repo)
      run(root, "git", "init", "-q", "--bare", "origin.git")
      run(repo, "git", "init", "-q", "-b", "feat")
      run(repo, "git", "config", "user.email", "test@example.com")
      run(repo, "git", "config", "user.name", "Test")
      run(repo, "git", "remote", "add", "origin", bare)
      writeFileSync(join(repo, "a.txt"), "a\n")
      run(repo, "git", "add", ".")
      run(repo, "git", "commit", "-qm", "init")
      run(repo, "git", "push", "-q", "-u", "origin", "feat")
      run(repo, "git", "branch", "--unset-upstream")
      writeFileSync(join(repo, "a.txt"), "b\n")
      run(repo, "git", "commit", "-qam", "ahead")
      writeRecord(repo)
      const result = reviewStatus(repo)
      expect(result.ok).toBe(false)
      expect(result.message).toContain("refs/remotes/origin/feat")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
