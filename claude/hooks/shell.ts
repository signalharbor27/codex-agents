// Shared shell-command reader for the Claude Code Bash hooks. `commands` lists every simple command a
// Bash tool call runs, with its stdin text and where it runs. It follows chains, pipes, subshells,
// `$(...)` and backticks, `cd` and `export` (scoped to their subshell), wrapper prefixes (sudo, env,
// timeout, nice, runuser, flock, watch, parallel, xargs, ...), `env -C`/`sudo -D` working
// directories, `bash -c`, `su -c`, `sg <group> -c`, `eval`, `docker exec` (remote when DOCKER_HOST,
// --host, or --context names another daemon), `kubectl exec`, and `ssh host ...` payloads. Heredoc
// bodies and comments are input text, never commands.
// It reads typical agent commands; it is not a full shell grammar and does not decode obfuscation
// such as printf-decoded scripts or `env -S` strings.
import { basename, resolve } from "node:path"

/** One simple command in the source. `op` is the operator that ends it (`&&`, `||`, `|`, `;`, `&`,
 * newline, or a parenthesis). `depth` counts the `( ... )` subshells around it. */
type Segment = { words: string[]; stdin: string[]; subs: string[]; op?: string; depth: number }

/** Where a command runs. `cwd` and `home` are unknown (undefined) inside containers and on remote hosts. */
export type Context = {
  cwd?: string
  home?: string
  /** On another host: an ssh payload or `kubectl exec`. */
  remote: boolean
  /** Inside `docker|podman exec` ("exec"), a `docker run` scratch container with a `*.worktree` label ("scratch"), or another `docker run` ("run"). */
  container?: "exec" | "scratch" | "run"
  /** The container a `docker|podman exec` names. Unset for compose services. */
  target?: { engine: string; name: string }
}

/** A simple command after wrappers are removed. `name` is the program's basename. `chained` is true
 * when it runs only after the command before it succeeded: joined by `&&`, through any `cd`. */
export type Command = { name: string; args: string[]; stdin: string; assignments: string[]; ctx: Context; chained: boolean }

export type Options = {
  /** Program names that mark where the command starts inside `docker run <options> <image>`. */
  runCommands?: ReadonlySet<string>
}

/** Splits a shell command into simple commands with unquoted words, heredoc and here-string
 * input, and `$(...)`/backtick bodies. Parentheses separate commands; `{`, `!`, and keywords stay
 * as words. Redirection operators and their targets are dropped. */
