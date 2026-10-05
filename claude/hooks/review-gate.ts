#!/usr/bin/env bun
// Claude Code PreToolUse Bash hook. Denies publishing a PR for review (`gh pr ready`, non-draft
// `gh pr create`/`gh pr new`, `gh api` POST to repos/*/pulls without draft=true, and the graphql
// markPullRequestReadyForReview mutation) unless the checkout's HEAD tree has a review record with
// 0 open findings, HEAD matches its upstream (or refs/remotes/<push remote>/<branch> without one),
// and any PR selector, --head (with its owner), or -R/--repo (with its host) names this checkout's
// branch or PR. A real push of HEAD or the current branch joined by `&&` before the publish stands in
// for the upstream match; a commit, merge, rebase, reset, cherry-pick, am, revert, or pull earlier in
// the same command blocks it. `--help` is free. `./shell.ts` finds the commands. Malformed input and
// hook errors allow with a stderr note. Q turns the gate off with AGENT_REVIEW_GATE=off in the Claude
// Code environment.
// Scope: an accident guardrail, not a security boundary. It does not decode obfuscated commands:
// printf-decoded or base64 scripts piped to a shell, `env -S` strings, a graphql query read from a
// file or `@-` (`-F query=@q.graphql`), and interpreter one-liners (python -c, node -e) are not read.
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve as resolvePath } from "node:path"
import { type Command, commands, gh, ghApi } from "./shell.ts"

export const recordSyntax = "bash <review skill dir>/scripts/record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n> [--door one-way|two-way --blast-radius localized|service|customers|data] [--copy-humanized]"

/** A command that publishes a PR for review, with whatever names its target. */
export type Publish = {
  action: string
  repo?: string
  /** GitHub host from GH_HOST or `gh api --hostname`; github.com when unset. */
  host?: string
  /** `gh pr ready` argument: a number, a PR URL, or a branch. */
  selector?: string
  /** Head branch from --head or the API `head` field; null when the API call names none. */
  head?: string | null
  /** True when the target cannot be bound to a checkout without a lookup the hook does not make. */
  unbound?: boolean
}

const createValues = new Set(["-t", "--title", "-b", "--body", "-F", "--body-file", "-B", "--base", "-H", "--head", "-a", "--assignee", "-l", "--label", "-m", "--milestone", "-p", "--project", "-r", "--reviewer", "-R", "--repo", "-T", "--template", "--recover"])
const pullsEndpoint = /^\/?repos\/([^/]+)\/([^/]+)\/pulls\/?$/

/** Splits `--flag=value` and `-Fvalue`, and reads `--flag value` for flags in `values`. */
function options(args: string[], values: Set<string>): { flags: Map<string, string>; positional: string[] } {
  const flags = new Map<string, string>()
  const positional: string[] = []
  for (let j = 0; j < args.length; j++) {
    const arg = args[j]!
    const inline = /^(--[\w-]+)=(.*)$/s.exec(arg) ?? /^(-[A-Za-z])(.+)$/s.exec(arg)
    if (inline && (inline[1]!.startsWith("--") || values.has(inline[1]!))) flags.set(inline[1]!, inline[2]!)
    else if (values.has(arg)) flags.set(arg, args[++j] ?? "")
    else if (arg.startsWith("-")) flags.set(arg, "")
    else positional.push(arg)
  }
  return { flags, positional }
}

