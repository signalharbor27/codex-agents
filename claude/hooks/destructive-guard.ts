#!/usr/bin/env bun
// Claude Code PreToolUse hook for Bash. Denies commands that destroy data or live permissions:
// Redis FLUSHALL/FLUSHDB anywhere; SQL DROP DATABASE/DROP SCHEMA/TRUNCATE (and dropdb) and recursive
// rm outside a local scratch container; Discord permission and role writes; GitHub branch-protection
// and collaborator writes; and, on this host, recursive rm outside git work trees and temp
// directories. A container is local scratch when the same command starts it with `docker run` and a
// `*.worktree` label, or when `docker inspect` shows such a label; the hook inspects a container at
// most once, and only after a SQL or rm check matched. `./shell.ts` finds the commands.
// SQL is judged at statement starts in the client's SQL option and stdin; Redis by its command verb;
// rm targets after symlinks resolve, with a whole-directory glob judged as the directory; HTTP writes
// per URL, with Discord rules for Discord hosts and hosts hidden in a variable.
// Scope: an accident guardrail, not a security boundary. Malformed hook input is allowed with a
// stderr note. It does not decode obfuscated commands: printf-decoded or base64 scripts piped to a
// shell, `env -S` strings, SQL hidden in dynamic SQL or split by tricks beyond comments (`DROP/**/SCHEMA`
// reads as `DROP SCHEMA`), and interpreter one-liners (python -c, node -e) are not read. xargs
// operands are known only from echo/printf/heredoc input; `find ... | xargs rm -rf` is not judged.
// Q overrides it by starting Claude Code with AGENT_DESTRUCTIVE_OK=1 in the environment; a command
// that sets the variable itself does not count.
import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, realpathSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, resolve, sep } from "node:path"
import { type Command, commands, type Context, expandHome, gh, ghApi, runOptions } from "./shell.ts"

const askQ = "Ask Q first; Q can set AGENT_DESTRUCTIVE_OK=1 in the Claude Code environment to allow it."
const scratchHint = "Run it in a scratch container started with `docker run --label <project>.worktree=<path>`, or"

const sqlClients = new Set(["psql", "pgcli", "mysql", "mariadb", "clickhouse-client", "clickhouse", "cockroach", "usql"])
const httpClients = new Set(["curl", "http", "https", "xh", "xhs", "wget"])
// Commands that start the payload after a `docker run` image; text-only commands are absent so a
// word in a message or search never starts a check.
const runCommands = new Set(["redis-cli", "dropdb", "rm", "gh", "sh", "bash", "zsh", "dash", "ksh", ...sqlClients, ...httpClients])

/** Label keys of a running container, or undefined when the lookup fails. */
export type Inspect = (engine: string, container: string) => string[] | undefined

export type Host = {
  cwd?: string
  home?: string
  /** Git toplevel of the work tree holding `path` (an existing ancestor decides), or undefined. */
  toplevel: (path: string) => string | undefined
  /** Temp directories whose contents, not the directories themselves, may be removed. Canonical paths. */
  tempRoots: string[]
  /** The canonical path of an existing path, or undefined when it does not exist. */
  realpath: (path: string) => string | undefined
  inspect: Inspect
}

