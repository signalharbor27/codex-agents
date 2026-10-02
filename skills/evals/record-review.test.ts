import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const script = join(import.meta.dir, "../review-and-simplify-changes/scripts/record-review.sh")
const sh = (cwd: string, cmd: string[]) => spawnSync(cmd[0]!, cmd.slice(1), { cwd, encoding: "utf8" })
const git = (cwd: string, ...args: string[]) => {
  const result = sh(cwd, ["git", ...args])
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}
const record = (cwd: string, ...args: string[]) => sh(cwd, ["bash", script, ...args])
const withRepo = (body: (repo: string) => void, objectFormat: "sha1" | "sha256" = "sha1") => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "record-review-")))
  try {
    git(repo, "init", "-q", "-b", "main", `--object-format=${objectFormat}`)
    git(repo, "config", "user.email", "t@example.com")
    git(repo, "config", "user.name", "T")
    writeFileSync(join(repo, "a.txt"), "a\n")
    git(repo, "add", ".")
    git(repo, "commit", "-qm", "base")
    writeFileSync(join(repo, "a.txt"), "b\n")
    git(repo, "commit", "-qam", "change")
    body(repo)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
}

const sha = (repo: string, rev = "HEAD") => git(repo, "rev-parse", rev)
/** Valid flags for the commit at HEAD, pinned by its full sha. */
const okFor = (repo: string) => ["--reviewed", sha(repo), "--reviewers", "reviewer", "--open-findings", "0"]