/** The publish this command performs, or undefined for anything else. */
export function publishOf(command: Command): Publish | undefined {
  const call = gh(command)
  if (!call) return
  const [group, action, ...rest] = call.words
  const help = (flags: Map<string, string>) => flags.has("-h") || flags.has("--help")
  if (group === "pr" && action === "ready") {
    const { flags, positional } = options(rest, new Set(["-R", "--repo"]))
    if (flags.has("--undo") || help(flags)) return
    return { action: "gh pr ready", repo: flags.get("-R") ?? flags.get("--repo") ?? call.repo, host: call.host, selector: positional[0] }
  }
  if (group === "pr" && (action === "create" || action === "new")) {
    const { flags } = options(rest, createValues)
    if (help(flags) || flags.has("-d") || flags.has("--dry-run") || (flags.has("--draft") && flags.get("--draft") !== "false")) return
    return { action: `gh pr ${action}`, repo: flags.get("-R") ?? flags.get("--repo") ?? call.repo, host: call.host, head: flags.get("-H") ?? flags.get("--head") }
  }
  if (group !== "api") return
  const api = ghApi(call.words.slice(1))
  if (api.help) return
  const text = [...api.fields, ...(api.input ? [command.stdin] : [])].join("\n")
  if (api.endpoint === "graphql" && /markPullRequestReadyForReview/.test(text)) return { action: "graphql markPullRequestReadyForReview", unbound: true }
  const pulls = api.endpoint ? pullsEndpoint.exec(api.endpoint) : null
  if (!pulls || api.method !== "POST") return
  if (api.fields.includes("draft=true") || (api.input && /"draft"\s*:\s*true/.test(command.stdin))) return
  const head = api.fields.find(f => f.startsWith("head="))?.slice(5) ?? (api.input ? /"head"\s*:\s*"([^"]+)"/.exec(command.stdin)?.[1] : undefined)
  const repo = pulls[1] === "{owner}" ? undefined : `${pulls[1]}/${pulls[2]}`
  return { action: "gh api POST repos/*/pulls", repo, host: api.hostname ?? call.host, head: head ?? null }
}

/** Looks up a PR's head commit: one REST call, run from `dir`. `repo` is OWNER/REPO, or undefined for this checkout's repo. */
export type ResolvePrHead = (dir: string, repo: string | undefined, number: string) => string | undefined

export const resolvePrHead: ResolvePrHead = (dir, repo, number) => {
  const result = spawnSync("gh", ["api", `repos/${repo ?? "{owner}/{repo}"}/pulls/${number}`, "--jq", ".head.sha"], { cwd: dir, encoding: "utf8", timeout: 15_000 })
  const sha = result.status === 0 ? result.stdout.trim() : ""
  return /^[0-9a-f]{40,64}$/.test(sha) ? sha : undefined
}

const git = (dir: string, ...args: string[]) => {
  const result = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" })
  return result.status === 0 ? result.stdout.trim() : undefined
}

/** A hosted repository. `host` is undefined for an ssh alias such as `work:o/r`, which hides the real host. */
type Repo = { name: string; host?: string; owner: string; repo: string }