const quote = (word: string) => `'${word.replaceAll("'", `'\\''`)}'`

/** Reads label keys with `<engine> inspect`. When the hook user lacks docker access, retries once through `sg docker`. */
export const inspectLabels: Inspect = (engine, container) => {
  if (!/^[A-Za-z0-9][\w.-]*$/.test(container)) return
  const args = ["inspect", "--type", "container", "--format", "{{json .Config.Labels}}", container]
  const options = { encoding: "utf8", timeout: 5_000 } as const
  let result = spawnSync(engine, args, options)
  if (result.status !== 0 && engine === "docker" && /permission denied/i.test(result.stderr ?? ""))
    result = spawnSync("sg", ["docker", "-c", [engine, ...args].map(quote).join(" ")], options)
  if (result.status !== 0) return
  try {
    const labels: unknown = JSON.parse(result.stdout)
    return labels && typeof labels === "object" ? Object.keys(labels) : []
  } catch {
    return
  }
}

const toplevels = new Map<string, string | undefined>()

/** Git toplevel for `path`, from its nearest existing ancestor directory, cached per directory. */
export function gitToplevel(path: string): string | undefined {
  let at = path
  while (!existsSync(at) && dirname(at) !== at) at = dirname(at)
  if (!lstatSync(at).isDirectory()) at = dirname(at)
  if (!toplevels.has(at)) {
    const git = spawnSync("git", ["-C", at, "rev-parse", "--show-toplevel"], { encoding: "utf8" })
    toplevels.set(at, git.status === 0 ? git.stdout.trim() : undefined)
  }
  return toplevels.get(at)
}

export const realpath = (path: string) => {
  try {
    return realpathSync(path)
  } catch {
    return undefined
  }
}

export const defaultTempRoots = () => [...new Set(["/tmp", resolve(tmpdir())].map(root => realpath(root) ?? root))]

/** Returns the deny reason for a Bash command, or undefined to allow it. */
export function denyReason(command: string, host: Host): string | undefined {
  const started = new Set<string>()
  const inspected = new Map<string, string[] | undefined>()
  for (const found of commands(command, { cwd: host.cwd, home: host.home, remote: false }, { runCommands })) {
    if ((found.name === "docker" || found.name === "podman") && found.args[0] === "run") {
      const run = runOptions(found.args.slice(1))
      if (run.name && run.worktreeLabel && !found.ctx.remote) started.add(`${found.name}:${run.name}`)
    }
    const reason = check(found, host)
    if (!reason) continue
    const scratchable = sqlClients.has(found.name) || found.name === "dropdb" || found.name === "rm"
    if (!scratchable || found.ctx.container !== "exec" || found.ctx.remote) return `${reason} ${askQ}`
    const why = notScratch(found.ctx, started, inspected, host.inspect)
    if (why) return `${reason} ${why} ${scratchHint} ${askQ.replace(/^A/, "a")}`
  }
}

/** Why an exec target is not a local scratch container, or undefined when it is. */
function notScratch(ctx: Context, started: Set<string>, inspected: Map<string, string[] | undefined>, inspect: Inspect): string | undefined {
  const target = ctx.target
  if (!target) return "It runs in a compose service, which the hook does not inspect."
  const key = `${target.engine}:${target.name}`
  if (started.has(key)) return
  if (!inspected.has(key)) inspected.set(key, inspect(target.engine, target.name))
  const labels = inspected.get(key)
  if (labels === undefined) return `\`${target.engine} inspect ${target.name}\` failed, so the hook cannot tell that it is a scratch container.`
  if (!labels.some(label => label.endsWith(".worktree"))) return `Container ${target.name} has no label ending in .worktree, so it is not a scratch container.`
}

/** The deny reason without the closing "Ask Q" sentence, or undefined. */
function check(command: Command, host: Host): string | undefined {
  const { name, args, stdin, ctx } = command
  if (name === "redis-cli") return redis(args, stdin)
  if (sqlClients.has(name) || name === "dropdb") return ctx.container === "scratch" && !ctx.remote ? undefined : sql(name, args, stdin)
  if (httpClients.has(name)) return http(name, args, stdin)
  if (name === "gh") return githubApi(command)
  if (name === "rm" && (ctx.container !== "scratch" || ctx.remote)) return removal(args, ctx, host)
}

// redis-cli options that take a value; the command verb is the first other argument.
const redisValues = new Set(["-h", "-p", "-s", "-a", "-u", "-n", "-r", "-i", "-d", "-D", "-X", "--user", "--pass", "--sni", "--cacert", "--cacertdir", "--cert", "--key", "--tls-ciphers", "--tls-ciphersuites", "--pattern", "--quoted-pattern", "--count", "--rdb", "--functions-rdb", "--pipe-timeout", "--memkeys-samples", "--eval", "--lru-test", "--intrinsic-latency", "--replica"])