describe("record-review.sh", () => {
  test("writes the contract record for the HEAD tree under the common git dir", () => withRepo(repo => {
    const result = record(repo, "HEAD~1", "--reviewed", sha(repo), "--reviewers", "reviewer,fast_reviewer", "--open-findings", "0", "--door", "two-way", "--blast-radius", "localized", "--copy-humanized")
    expect(result.stderr).toBe("")
    expect(result.status).toBe(0)
    const tree = git(repo, "rev-parse", "HEAD^{tree}")
    const path = result.stdout.trim()
    expect(path).toBe(join(repo, ".git/agent-review", `${tree}.json`))
    const json = JSON.parse(readFileSync(path, "utf8"))
    expect(json).toEqual({
      tree,
      head: git(repo, "rev-parse", "HEAD"),
      base: git(repo, "rev-parse", "HEAD~1"),
      reviewed_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
      reviewers: ["reviewer", "fast_reviewer"],
      open_findings: 0,
      copy_humanized: "yes",
      door: "two-way",
      blast_radius: "localized",
    })
  }))

  test("defaults copy_humanized to n/a, door and blast_radius to null, and records open findings", () => withRepo(repo => {
    const json = JSON.parse(readFileSync(record(repo, "main", "--reviewed", sha(repo), "--reviewers", "reviewer", "--open-findings", "2").stdout.trim(), "utf8"))
    expect(json).toMatchObject({ copy_humanized: "n/a", open_findings: 2, door: null, blast_radius: null })
  }))

  test("accepts a reviewed commit or tree with the same tree as HEAD and refuses a different tree", () => withRepo(repo => {
    const reviewed = sha(repo)
    git(repo, "commit", "-q", "--amend", "-m", "reworded")
    const ok = okFor(repo)
    expect(record(repo, "main", ...ok.with(1, reviewed)).status).toBe(0)
    expect(record(repo, "main", ...ok.with(1, sha(repo, "HEAD^{tree}"))).status).toBe(0)
    const refused = record(repo, "main", ...ok.with(1, sha(repo, "HEAD~1")))
    expect(refused).toMatchObject({ status: 1, stdout: "" })
    expect(refused.stderr).toContain("is not this checkout's HEAD tree")
    expect(record(repo, "main", ...ok.with(1, "0".repeat(40)))).toMatchObject({ status: 1, stderr: expect.stringContaining("not a commit or tree") })
    expect(record(repo, "main", ...ok.with(1, sha(repo, "HEAD:a.txt"))).status).toBe(1)
  }))

  test("refuses a symbolic or abbreviated --reviewed and says to pass the snapshot sha", () => withRepo(repo => {
    const ok = okFor(repo)
    for (const rev of ["HEAD", "main", "HEAD~0", sha(repo).slice(0, 12), sha(repo).toUpperCase()]) {
      const refused = record(repo, "main", ...ok.with(1, rev))
      expect({ rev, status: refused.status, stdout: refused.stdout }).toEqual({ rev, status: 2, stdout: "" })
      expect(refused.stderr).toContain("commit the reviewed snapshot and pass its sha")
    }
  }))

  test("--reviewed must be exactly the repository's object id length", () => {
    withRepo(repo => {
      const ok = okFor(repo)
      const refused = record(repo, "main", ...ok.with(1, sha(repo) + "0".repeat(24)))
      expect(refused).toMatchObject({ status: 2, stdout: "" })
      expect(refused.stderr).toContain("full 40-character")
    })
    withRepo(repo => {
      const ok = okFor(repo)
      expect(sha(repo)).toHaveLength(64)
      expect(record(repo, "main", ...ok)).toMatchObject({ status: 0, stderr: "" })
      const refused = record(repo, "main", ...ok.with(1, sha(repo).slice(0, 40)))
      expect(refused).toMatchObject({ status: 2, stdout: "" })
      expect(refused.stderr).toContain("full 64-character")
    }, "sha256")
  })

  test("--open-findings rejects values past 9 digits, including 2^64, instead of wrapping", () => withRepo(repo => {
    const ok = okFor(repo)
    for (const n of ["18446744073709551616", "1000000000", "-1"]) {
      const refused = record(repo, "main", ...ok.with(5, n))
      expect({ n, status: refused.status, stdout: refused.stdout }).toEqual({ n, status: 2, stdout: "" })
      expect(refused.stderr).toContain("at most 9 digits")
    }
    const json = JSON.parse(readFileSync(record(repo, "main", ...ok.with(5, "999999999")).stdout.trim(), "utf8"))
    expect(json.open_findings).toBe(999999999)
  }))

  test("a linked worktree writes to the shared common dir", () => withRepo(repo => {
    const linked = `${repo}-linked`
    try {
      git(repo, "worktree", "add", "-q", linked, "-b", "side")
      const path = record(linked, "main", ...okFor(linked)).stdout.trim()
      expect(path.startsWith(join(repo, ".git/agent-review/"))).toBe(true)
    } finally {
      rmSync(linked, { recursive: true, force: true })
    }
  }))

  test("refuses uncommitted tracked changes, staged changes, and bad refs", () => withRepo(repo => {
    const ok = okFor(repo)
    writeFileSync(join(repo, "a.txt"), "dirty\n")
    expect(record(repo, "HEAD~1", ...ok)).toMatchObject({ status: 1, stdout: "" })
    git(repo, "add", "a.txt")
    expect(record(repo, "HEAD~1", ...ok)).toMatchObject({ status: 1, stdout: "" })
    git(repo, "reset", "-q", "--hard")
    expect(record(repo, "no-such-ref", ...ok).status).toBe(1)
  }))

  test("rejects missing or invalid arguments with usage status 2", () => withRepo(repo => {
    const ok = okFor(repo)
    const without = (flag: string) => ok.filter((_, i) => i !== ok.indexOf(flag) && i !== ok.indexOf(flag) + 1)
    for (const args of [
      [],
      ["HEAD~1"],
      without("--reviewed"),
      without("--open-findings"),
      without("--reviewers"),
      ok.with(3, "Reviewer"),
      ok.with(5, "x"),
      [...ok, "--door", "two-way"],
      [...ok, "--blast-radius", "localized"],
      [...ok, "--door", "sideways", "--blast-radius", "localized"],
      [...ok, "--door", "one-way", "--blast-radius", "galaxy"],
      [...ok, "--bogus"],
    ]) {
      expect({ args, status: record(repo, "HEAD~1", ...args).status }).toEqual({ args, status: 2 })
    }
    expect(record(repo).status).toBe(2)
  }))
})