/** Reads `host:owner/repo`, `user@host:owner/repo`, or `scheme://[user@]host[:port]/owner/repo`; local paths give undefined. */
function parseRemote(name: string, url: string): Repo | undefined {
  const m = /^(?:[a-z+]+:\/\/)?(?:[^@/\s]+@)?([^/:\s]+)(?::\d+)?[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(url)
  if (!m || url.startsWith("/") || url.startsWith(".") || /^file:/i.test(url)) return
  return { name, host: m[1]!.includes(".") ? m[1]!.toLowerCase() : undefined, owner: m[2]!.toLowerCase(), repo: m[3]!.toLowerCase() }
}

/** Hosted repositories among the checkout's remotes. */
function remotes(dir: string): Repo[] {
  return (git(dir, "remote", "-v") ?? "").split("\n").flatMap(line => {
    const [name, url] = line.split(/\s+/)
    const parsed = name && url ? parseRemote(name, url) : undefined
    return parsed ? [parsed] : []
  })
}

/** Host, owner, and repo from `OWNER/REPO`, `HOST/OWNER/REPO`, or a URL; `host` defaults to github.com. */
function target(repo: string, host = "github.com"): { host: string; owner: string; repo: string } {
  const parts = repo.replace(/^[a-z]+:\/\//i, "").replace(/\.git$/, "").split("/").filter(Boolean)
  const [owner = "", name = ""] = parts.slice(-2).map(part => part.toLowerCase())
  return { host: (parts.length > 2 ? parts[0]! : host).toLowerCase(), owner, repo: name }
}

/** Whether a remote of the checkout is `repo` on `host`. An ssh alias remote matches any host. */
const isRemote = (all: Repo[], repo: string, host?: string) => {
  const want = target(repo, host)
  return all.some(r => r.owner === want.owner && r.repo === want.repo && (r.host === undefined || r.host === want.host))
}

type Checkout = { dir: string; tree: string; head: string }

const branchOf = (dir: string) => git(dir, "symbolic-ref", "--quiet", "--short", "HEAD")
const toplevel = (dir: string) => git(dir, "rev-parse", "--show-toplevel")
const pushValues = new Set(["-o", "--push-option", "--receive-pack", "--exec", "--repo"])
const notPushing = /^(?:-n|--dry-run|-d|--delete|--all|--branches|--mirror|--tags|--prune|-[a-zA-Z]*[nd][a-zA-Z]*)$/

/** A `git` command's subcommand and arguments, with the directory `-C` selects; `dir` is undefined
 * when it is unknown (a variable, --git-dir/--work-tree, or an unknown cwd). */
function gitCall(command: Command): { dir?: string; sub?: string; args: string[] } | undefined {
  if (command.name !== "git") return
  let dir = command.ctx.cwd
  let i = 0
  const args = command.args
  for (; i < args.length && args[i]!.startsWith("-"); i++) {
    const arg = args[i]!
    if (arg === "-C") {
      const to = args[++i]
      dir = to === undefined || /[$`~]/.test(to) || dir === undefined ? undefined : resolvePath(dir, to)
    } else if (arg === "-c") i++
    else if (/^--(?:git-dir|work-tree)(?:=|$)/.test(arg)) dir = undefined
  }
  return { dir, sub: args[i], args: args.slice(i + 1) }
}

// Subcommands that move HEAD to a commit the review did not see.
const movesHead = new Set(["commit", "merge", "rebase", "reset", "cherry-pick", "am", "revert", "pull", "switch", "checkout"])
// checkout/switch options that create a branch, and other options that take a separate value.
const createsBranch = /^(?:-[bBcC]|--create|--force-create)$/
const switchValues = new Set(["--orphan", "--conflict", "--pathspec-from-file"])

/** Whether a `git checkout` or `git switch` leaves HEAD's commit alone: a path restore
 * (`checkout [<tree-ish>] -- <path>`), or a new branch created at HEAD without a start point. */
function keepsHead(sub: string, args: string[]): boolean {
  if (sub !== "checkout" && sub !== "switch") return false
  if (sub === "checkout" && args.includes("--")) return true
  let created = false
  let startPoint = false
  for (let j = 0; j < args.length; j++) {
    const arg = args[j]!
    if (createsBranch.test(arg) || switchValues.has(arg)) {
      created ||= createsBranch.test(arg)
      j++
    } else if (!arg.startsWith("-")) startPoint = true
  }
  return created && !startPoint
}

/** The directory whose current branch this `git push` publishes, or undefined when it is not a real
 * push of HEAD or the current branch: a dry run, a delete, --all/--mirror/--tags, or another refspec. */
export function pushDir(command: Command): string | undefined {
  const call = gitCall(command)
  if (call?.sub !== "push" || call.dir === undefined) return
  const dir = call.dir
  const { flags, positional } = options(call.args, pushValues)
  if ([...flags.keys()].some(flag => notPushing.test(flag))) return
  const refspecs = positional.slice(1)
  if (refspecs.length === 0) return dir
  const branch = branchOf(dir)
  const ours = (ref: string | undefined, head: boolean) => (head && ref === "HEAD") || (branch !== undefined && (ref === branch || ref === `refs/heads/${branch}`))
  const all = refspecs.every(spec => {
    const [src, dst, extra] = spec.replace(/^\+/, "").split(":")
    return extra === undefined && ours(src, true) && (dst === undefined || ours(dst, false))
  })
  return all ? dir : undefined
}

/** The commit HEAD must match: `@{u}`, or without one refs/remotes/<push remote>/<branch> when it exists. */
function upstreamOf(dir: string): { name: string; sha: string } | undefined {
  const upstream = git(dir, "rev-parse", "--verify", "--quiet", "@{u}")
  if (upstream) return { name: "its upstream", sha: upstream }
  const branch = branchOf(dir)
  if (!branch) return
  const remote = git(dir, "config", `branch.${branch}.pushRemote`) ?? git(dir, "config", "remote.pushDefault") ?? "origin"
  const ref = `refs/remotes/${remote}/${branch}`
  const sha = git(dir, "rev-parse", "--verify", "--quiet", ref)
  return sha ? { name: ref, sha } : undefined
}

/** Deny reason for one publish, or undefined when every condition holds. */
export function checkPublish(publish: Publish, dir: string | undefined, pushedDirs: string[], resolve: ResolvePrHead): string | undefined {
  const fromCheckout = `run it from the PR's checkout, or open the PR as a draft.`
  if (!dir || !existsSync(dir)) return `Blocked: ${publish.action} needs a known checkout, and the hook could not tell which directory it runs in; ${fromCheckout}`
  const tree = git(dir, "rev-parse", "HEAD^{tree}")
  const head = git(dir, "rev-parse", "HEAD")
  if (!tree || !head) return `Blocked: ${publish.action} runs in ${dir}, which is not a git checkout with a commit; ${fromCheckout}`
  const at: Checkout = { dir, tree, head }
  const where = `Checked ${dir} at HEAD tree ${tree}.`

  if (!recorded(at)) return `Blocked: ${publish.action} needs a review record with 0 open findings for this tree. ${where} Finish the review-and-simplify-changes loop on the committed state, then write the review record first from that checkout: ${recordSyntax}. After it succeeds, publish in a separate tool call; this hook checks before any command in the call runs. Or open the PR as a draft.`

  const upstream = upstreamOf(dir)
  const pushed = () => pushedDirs.some(pushedDir => toplevel(pushedDir) === toplevel(dir))
  if (upstream && upstream.sha !== head && !pushed()) return `Blocked: ${publish.action} would publish a PR whose head may differ from the reviewed commit. ${where} HEAD ${head} differs from ${upstream.name} ${upstream.sha}; push the reviewed commit first: push in its own command or without a pipe, then publish.`

  const mismatch = binding(publish, at, resolve)
  if (mismatch) return `Blocked: ${publish.action} ${mismatch}. ${where} The review record covers only this checkout's branch and PR; ${fromCheckout}`
}

function recorded({ dir, tree }: Checkout): boolean {
  const common = git(dir, "rev-parse", "--path-format=absolute", "--git-common-dir")
  const path = common && join(common, "agent-review", `${tree}.json`)
  if (!path || !existsSync(path)) return false
  try {
    const record = JSON.parse(readFileSync(path, "utf8")) as { tree?: unknown; open_findings?: unknown }
    return record.tree === tree && record.open_findings === 0
  } catch {
    return false
  }
}

/** Why the publish target is not this checkout's branch or PR, or undefined when it is. */
function binding(publish: Publish, at: Checkout, resolve: ResolvePrHead): string | undefined {
  if (publish.unbound) return "names its PR by node ID, which the hook does not resolve; use `gh pr ready` instead"
  const all = remotes(at.dir)
  if (publish.repo && !isRemote(all, publish.repo, publish.host)) return `targets ${publish.repo}, which is not a remote of this checkout`
  const branch = branchOf(at.dir)
  const sameBranch = (name: string) => branch !== undefined && name.replace(/^[^:]+:/, "") === branch
  if (publish.head === null) return "names no head branch"
  if (publish.head !== undefined && !sameBranch(publish.head)) return `names head ${publish.head}, not the current branch ${branch ?? "(detached)"}`
  const owner = publish.head?.includes(":") ? publish.head.split(":")[0]!.toLowerCase() : undefined
  const pushOwners = owner === undefined ? [] : headOwners(at.dir, branch, all)
  if (owner !== undefined && !pushOwners.includes(owner)) return `names head owner ${owner}, but this branch pushes to ${pushOwners.join(" or ") || "no hosted remote"}`
  const selector = publish.selector
  if (selector === undefined) return
  const url = /^https?:\/\/([^/]+)\/([^/]+\/[^/]+)\/pull\/(\d+)/.exec(selector)
  if (url && !isRemote(all, `${url[1]}/${url[2]}`)) return `targets ${url[1]}/${url[2]}, which is not a remote of this checkout`
  const number = url?.[3] ?? (/^#?(\d+)$/.exec(selector)?.[1])
  if (number === undefined) return sameBranch(selector) ? undefined : `names branch ${selector}, not the current branch ${branch ?? "(detached)"}`
  const sha = resolve(at.dir, url?.[2] ?? publish.repo, number)
  const prTree = sha && git(at.dir, "rev-parse", "--verify", "--quiet", `${sha}^{tree}`)
  if (!prTree) return `names PR ${number}, whose head commit could not be looked up here`
  if (prTree !== at.tree) return `names PR ${number}, whose head tree ${prTree} is not this checkout's tree`
}

/** Owners the current branch's head can live under: the owner of its push remote, or of every
 * hosted remote when the push remote is a local path. */
function headOwners(dir: string, branch: string | undefined, all: Repo[]): string[] {
  const config = (key: string) => git(dir, "config", key)
  const name = (branch && (config(`branch.${branch}.pushRemote`) ?? config("remote.pushDefault") ?? config(`branch.${branch}.remote`))) || "origin"
  const pushTo = all.filter(r => r.name === name)
  return [...new Set((pushTo.length ? pushTo : all).map(r => r.owner))]
}

/** Deny reason for the first publish in `command` that fails its checks, or undefined. */
export function denyReason(command: string, cwd: string, resolve: ResolvePrHead = resolvePrHead, home = homedir()): string | undefined {
  // Directories pushed earlier in an unbroken `&&` chain: those pushes succeeded before the publish runs.
  let pushedDirs: string[] = []
  // A commit, merge, or other HEAD move earlier in the command: the record cannot cover its result.
  let moved: string | undefined
  for (const found of commands(command, { cwd, home, remote: false })) {
    if (!found.chained) pushedDirs = []
    if (found.ctx.remote || found.ctx.container) continue
    const call = gitCall(found)
    if (call?.sub && movesHead.has(call.sub) && !keepsHead(call.sub, call.args) && !call.args.some(arg => arg === "-h" || arg === "--help")) moved ??= `git ${call.sub}`
    const pushed = pushDir(found)
    if (pushed) pushedDirs.push(pushed)
    const publish = publishOf(found)
    if (publish && moved) return `Blocked: ${publish.action} runs after ${moved} in the same command, so it would publish a commit the review record does not cover. Commit, record the review, then publish in a separate command.`
    const reason = publish && checkPublish(publish, found.ctx.cwd, pushedDirs, resolve)
    if (reason) return reason
  }
}

type HookInput = { tool_name?: string; cwd?: string; tool_input?: { command?: unknown } }

/** Returns the JSON line to print, if any. */
export function handle(input: HookInput | null, env: Record<string, string | undefined> = process.env, resolve: ResolvePrHead = resolvePrHead): string | undefined {
  const command = input?.tool_input?.command
  if (env.AGENT_REVIEW_GATE === "off" || input?.tool_name !== "Bash" || typeof command !== "string") {
    if (input?.tool_name === "Bash" && typeof command !== "string") console.error("review-gate: no string tool_input.command; allowing")
    return
  }
  const reason = denyReason(command, input.cwd ?? process.cwd(), resolve, env.HOME ?? homedir())
  if (!reason) return
  return JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } })
}

if (import.meta.main) {
  try {
    const parsed: unknown = JSON.parse(await Bun.stdin.text())
    if (!parsed || typeof parsed !== "object") console.error("review-gate: hook input is not an object; allowing")
    else {
      const output = handle(parsed as HookInput)
      if (output) console.log(output)
    }
  } catch (error) {
    console.error(`review-gate: ${error instanceof Error ? error.message : String(error)}; allowing`)
  }
  process.exit(0)
}