/** Judges the verb: the first non-option argument, or without one the first word of each stdin line. */
function redis(args: string[], stdin: string): string | undefined {
  let verb: string | undefined
  for (let j = 0; j < args.length && verb === undefined; j++) {
    if (redisValues.has(args[j]!)) j++
    else if (!args[j]!.startsWith("-")) verb = args[j]
  }
  const verbs = verb === undefined ? stdin.replace(/\\n/g, "\n").split("\n").map(line => line.trim().split(/\s+/)[0] ?? "") : [verb]
  const flush = verbs.find(word => /^flush(?:all|db)$/i.test(word))
  if (flush) return `Blocked: Redis ${flush.toUpperCase()} deletes every key in the target ${/all/i.test(flush) ? "server" : "database"}, with no undo.`
}

// Options whose value is SQL text, per client: `-c SQL`, `-cSQL`, `--command SQL`, `--command=SQL`.
const sqlOptions: Record<string, string[]> = {
  psql: ["-c", "--command"],
  usql: ["-c", "--command"],
  pgcli: ["-c", "--command"],
  mysql: ["-e", "--execute"],
  mariadb: ["-e", "--execute"],
  cockroach: ["-e", "--execute"],
  "clickhouse-client": ["-q", "--query"],
  clickhouse: ["-q", "--query"],
}

/** SQL text the client runs: its SQL option values and stdin. The short SQL letter may close a
 * combined flag word (`-tAc`, `-Bse`), taking the next argument, or sit mid-word (`-tAcSQL`),
 * taking the rest of the word. */
function sqlText(cmd: string, args: string[], stdin: string): string[] {
  const names = sqlOptions[cmd] ?? []
  const texts = [stdin]
  for (let j = 0; j < args.length; j++) {
    const arg = args[j]!
    for (const name of names) {
      const short = name.startsWith("--") ? undefined : new RegExp(`^-[A-Za-z]*?${name[1]}(.*)$`, "s").exec(arg)
      if (arg === name || short?.[1] === "") texts.push(args[++j] ?? "")
      else if (short) texts.push(short[1]!.replace(/^=/, ""))
      else if (arg.startsWith(`${name}=`)) texts.push(arg.slice(name.length + 1))
      else continue
      break
    }
  }
  return texts
}

/** Judges statement starts only: the start of the text or after `;` or a psql backslash command,
 * with literals, quoted identifiers, and comments removed. */