function parse(src: string): Segment[] {
  const segments: Segment[] = []
  let depth = 0
  let current: Segment = { words: [], stdin: [], subs: [], depth }
  let word = ""
  let inWord = false
  let redirect: "drop" | "herestring" | undefined
  const pending: { owner: Segment; delimiter: string; quoted: boolean; stripTabs: boolean }[] = []

  const endWord = () => {
    if (inWord) {
      if (redirect === "herestring") current.stdin.push(word)
      else if (!redirect) current.words.push(word)
      redirect = undefined
    }
    word = ""
    inWord = false
  }
  const endSegment = (op?: string) => {
    endWord()
    redirect = undefined
    current.op = op
    if (current.words.length || current.stdin.length || current.subs.length) segments.push(current)
    current = { words: [], stdin: [], subs: [], depth }
  }
  // Returns the index of the bracket closing the `$(` or backtick body that starts at `open`.
  const closing = (open: number, tick: boolean) => {
    if (tick) {
      const end = src.indexOf("`", open)
      return end === -1 ? src.length : end
    }
    let depth = 1
    for (let j = open; j < src.length; j++) {
      const c = src[j]
      if (c === "\\") j++
      else if (c === "'") j = src.indexOf("'", j + 1) === -1 ? src.length : src.indexOf("'", j + 1)
      else if (c === "(") depth++
      else if (c === ")" && --depth === 0) return j
    }
    return src.length
  }
  const substitution = (i: number) => {
    const tick = src[i] === "`"
    const open = i + (tick ? 1 : 2)
    const end = closing(open, tick)
    current.subs.push(src.slice(open, end))
    word += src.slice(i, end + 1)
    inWord = true
    return end
  }

  for (let i = 0; i < src.length; i++) {
    const c = src[i]!
    if (c === "\\") {
      if (src[i + 1] !== "\n") word += src[i + 1] ?? ""
      inWord = inWord || src[i + 1] !== "\n"
      i++
    } else if (c === "'" || (c === "$" && src[i + 1] === "'")) {
      const ansi = c === "$"
      let j = i + (ansi ? 2 : 1)
      for (; j < src.length && src[j] !== "'"; j++) {
        if (ansi && src[j] === "\\") {
          const next = src[++j] ?? ""
          word += next === "n" ? "\n" : next === "t" ? "\t" : next
        } else word += src[j]
      }
      inWord = true
      i = j
    } else if (c === '"') {
      let j = i + 1
      for (; j < src.length && src[j] !== '"'; j++) {
        if (src[j] === "\\" && /["\\$`\n]/.test(src[j + 1] ?? "")) {
          if (src[j + 1] !== "\n") word += src[j + 1]
          j++
        } else if (src.startsWith("$(", j) || src[j] === "`") j = substitution(j)
        else word += src[j]
      }
      inWord = true
      i = j
    } else if (src.startsWith("$(", i) || c === "`") i = substitution(i)
    else if (c === "#" && !inWord) {
      const eol = src.indexOf("\n", i)
      i = (eol === -1 ? src.length : eol) - 1
    } else if (src.startsWith("<<<", i)) {
      endWord()
      redirect = "herestring"
      i += 2
    } else if (src.startsWith("<<", i)) {
      endWord()
      const m = /^<<(-?)[ \t]*(\\|'|")?([\w.-]+)['"]?/.exec(src.slice(i))
      if (m) {
        pending.push({ owner: current, delimiter: m[3]!, quoted: !!m[2], stripTabs: !!m[1] })
        i += m[0].length - 1
      } else i++
    } else if (c === ">" || c === "<" || (c === "&" && src[i + 1] === ">")) {
      if (/^\d*$/.test(word)) {
        word = ""
        inWord = false
      } else endWord()
      while (/[<>&|]/.test(src[i + 1] ?? "") && !(src[i + 1] === "|" && src[i] !== ">")) i++
      // `>&1`, `>&-` and similar duplicate a descriptor; their target is the next word.
      redirect = "drop"
    } else if (c === "\n" && pending.length) {
      endSegment("\n")
      let at = i + 1
      for (const doc of pending.splice(0)) {
        const lines: string[] = []
        while (at < src.length) {
          const eol = src.indexOf("\n", at) === -1 ? src.length : src.indexOf("\n", at)
          const line = src.slice(at, eol)
          at = eol + 1
          if ((doc.stripTabs ? line.replace(/^\t+/, "") : line) === doc.delimiter) break
          lines.push(line)
        }
        const body = lines.join("\n")
        doc.owner.stdin.push(body)
        if (!doc.quoted) for (const m of body.matchAll(/\$\(([\s\S]*?)\)|`([^`]*)`/g)) doc.owner.subs.push(m[1] ?? m[2] ?? "")
      }
      i = at - 1
    } else if (c === "|") {
      endSegment(src[i + 1] === "|" ? "||" : "|")
      if (src[i + 1] === "|" || src[i + 1] === "&") i++
    } else if (c === ";" || c === "&" || c === "\n" || c === "(" || c === ")") {
      const doubled = src[i + 1] === c && c !== "\n"
      if (c === "(" || c === ")") depth = Math.max(0, depth + (c === "(" ? 1 : -1) * (doubled ? 2 : 1))
      endSegment(doubled ? c + c : c)
      if (doubled) i++
    } else if (/\s/.test(c)) endWord()
    else {
      word += c
      inWord = true
    }
  }
  endSegment()
  return segments
}

const keywords = new Set(["{", "}", "!", "if", "then", "else", "elif", "do", "while", "until", "time", "exec", "command", "builtin", "nohup", "setsid", "chronic"])
const shells = new Set(["sh", "bash", "zsh", "dash", "ksh"])
const assignment = /^[A-Za-z_]\w*=/

// Options that take a separate value, per wrapper. Others are flags.
const valueOptions: Record<string, Set<string>> = {
  sudo: new Set(["-u", "-g", "-h", "-p", "-C", "-D", "-r", "-t", "-U", "-T", "-R", "--user", "--group", "--chdir"]),
  doas: new Set(["-u", "-C"]),
  env: new Set(["-u", "-C", "-S", "--unset", "--chdir", "--split-string"]),
  timeout: new Set(["-s", "-k", "--signal", "--kill-after"]),
  nice: new Set(["-n", "--adjustment"]),
  ionice: new Set(["-c", "-n", "-p", "-P", "-u"]),
  stdbuf: new Set(["-i", "-o", "-e"]),
  xargs: new Set(["-I", "-n", "-P", "-d", "-L", "-s", "-E", "-a", "--max-args", "--max-procs", "--delimiter", "--arg-file"]),
  runuser: new Set(["-u", "-g", "-G", "-s", "-w", "--user", "--group", "--supp-group", "--shell", "--whitelist-environment"]),
  flock: new Set(["-w", "-E", "--wait", "--timeout", "--conflict-exit-code"]),
  watch: new Set(["-n", "--interval", "-q", "--equexit"]),
  parallel: new Set(["-j", "--jobs", "-S", "--sshlogin", "-N", "-n", "--max-args", "--joblog", "--delay", "--timeout", "-a", "--arg-file", "-d", "--delimiter"]),
  exec: new Set(["-e", "--env", "-u", "--user", "-w", "--workdir", "--env-file", "--detach-keys", "--index"]),
  ssh: new Set(["-b", "-B", "-c", "-D", "-E", "-e", "-F", "-I", "-i", "-J", "-L", "-l", "-m", "-O", "-o", "-p", "-Q", "-R", "-S", "-W", "-w"]),
}
const plainWrappers = new Set(["sudo", "doas", "env", "nice", "ionice", "stdbuf", "xargs"])

/** Index of the first word at or after `j` that is not an option; consumes a `--`. */
function skipOptions(words: string[], j: number, values: Set<string>): number {
  while (j < words.length && words[j]!.startsWith("-") && words[j] !== "-") {
    if (words[j] === "--") return j + 1
    if (values.has(words[j]!)) j++
    j++
  }
  return j
}

/** Expands a leading `~`, `$HOME`, or `${HOME}`; undefined when the path needs an unknown home. */
export function expandHome(path: string, home: string | undefined): string | undefined {
  const m = /^(?:~|\$HOME|\$\{HOME\})(?=\/|$)/.exec(path)
  if (!m) return path
  return home ? home + path.slice(m[0].length) : undefined
}

/** The directory `cd [-L|-P] [--] [dir]` selects, or undefined when it is unknown (`cd -`, a variable). */
function cdTarget(args: string[], ctx: Context): string | undefined {
  let j = 0
  while (/^-[LPe@]+$/.test(args[j] ?? "")) j++
  if (args[j] === "--") j++
  return changeDir(args[j], ctx)
}

function changeDir(target: string | undefined, ctx: Context): string | undefined {
  if (target === undefined) return ctx.home
  if (target.startsWith("-")) return undefined
  const path = expandHome(target, ctx.home)
  if (path === undefined || /[$`]/.test(path)) return undefined
  if (path.startsWith("/")) return resolve(path)
  return ctx.cwd === undefined ? undefined : resolve(ctx.cwd, path)
}

/** Text a pipeline stage writes to the next stage: echo/printf arguments, or cat/tee input. */
function output(words: string[], stdin: string): string {
  const at = words.findIndex(w => !assignment.test(w))
  const name = basename(words[at] ?? "")
  const args = words.slice(at + 1)
  if (name === "echo") return args.filter((w, j) => !(j === 0 && /^-[neE]+$/.test(w))).join(" ")
  // A format with conversions such as `%s\n` is not output itself; the arguments are.
  if (name === "printf") return (args[0]?.includes("%") ? args.slice(1) : args).join(" ")
  if (name === "tee") return stdin
  // `cat file` writes the file, which the hook cannot see; bare `cat` or `cat -` passes its input on.
  if (name === "cat") return args.every(w => w.startsWith("-")) ? stdin : ""
  return ""
}

/** Every simple command `src` runs, in order, with wrappers removed. `stdin` feeds the first
 * command; `chained` says whether the first command is joined by `&&` to a command before `src`;
 * `inherited` holds `VAR=value` assignments exported to `src` by the command that runs it. */
export function commands(src: string, ctx: Context, options: Options = {}, stdin?: string, chained = false, inherited: string[] = []): Command[] {
  const out: Command[] = []
  // Shell state that `cd` and `export` change; a `( ... )` subshell restores it when it ends.
  let state = { cwd: ctx.cwd, exported: inherited }
  const saved: (typeof state)[] = []
  let piped = stdin
  let linked = chained
  let previousOp: string | undefined
  for (const segment of parse(src)) {
    while (saved.length < segment.depth) saved.push(state)
    while (saved.length > segment.depth) state = saved.pop()!
    const here = { ...ctx, cwd: state.cwd }
    for (const sub of segment.subs) out.push(...commands(sub, here, options, undefined, linked, state.exported))
    const input = [piped, ...segment.stdin].filter(s => s !== undefined && s !== "").join("\n")
    piped = segment.op === "|" ? output(segment.words, input) : undefined
    const head = segment.words[0]
    const and = segment.op === "&&"
    // Pipeline stages and background jobs run in subshells, so their `cd` and `export` do not last.
    const lasts = segment.op !== "|" && segment.op !== "&" && previousOp !== "|"
    previousOp = segment.op
    if (head === "cd" || head === "pushd") {
      if (lasts) state = { ...state, cwd: cdTarget(segment.words.slice(1), here) }
      // A skipped `cd` keeps the chain only when it was itself chained.
      linked = and && linked
    } else if (head === "export" && segment.words.length > 1 && segment.words.slice(1).every(w => assignment.test(w) || /^-/.test(w))) {
      if (lasts) state = { ...state, exported: [...state.exported, ...segment.words.slice(1).filter(w => assignment.test(w))] }
      linked = and && linked
    } else {
      unwrap(segment.words, input, here, options, out, linked, state.exported)
      linked = and
    }
  }
  return out
}

/** `docker|podman run` options: the `--name` and whether a `--label`/`-l` key ends in `.worktree`.
 * Scans every word, so pass only the words before the payload command when there is one. */
export function runOptions(args: string[]): { name?: string; worktreeLabel: boolean } {
  let name: string | undefined
  let worktreeLabel = false
  for (let j = 0; j < args.length; j++) {
    const m = /^(--name|--label|-l)(?:=(.*))?$/s.exec(args[j]!)
    if (!m) continue
    const value = m[2] ?? args[++j] ?? ""
    if (m[1] === "--name") name = value
    else if (value.split("=")[0]!.endsWith(".worktree")) worktreeLabel = true
  }
  return { name, worktreeLabel }
}

const away = (ctx: Context, change: Partial<Context>): Context => ({ ...ctx, cwd: undefined, home: undefined, ...change })

/** The value of option `names` (`-C dir`, `-Cdir`, `--chdir dir`, `--chdir=dir`) among the options from `from`. */
function optionValue(words: string[], from: number, names: string[], values: Set<string>): string | undefined {
  for (let j = from; j < words.length && words[j]!.startsWith("-") && words[j] !== "--"; j++) {
    const word = words[j]!
    for (const name of names) {
      if (word === name) return words[j + 1]
      if (name.startsWith("--") ? word.startsWith(`${name}=`) : word.startsWith(name)) return word.slice(name.length).replace(/^=/, "")
    }
    if (values.has(word)) j++
  }
}

// Options that select a working directory for the wrapped command.
const chdirOptions: Record<string, string[]> = { env: ["-C", "--chdir"], sudo: ["-D", "--chdir"] }

/** Whether `docker|podman` global options or DOCKER_HOST/DOCKER_CONTEXT point at a daemon on another host. */
function remoteEngine(words: string[], from: number, assignments: string[]): { remote: boolean; at: number } {
  const local = (host: string) => host === "" || /^(?:unix|npipe):\/\//.test(host) || /^tcp:\/\/(?:localhost|127\.0\.0\.1)(?::|$)/.test(host)
  const value = (name: string) => assignments.findLast(a => a.startsWith(`${name}=`))?.slice(name.length + 1)
  const host = value("DOCKER_HOST")
  const context = value("DOCKER_CONTEXT")
  let remote = (host !== undefined && !local(host)) || (context !== undefined && context !== "" && context !== "default")
  let j = from
  for (; j < words.length && words[j]!.startsWith("-"); j++) {
    const m = /^(--host|-H|--context|-c|--connection|--url|--config|--log-level|-l)(?:=(.*))?$/s.exec(words[j]!)
    if (words[j] === "--remote" || words[j] === "-r") remote = true
    if (!m) continue
    const v = m[2] ?? words[++j] ?? ""
    if (m[1] === "--host" || m[1] === "-H" || m[1] === "--url") remote ||= !local(v)
    else if (m[1] === "--context" || m[1] === "-c" || m[1] === "--connection") remote ||= v !== "default"
  }
  return { remote, at: j }
}

function unwrap(words: string[], stdin: string, ctx: Context, options: Options, out: Command[], chained: boolean, inherited: string[] = []): void {
  const assignments: string[] = [...inherited]
  const script = (src: string, at: Context, input?: string) => void out.push(...commands(src, at, options, input, chained, assignments))
  let xargs: { placeholder?: string; items: string[] } | undefined
  let engineRead = false
  let i = 0
  while (i < words.length) {
    const word = words[i]!
    const cmd = basename(word)
    const next = words[i + 1]
    if (assignment.test(word)) assignments.push(words[i++]!)
    else if (keywords.has(word)) i++
    else if (plainWrappers.has(cmd)) {
      const dir = chdirOptions[cmd] && optionValue(words, i + 1, chdirOptions[cmd], valueOptions[cmd]!)
      if (dir !== undefined) ctx = { ...ctx, cwd: changeDir(dir, ctx) }
      // xargs runs its command with the input words as operands; only echo/printf/heredoc input is known.
      if (cmd === "xargs" && stdin) {
        xargs = { placeholder: optionValue(words, i + 1, ["-I"], valueOptions.xargs!), items: stdin.split(/\s+/).filter(Boolean) }
        stdin = ""
      }
      i = skipOptions(words, i + 1, valueOptions[cmd]!)
      while (cmd === "env" && i < words.length && assignment.test(words[i]!)) assignments.push(words[i++]!)
    } else if (cmd === "timeout") i = skipOptions(words, i + 1, valueOptions.timeout!) + 1
    else if (cmd === "watch") return script(words.slice(skipOptions(words, i + 1, valueOptions.watch!)).join(" "), ctx)
    else if (cmd === "parallel") {
      const from = skipOptions(words, i + 1, valueOptions.parallel!)
      const end = words.findIndex((w, j) => j >= from && /^:::+$/.test(w))
      return script(words.slice(from, end === -1 ? undefined : end).join(" "), ctx)
    } else if (cmd === "flock") {
      const file = skipOptions(words, i + 1, valueOptions.flock!)
      if (/^\d+$/.test(words[file] ?? "")) return
      if (words[file + 1] === "-c" || words[file + 1] === "--command") return script(words[file + 2] ?? "", ctx, stdin)
      i = file + 1
    } else if (cmd === "runuser") {
      const c = words.findIndex((w, j) => j > i && (w === "-c" || w === "--command"))
      if (c !== -1) return script(words[c + 1] ?? "", ctx, stdin)
      const byUser = words.slice(i + 1).some(w => w === "-u" || w === "--user")
      i = skipOptions(words, i + 1, valueOptions.runuser!)
      if (!byUser) return script(stdin, ctx)
    } else if ((cmd === "docker" || cmd === "podman") && !engineRead) {
      // Drop global options; a daemon on another host makes everything it runs remote.
      engineRead = true
      const engine = remoteEngine(words, i + 1, assignments)
      words = [...words.slice(0, i + 1), ...words.slice(engine.at)]
      if (engine.remote) ctx = { ...ctx, remote: true }
    } else if ((cmd === "docker" || cmd === "podman") && next === "exec") {
      const at = skipOptions(words, i + 2, valueOptions.exec!)
      ctx = away(ctx, { container: "exec", target: words[at] === undefined ? undefined : { engine: cmd, name: words[at]! } })
      i = at + 1
    } else if ((cmd === "docker" || cmd === "podman") && next === "compose" && words[i + 2] === "exec") {
      i = skipOptions(words, i + 3, valueOptions.exec!) + 1
      ctx = away(ctx, { container: "exec", target: undefined })
    } else if (cmd === "docker-compose" && next === "exec") {
      i = skipOptions(words, i + 2, valueOptions.exec!) + 1
      ctx = away(ctx, { container: "exec", target: undefined })
    } else if ((cmd === "docker" || cmd === "podman") && next === "run") {
      // The `docker run` itself is a command too, so a guard can see which containers it starts.
      const rest = words.slice(i + 2)
      const found = rest.findIndex(w => options.runCommands?.has(basename(w)))
      if (found === -1) break
      const before = rest.slice(0, found)
      out.push({ name: cmd, args: ["run", ...before], stdin: "", assignments: [...assignments], ctx, chained })
      ctx = away(ctx, { container: runOptions(before).worktreeLabel ? "scratch" : "run", target: undefined })
      i += 2 + found
    } else if (cmd === "kubectl" && next === "exec") {
      const dashes = words.indexOf("--", i)
      if (dashes === -1) return
      ctx = away(ctx, { remote: true, container: undefined, target: undefined })
      i = dashes + 1
    } else if (cmd === "ssh") {
      const host = skipOptions(words, i + 1, valueOptions.ssh!)
      const at = skipOptions(words, host + 1, valueOptions.ssh!)
      const payload = words.slice(at).join(" ")
      const remote = away(ctx, { remote: true, container: undefined, target: undefined })
      return payload ? script(payload, remote, stdin) : script(stdin, remote)
    } else if (shells.has(cmd)) {
      const flags = words.slice(i + 1).findIndex(w => !w.startsWith("-") || w === "--")
      const opts = flags === -1 ? words.slice(i + 1) : words.slice(i + 1, i + 1 + flags)
      const rest = flags === -1 ? [] : words.slice(i + 1 + flags)
      if (opts.some(w => /^-[a-z]*c[a-z]*$/.test(w))) return script(rest[0] ?? "", ctx, stdin)
      return rest.length ? undefined : script(stdin, ctx)
    } else if (cmd === "su") {
      const c = words.findIndex((w, j) => j > i && (w === "-c" || w === "--command"))
      return c === -1 ? script(stdin, ctx) : script(words[c + 1] ?? "", ctx, stdin)
    } else if (cmd === "sg") {
      let j = i + 1
      if (words[j] === "-") j++
      j++
      if (words[j] === "-c") j++
      return words[j] === undefined ? script(stdin, ctx) : script(words[j]!, ctx, stdin)
    } else if (cmd === "eval") return script(words.slice(i + 1).join(" "), ctx, stdin)
    else break
  }
  if (i >= words.length) return
  let args = words.slice(i + 1)
  if (xargs) {
    const { placeholder, items } = xargs
    args = placeholder === undefined ? [...args, ...items] : args.flatMap(arg => (arg.includes(placeholder) ? items.map(item => arg.replaceAll(placeholder, item)) : [arg]))
  }
  out.push({ name: basename(words[i]!), args, stdin, assignments, ctx, chained })
}

/** `gh` arguments split into global options and the subcommand words. `repo` comes from
 * `-R/--repo` or GH_REPO; `host` from GH_HOST. */
export type Gh = { repo?: string; host?: string; words: string[] }

/** Reads `gh [-R repo] <subcommand ...>`, taking GH_REPO and GH_HOST from the command's assignments. */
export function gh(command: Command): Gh | undefined {
  if (command.name !== "gh") return
  const variable = (name: string) => command.assignments.findLast(a => a.startsWith(`${name}=`))?.slice(name.length + 1) || undefined
  let repo = variable("GH_REPO")
  let i = 0
  for (; i < command.args.length && command.args[i]!.startsWith("-"); i++) {
    const arg = command.args[i]!
    if (arg === "-R" || arg === "--repo") repo = command.args[++i]
    else if (/^(?:--repo=|-R)./.test(arg)) repo = arg.replace(/^(?:--repo=|-R)/, "")
  }
  return { repo, host: variable("GH_HOST"), words: command.args.slice(i) }
}

export type GhApi = { method: string; endpoint?: string; fields: string[]; input: boolean; hostname?: string; help: boolean }
const ghApiValues = new Set(["-X", "--method", "-f", "-F", "--field", "--raw-field", "--input", "-H", "--header", "-q", "--jq", "-t", "--template", "--hostname", "-p", "--preview", "--cache"])

/** Reads `gh api` arguments (after `api`). The method defaults to POST when fields or --input are given, as gh does. */
export function ghApi(args: string[]): GhApi {
  let method: string | undefined
  let endpoint: string | undefined
  let input = false
  let hostname: string | undefined
  let help = false
  const fields: string[] = []
  for (let j = 0; j < args.length; j++) {
    const arg = args[j]!
    const long = /^(--[\w-]+)=(.*)$/s.exec(arg)
    const short = /^(-[XfF])(.+)$/s.exec(arg)
    const [flag, value] = long ? [long[1]!, long[2]!] : short ? [short[1]!, short[2]!] : ghApiValues.has(arg) ? [arg, args[++j] ?? ""] : [arg, undefined]
    if (flag === "-X" || flag === "--method") method = value?.toUpperCase()
    else if (flag === "-f" || flag === "-F" || flag === "--field" || flag === "--raw-field") fields.push(value ?? "")
    else if (flag === "--input") input = true
    else if (flag === "--hostname") hostname = value
    else if (flag === "-h" || flag === "--help") help = true
    else if (!flag.startsWith("-")) endpoint ??= flag
  }
  return { method: method ?? (fields.length || input ? "POST" : "GET"), endpoint, fields, input, hostname, help }
}
