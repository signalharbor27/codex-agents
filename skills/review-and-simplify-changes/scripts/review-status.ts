#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

type Result = { ok: true; message: string } | { ok: false; message: string }

const run = (dir: string, ...args: string[]) => {
  const result = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" })
  return result.status === 0 ? result.stdout.trim() : undefined
}

const clean = (dir: string) => spawnSync("git", ["-C", dir, "diff", "--quiet", "HEAD", "--"], { encoding: "utf8" }).status === 0

const recordSyntax = "bash <review skill dir>/scripts/record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n> --rounds <n> --leads <n>"

/** Check the exact snapshot and review state that the PR publish guard will require. */
export function reviewStatus(dir = process.cwd()): Result {
  const root = run(dir, "rev-parse", "--show-toplevel")
  if (!root) return { ok: false, message: `review-status: ${dir} is not a git checkout` }
  const head = run(root, "rev-parse", "HEAD")
  const tree = run(root, "rev-parse", "HEAD^{tree}")
  const common = run(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
  if (!head || !tree || !common) return { ok: false, message: "review-status: could not resolve HEAD or the git common directory" }
  if (!clean(root)) {
    return { ok: false, message: `review-status: ${root} has tracked changes; commit the reviewed state before publishing` }
  }

  const recordPath = join(common, "agent-review", `${tree}.json`)
  if (!existsSync(recordPath)) {
    return {
      ok: false,
      message: `review-status: no review record covers HEAD tree ${tree}; finish the review loop, then run: ${recordSyntax}`,
    }
  }
  try {
    const record = JSON.parse(readFileSync(recordPath, "utf8")) as { tree?: unknown; open_findings?: unknown }
    if (record.tree !== tree || record.open_findings !== 0) {
      return { ok: false, message: `review-status: ${recordPath} does not record tree ${tree} with 0 open findings` }
    }
  } catch {
    return { ok: false, message: `review-status: ${recordPath} is not valid JSON; rewrite the review record` }
  }

  const upstream = run(root, "rev-parse", "--verify", "--quiet", "@{u}")
  if (upstream && upstream !== head) {
    return { ok: false, message: `review-status: HEAD ${head} differs from upstream ${upstream}; push the reviewed commit before publishing` }
  }
  const branch = run(root, "symbolic-ref", "--quiet", "--short", "HEAD") ?? "(detached HEAD)"
  return { ok: true, message: `review-status: ready to publish ${branch} at HEAD ${head} (tree ${tree})` }
}

if (import.meta.main) {
  const result = reviewStatus(process.argv[2] ?? process.cwd())
  console.log(result.message)
  process.exit(result.ok ? 0 : 1)
}