function sql(cmd: string, args: string[], stdin: string): string | undefined {
  if (cmd === "dropdb") return "Blocked: dropdb deletes a database outside a local scratch container."
  for (const text of sqlText(cmd, args, stdin)) {
    const statements = text
      .replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|`[^`]*`/g, "x")
      .replace(/--[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^[ \t]*\\[^\n]*/gm, ";")
      .split(";")
    for (const statement of statements) {
      const m = /^\s*(DROP\s+(?:DATABASE|SCHEMA)|TRUNCATE)\b/i.exec(statement)
      if (m) return `Blocked: SQL ${m[1]!.replace(/\s+/g, " ").toUpperCase()} deletes data, and the target is not a local scratch container.`
    }
  }
}

// Discord channel permission overwrites, guild roles, and member role assignments.
const discordPath = /\/(?:channels|guilds)\/[^/\s?]+\/(?:permissions|roles|members\/[^/\s?]+\/roles)(?:[/?]|$)/
// POST creates a guild role.
const discordRoles = /\/guilds\/[^/\s?]+\/roles\/?(?:\?|$)/
// Channel edits can carry permission_overwrites; member edits can carry roles.
const discordChannel = /\/channels\/[^/\s?]+\/?(?:\?|$)/
const discordMember = /\/guilds\/[^/\s?]+\/members\/[^/\s?]+\/?(?:\?|$)/
// GitHub branch protection and collaborator access, as a REST path.
const githubPath = /(?:^|\/)repos\/[^/\s]+\/[^/\s]+\/(?:branches\/[^\s?]+\/protection|collaborators\/[^/\s?]+)(?:[/?]|$)/
const writes = ["PUT", "PATCH", "DELETE", "POST"]
const urlLike = /^(?:https?:\/\/|\/|[\w.-]+\.\w+(?::\d+)?\/|\$)/
// curl/wget options whose value is a request body; a value starting with `@` names a file or stdin.
const bodyOption = /^(-d|--data|--data-binary|--data-urlencode|--data-ascii|--data-raw|--json|--post-data|--body-data|--post-file|--body-file|-F|--form|-T|--upload-file)(?:=(.*))?$/s
// curl options that take a separate value, so the value is not read as a URL.
const curlValues = new Set(["-H", "--header", "-o", "--output", "-u", "--user", "-A", "--user-agent", "-e", "--referer", "-b", "--cookie", "-c", "--cookie-jar", "-m", "--max-time", "--connect-timeout", "-w", "--write-out", "-x", "--proxy", "--retry", "--cacert", "--cert", "--key", "-K", "--config", "--resolve", "--connect-to"])

/** True for discord.com and discordapp.com hosts, and for a host the hook cannot see: a `$VAR` or a bare path. */
function discordHost(url: string): boolean {
  const host = url.replace(/^https?:\/\//, "").split("/")[0] ?? ""
  return host === "" || host.includes("$") || /(?:^|\.)discord(?:app)?\.com(?::\d+)?$/i.test(host)
}

type Request = { method?: string; urls: string[]; body: string[]; opaque: boolean }

/** Method, URLs, and request body of a curl, wget, or HTTPie/xh call. An `@file` or unseen stdin body is opaque. */
function request(cmd: string, args: string[], stdin: string): Request {
  const req: Request = { urls: [], body: [], opaque: false }
  const httpie = cmd !== "curl" && cmd !== "wget"
  for (let j = 0; j < args.length; j++) {
    const arg = args[j]!
    const method = /^(?:-[a-zA-Z]*X|--request=?|--method=?)(.*)$/s.exec(arg)
    const body = bodyOption.exec(arg) ?? (/^-d(.+)$/s.exec(arg) && ["", "-d", arg.slice(2)])
    if (method) req.method = (method[1] || args[++j] || "").toUpperCase()
    else if (body) {
      const value = body[2] ?? args[++j] ?? ""
      const flag = body[1]!
      if (flag === "-T" || flag === "--upload-file") req.method ??= "PUT"
      if (flag === "-T" || flag === "--upload-file" || flag === "--post-file" || flag === "--body-file") req.opaque = true
      else if (value === "@-" && flag !== "--data-raw") stdin ? req.body.push(stdin) : (req.opaque = true)
      else if (/^@/.test(value) && flag !== "--data-raw") req.opaque = true
      else if ((flag === "-F" || flag === "--form") && /=[@<]/.test(value)) req.opaque = true
      else req.body.push(value)
      req.method ??= "POST"
    } else if (arg === "--url") req.urls.push(args[++j] ?? "")
    else if (arg.startsWith("--url=")) req.urls.push(arg.slice("--url=".length))
    else if (!httpie && curlValues.has(arg)) j++
    else if (httpie && /^(?:PUT|PATCH|DELETE|POST|GET|HEAD|OPTIONS)$/i.test(arg)) req.method = arg.toUpperCase()
    else if (!arg.startsWith("-") && urlLike.test(arg)) req.urls.push(arg)
    else if (httpie && /^[\w.-]+(?::=@|=@|@)/.test(arg)) req.opaque = true
    else if (httpie && /^[\w.\[\]-]+(?::=|==|=|:)/.test(arg)) req.body.push(arg)
  }
  // HTTPie and xh read a request body from stdin, which a dropped `< file` redirect hides.
  if (httpie && req.body.length === 0 && !req.opaque) stdin ? req.body.push(stdin) : (req.opaque = true)
  return req
}

function http(cmd: string, args: string[], stdin: string): string | undefined {
  const { method, urls, body, opaque } = request(cmd, args, stdin)
  if (!method || !writes.includes(method)) return
  const payload = body.join("\n")
  for (const url of urls) {
    if (githubPath.test(url)) return githubDeny(method, url)
    if (!discordHost(url)) continue
    if (method !== "POST" && discordPath.test(url)) return discordDeny(method, url)
    if (method === "POST" && discordRoles.test(url)) return discordDeny(method, url)
    if (method !== "PATCH" || !(discordChannel.test(url) || discordMember.test(url))) continue
    if (opaque) return `Blocked: PATCH ${url} sends a body the hook cannot inspect (a file or stdin), and channel or member edits can change live Discord permissions or roles. Pass the JSON inline.`
    if (discordChannel.test(url) && /permission_overwrites/.test(payload)) return discordDeny(method, url)
    if (discordMember.test(url) && /\broles\b/.test(payload)) return discordDeny(method, url)
  }
}

const discordDeny = (method: string, url: string) => `Blocked: ${method} ${url} changes live Discord permissions or roles.`
const githubDeny = (method: string, path: string) => `Blocked: ${method} ${path} changes GitHub branch protection or collaborator access.`

function githubApi(command: Command): string | undefined {
  const call = gh(command)
  if (call?.words[0] !== "api") return
  const { method, endpoint } = ghApi(call.words.slice(1))
  if (endpoint && writes.includes(method) && githubPath.test(endpoint)) return githubDeny(method, endpoint)
}

const inside = (path: string, root: string) => path.startsWith(root.endsWith(sep) ? root : root + sep)
const protectedRoots = new Set(["/", "/etc", "/srv", "/var/lib", "/tmp"])

// A last path component made only of glob and brace characters, such as `*`, `.*`, or
// `{*,.[!.]*}`, matches every entry of its directory, so rm empties the directory.
const wholeDirectory = /(^|\/)(?=[^/]*[*?[{])[.*?{}[\]!^,]+\/?$/

function removal(args: string[], ctx: Context, host: Host): string | undefined {
  const dashes = args.indexOf("--")
  const options = dashes === -1 ? args : args.slice(0, dashes)
  const recursive = options.some(a => /^-[a-zA-Z]*[rR]/.test(a) || a === "--recursive")
  if (!recursive) return
  // On a remote host or inside `docker exec`, the paths are not this host's: this host's temp
  // directories and symlinks say nothing about them, and only /tmp is known scratch.
  const away = ctx.remote ? "a remote host" : ctx.container === "exec" ? "a container" : undefined
  const tempRoots = away ? ["/tmp"] : host.tempRoots
  const targets = [...options.filter(a => !a.startsWith("-")), ...(dashes === -1 ? [] : args.slice(dashes + 1))]
  for (const target of targets) {
    if (/^(?:~|\$HOME|\$\{HOME\})(?:\/\**)?$/.test(target)) return deny(target, "the home directory")
    const expanded = expandHome(target, ctx.home)
    // An unknown expansion at the start leaves the path unknown; the agent sees its own variables.
    if (expanded === undefined) return deny(target, away ? `a home directory path in ${away}` : "a home directory path")
    if (/^[$`]/.test(expanded)) continue
    const known = (text: string) => text.replace(/\$\{[^}]*\}|\$\w+|\$\(.*?\)|`[^`]*`/g, "x")
    if (!known(expanded).startsWith("/") && ctx.cwd === undefined) {
      if (away) return deny(target, `a path in ${away}`)
      continue
    }
    const absolute = (text: string) => (text.startsWith("/") ? text : `${ctx.cwd}/${text}`)
    // A glob for the whole directory empties it, so judge the directory, following every symlink.
    // Otherwise judge the operand; rm removes a final symlink itself unless a trailing slash follows it.
    const directory = wholeDirectory.test(expanded) ? absolute(known(expanded.replace(wholeDirectory, "$1")) || ".") : undefined
    const operand = absolute(known(expanded).replace(/[*?[]/g, "x"))
    const lexical = resolve(directory ?? operand)
    const root = away ? lexical : canonical(directory ?? operand, host.realpath, directory !== undefined || /\/\.?$/.test(expanded))
    const path = directory === undefined ? root : `${root}/x`
    if (protectedRoots.has(root) || protectedRoots.has(lexical) || tempRoots.includes(root)) return deny(target, root)
    if (!away && host.home && (root === host.home || root === canonical(host.home, host.realpath, true))) return deny(target, "the home directory")
    if (tempRoots.some(tmp => inside(path, tmp))) continue
    if (away) return deny(target, `a path in ${away} outside /tmp`)
    const top = host.toplevel(root)
    if (top && root === top) return deny(target, `the git work tree ${top}`)
    if (top && inside(path, top)) continue
    return deny(target, `${path}, which is outside every git work tree and temp directory`)
  }
}

/** Resolves an absolute path as the kernel walks it: each existing component's symlinks first,
 * then `..`. With `followLast` false a final symlink stays itself, as `rm link` removes the link. */
export function canonical(path: string, realpath: Host["realpath"], followLast: boolean): string {
  const parts = path.split("/").filter(part => part !== "" && part !== ".")
  let at = "/"
  let exists = true
  for (const [k, part] of parts.entries()) {
    if (part === "..") {
      at = dirname(at)
      continue
    }
    const next = at === "/" ? `/${part}` : `${at}/${part}`
    const real: string | undefined = exists && (followLast || k < parts.length - 1) ? realpath(next) : undefined
    exists &&= real !== undefined
    at = real ?? next
  }
  return at
}

const deny = (target: string, what: string) => `Blocked: rm -r ${target} would delete ${what}. Remove only paths strictly inside a git work tree or a temp directory.`

/** Extracts `tool_input.command` and `cwd` from hook JSON, or returns a note explaining why not. */
export function hookInput(input: string): { command: string; cwd?: string } | { note: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    return { note: `unparseable hook input (${String(error)})` }
  }
  if (!parsed || typeof parsed !== "object") return { note: "hook input is not an object" }
  const toolInput = "tool_input" in parsed ? parsed.tool_input : undefined
  const command = toolInput && typeof toolInput === "object" && "command" in toolInput ? toolInput.command : undefined
  const cwd = "cwd" in parsed && typeof parsed.cwd === "string" ? parsed.cwd : undefined
  return typeof command === "string" ? { command, cwd } : { note: "no string tool_input.command" }
}

/** Returns the JSON line to print, if any. `lookups` replaces the git, temp-directory, symlink, and container lookups in tests. */
export function handle(
  input: string,
  env: Record<string, string | undefined> = process.env,
  lookups: Pick<Host, "toplevel" | "tempRoots" | "inspect" | "realpath"> = { toplevel: gitToplevel, tempRoots: defaultTempRoots(), inspect: inspectLabels, realpath },
): string | undefined {
  if (env.AGENT_DESTRUCTIVE_OK === "1") return
  const parsed = hookInput(input)
  if ("note" in parsed) {
    console.error(`destructive-guard: ${parsed.note}; allowing`)
    return
  }
  const reason = denyReason(parsed.command, { ...lookups, cwd: parsed.cwd ?? process.cwd(), home: env.HOME })
  if (!reason) return
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
  })
}

if (import.meta.main) {
  try {
    const output = handle(await Bun.stdin.text())
    if (output) console.log(output)
  } catch (error) {
    console.error(`destructive-guard: ${error instanceof Error ? error.message : String(error)}; allowing`)
  }
  process.exit(0)
}
