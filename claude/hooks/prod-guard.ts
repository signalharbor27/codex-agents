#!/usr/bin/env bun
// Claude Code PreToolUse hook for Bash, Edit, and Write. Asks Q before a command that can change or
// slow TweetStream production on this host; every other command, sudo reads included (logs, unit
// status, secrets, metrics), runs without a prompt. It replaces a blanket `Bash(sudo *)` ask rule.
// Production runs as its own users with root-owned files, so a command reaches it through root,
// Redis, Docker, or a deploy/live script. The hook asks for:
// - unit state changes (start, stop, restart, reload, kill, mask, enable, disable, ...) on prod units,
//   daemon-reload/daemon-reexec, and reboot, shutdown, or a power-state change;
// - kill run as root, and pkill/killall naming a prod process;
// - writes, moves, removals, mode or owner changes under prod paths, by tee, cp, mv, install, rsync,
//   ln, sed/perl -i, chmod, chown, chattr, truncate, dd, rm, touch, or a shell redirect;
// - attaching strace, ltrace, gdb, or gcore to a running process, perf trace/probe, and flock on a
//   prod path; perf record/stat sampling runs without a prompt;
// - Redis verbs that write, block, or scan the whole keyspace (anything not on a read list);
// - Docker stop/restart/kill/rm/pause/update of a long-running host container, and container,
//   system, or volume prunes;
// - host-wide tuning: sysctl writes, firewall, routes, links, traffic control, CPU frequency, package
//   installs and upgrades, swap, unmounts, networkd reloads;
// - TweetStream deploy scripts and live smoke/soak/probe commands.
// Scope: an accident guardrail, not a security boundary; it does not decode obfuscated commands.
// Unexpected errors ask rather than allow. Starting Claude Code with AGENT_PROD_OK=1 disables it.
import { inspectLabels, type Inspect } from "./destructive-guard.ts"
import { basename, resolve } from "node:path"
import { type Command, commands } from "./shell.ts"

const okHint = "Q can approve, or start Claude Code with AGENT_PROD_OK=1 to skip these prompts."

// Units whose state change touches production or everything on the host.
const prodUnit = /^(?:tweetstream|haproxy|redis|docker|containerd|systemd-networkd|networking|systemd-resolved|ssh|sshd|cron|nginx)(?:$|[-@.])/
const unitVerbs = new Set(["start", "stop", "restart", "reload", "try-restart", "reload-or-restart", "try-reload-or-restart", "condrestart", "force-reload", "kill", "mask", "unmask", "enable", "disable", "reenable", "isolate", "set-property", "edit", "revert", "link", "preset", "freeze", "thaw", "clean"])
const hostVerbs = new Set(["daemon-reload", "daemon-reexec", "reboot", "poweroff", "halt", "kexec", "suspend", "hibernate", "hybrid-sleep", "rescue", "emergency", "default", "soft-reboot", "switch-root"])
// systemctl options whose value is a separate word, so it is not read as the verb.
const systemctlValues = new Set(["-H", "--host", "-M", "--machine", "-t", "--type", "-p", "--property", "-s", "--signal", "-n", "--lines", "-o", "--output", "--kill-whom", "--kill-value", "--root", "--image", "--state", "--job-mode", "--what", "--timestamp", "--preset-mode", "--message", "--wait-for"])
const powerCommands = new Set(["reboot", "shutdown", "poweroff", "halt", "kexec", "telinit"])

// Paths whose contents production reads or that tune the whole host.
const prodPaths = ["/etc/tweetstream", "/opt/tweetstream", "/opt/tweetstream-sandbox", "/etc/systemd", "/lib/systemd/system", "/usr/lib/systemd/system", "/etc/haproxy", "/etc/redis", "/etc/sysctl.conf", "/etc/sysctl.d", "/etc/security/limits", "/etc/netplan", "/etc/network", "/etc/hosts", "/etc/resolv.conf", "/etc/fstab", "/etc/sudoers", "/etc/default/grub", "/etc/docker", "/proc/sys", "/sys", "/var/lib/redis", "/var/lib/tweetstream", "/boot"]
const prodPath = (path: string) => prodPaths.some(root => path === root || path.startsWith(`${root}/`) || (root.endsWith("limits") && path.startsWith(root)))
const prodProcess = /tweetstream|upstream-go|pump|bloom|fomo|charity|crypto-worker|redis|haproxy|prometheus|grafana|node.exporter|sandbox|containerd|dockerd/

// Writers and the operands they change. `undefined` means every non-option operand.
const writers: Record<string, (args: string[]) => string[]> = {
  tee: args => operands(args),
  cp: args => [...targetDir(args), ...last(args)],
  mv: args => [...targetDir(args), ...operands(args)],
  install: args => [...targetDir(args), ...last(args)],
  rsync: args => last(args),
  ln: args => [...targetDir(args), ...last(args)],
  rm: args => operands(args),
  rmdir: args => operands(args),
  unlink: args => operands(args),
  touch: args => operands(args),
  truncate: args => operands(args),
  mkdir: args => operands(args),
  chmod: args => operands(args).slice(1),
  chown: args => operands(args).slice(1),
  chgrp: args => operands(args).slice(1),
  chattr: args => operands(args).filter(a => !/^[+=-]/.test(a)),
  setfacl: args => operands(args),
  sed: args => (args.some(a => /^-[a-zA-Z]*i/.test(a) || a.startsWith("--in-place")) ? operands(args) : []),
  perl: args => (args.some(a => /^-[a-zA-Z]*i/.test(a)) ? operands(args) : []),
  dd: args => args.filter(a => a.startsWith("of=")).map(a => a.slice(3)),
}
const operands = (args: string[]) => args.filter(a => !a.startsWith("-"))
const last = (args: string[]) => operands(args).slice(-1)
/** `-t DIR`, `-tDIR`, `--target-directory DIR`, or `--target-directory=DIR`. */
const targetDir = (args: string[]) =>
  args.flatMap((a, j) => (a === "-t" || a === "--target-directory" ? [args[j + 1] ?? ""] : a.startsWith("--target-directory=") ? [a.slice(19)] : /^-t./.test(a) ? [a.slice(2)] : []))

// Redis verbs that only read a bounded amount of data or server state.
const redisReads = new Set(["get", "mget", "getrange", "strlen", "exists", "type", "ttl", "pttl", "expiretime", "pexpiretime", "hget", "hmget", "hgetall", "hkeys", "hvals", "hlen", "hexists", "hscan", "hstrlen", "hrandfield", "lrange", "llen", "lindex", "lpos", "smembers", "scard", "sismember", "smismember", "srandmember", "sscan", "zrange", "zrangebyscore", "zrevrange", "zrevrangebyscore", "zrangebylex", "zcard", "zscore", "zmscore", "zrank", "zrevrank", "zcount", "zlexcount", "zscan", "xlen", "xrange", "xrevrange", "xinfo", "xpending", "xread", "scan", "dbsize", "info", "ping", "echo", "time", "role", "lastsave", "slowlog", "latency", "memory", "object", "client", "config", "command", "pubsub", "subscribe", "psubscribe", "ssubscribe", "cluster", "bitcount", "getbit", "pfcount", "geopos", "geodist", "georadius_ro", "georadiusbymember_ro", "geosearch", "json.get", "json.type", "json.objkeys", "json.objlen", "json.arrlen", "json.strlen", "ts.get", "ts.range", "ts.info", "auth", "hello", "select"])
// Sub-verbs of a read verb above that write or block.
const redisWriteSubs: Record<string, RegExp> = { config: /^(?!get$)/i, client: /^(?:kill|pause|unpause|no-evict|no-touch|setname|reply|unblock|tracking)$/i, slowlog: /^reset$/i, latency: /^reset$/i, memory: /^(?:purge|doctor)$/i, cluster: /^(?!info$|nodes$|slots$|shards$|myid$)/i, xinfo: /^$/ }
const redisValues = new Set(["-h", "-p", "-s", "-a", "-u", "-n", "-r", "-i", "-d", "-D", "-X", "--user", "--pass", "--sni", "--cacert", "--cacertdir", "--cert", "--key", "--tls-ciphers", "--tls-ciphersuites", "--pattern", "--quoted-pattern", "--count", "--rdb", "--functions-rdb", "--pipe-timeout", "--memkeys-samples", "--eval", "--lru-test", "--intrinsic-latency", "--replica"])
const redisScans = /^--(?:bigkeys|memkeys|hotkeys|keystats|rdb|functions-rdb|pipe|replica|eval|lru-test)$/

// Long-running host containers: TweetStream's, the Claude API proxy, and the tailnet node.
const prodContainer = /tweetstream|cli-proxy|tailscale|-ts$|polysink|trump-relay/
const dockerWrites = new Set(["restart", "stop", "kill", "rm", "pause", "unpause", "update", "rename"])

/** The ask reason for one command, or undefined. */
function check(c: Command, inspect: Inspect): string | undefined {
  const { name, args, stdin } = c
  if (name === "systemctl" || name === "service") return systemd(name, args)
  if (powerCommands.has(name) || (name === "init" && /^[0-6sS]$/.test(args[0] ?? ""))) return `\`${name}\` reboots or changes the power state of the production host.`
  if (name === "pkill" || name === "killall") {
    const hit = operands(args).find(a => prodProcess.test(a))
    if (hit) return `\`${name} ${hit}\` names a production process.`
  }
  const writer = writers[name]
  if (writer) {
    const hit = writer(args).map(path => (path.startsWith("/") || c.ctx.cwd === undefined ? path : resolve(c.ctx.cwd, path))).find(prodPath)
    if (hit) return `\`${name}\` changes ${hit}, which production reads.`
  }
  if (["strace", "ltrace", "gdb", "gcore"].includes(name) && args.some(a => /^(?:-p|--pid|--attach)(?:=|$)|^-p\d/.test(a)))
    return `\`${name}\` stops a running process while attached.`
  if (name === "perf" && (args[0] === "trace" || (args[0] === "probe" && !args.some(a => /^(?:-l|--list|-d|--del|-F|--funcs|-V|--vars|-L|--line)/.test(a)))))
    return `\`perf ${args[0]}\` instruments kernel or process hot paths, which slows production.`
  if (name === "redis-cli") return redis(args, stdin)
  if (name === "docker-compose") return compose("docker", ["compose", ...args], c.ctx.cwd)
  if (name === "docker" || name === "podman") return docker(name, args, inspect, c.ctx.cwd)
  if (name === "sysctl" && args.some(a => /^-[a-zA-Z]*[wp]|^--(?:write|load|system)|=/.test(a))) return "`sysctl` changes kernel tuning for the production host."
  if (name === "firewall-cmd" && args.some(a => /^--(?:reload|complete-reload|add-|remove-|change-|set-|new-|delete-|runtime-to-permanent|panic-on|lockdown-on|direct)/.test(a))) return "`firewall-cmd` changes firewall rules on the production host."
  if (["iptables", "ip6tables", "iptables-restore", "ip6tables-restore", "nft", "ufw"].includes(name) && !firewallRead(name, args)) return `\`${name}\` changes firewall rules on the production host.`
  if (name === "ip" && operands(args).slice(1).some(a => /^(?:add|del|delete|change|replace|set|flush|append|prepend|attach|detach|restore)$/.test(a))) return "`ip` changes routes, links, or addresses on the production host."
  if (name === "tc" && args.some(a => /^(?:add|del|delete|change|replace|link)$/.test(a))) return "`tc` changes traffic shaping on the production host."
  if (name === "cpupower" && args.some(a => /^(?:frequency-set|set|idle-set)$/.test(a))) return "`cpupower` changes CPU frequency on the production host."
  if (["apt", "apt-get", "aptitude", "snap"].includes(name) && args.some(a => /^(?:install|reinstall|remove|purge|upgrade|full-upgrade|dist-upgrade|autoremove|refresh|revert|disable)$/.test(a))) return `\`${name}\` changes installed packages on the production host.`
  if (name === "dpkg" && args.some(a => /^(?:-[a-zA-Z]*[irP]|--install|--remove|--purge|--configure)$/.test(a))) return "`dpkg` changes installed packages on the production host."
  if (["swapoff", "swapon", "umount", "mount"].includes(name) && args.length > 0 && !(name === "mount" && args.every(a => a.startsWith("-") && a !== "-a"))) return `\`${name}\` changes swap or mounts on the production host.`
  if (name === "networkctl" && args.some(a => /^(?:reload|reconfigure|up|down|renew|forcerenew|delete)$/.test(a))) return "`networkctl` reconfigures production networking."
}

function systemd(name: string, args: string[]): string | undefined {
  if (args.includes("--user")) return
  const words = args.filter((a, j) => !a.startsWith("-") && !systemctlValues.has(args[j - 1] ?? ""))
  // `service <unit> <verb>` and `systemctl <verb> <unit...>`.
  const [verb, units] = name === "service" ? [words[1] ?? "", words.slice(0, 1)] : [words[0] ?? "", words.slice(1)]
  if (hostVerbs.has(verb)) return `\`${name} ${verb}\` affects every unit on the production host.`
  if (!unitVerbs.has(verb)) return
  const hit = units.find(u => prodUnit.test(u) || /[*?[]/.test(u))
  if (hit) return `\`${name} ${verb} ${hit}\` changes a production service.`
}

function firewallRead(name: string, args: string[]): boolean {
  if (name === "nft") return /^(?:list|-a|--handle|-s|--stateless|-j|--json)$/.test(args[0] ?? "") && !args.some(a => /^(?:add|delete|flush|insert|replace|create|destroy|reset)$/.test(a))
  if (name === "ufw") return /^(?:status|show|app)$/.test(args[0] ?? "")
  if (name.endsWith("-restore")) return false
  return args.every(a => !/^-[a-zA-Z]*[AIDRFZNXPE]$|^--(?:append|insert|delete|replace|flush|zero|new-chain|delete-chain|policy|rename-chain)/.test(a))
}

function redis(args: string[], stdin: string): string | undefined {
  const scan = args.find(a => redisScans.test(a))
  if (scan) return `\`redis-cli ${scan}\` scans or streams the whole production Redis.`
  let at = -1
  for (let j = 0; j < args.length; j++) {
    if (redisValues.has(args[j]!)) j++
    else if (!args[j]!.startsWith("-")) {
      at = j
      break
    }
  }
  const lines = at >= 0 ? [args.slice(at)] : stdin.replace(/\\n/g, "\n").split("\n").map(l => l.trim().split(/\s+/)).filter(w => w[0])
  for (const [verb = "", sub = ""] of lines) {
    const v = verb.toLowerCase()
    if (!redisReads.has(v) || redisWriteSubs[v]?.test(sub)) return `\`redis-cli ${verb}${sub && redisWriteSubs[v] ? ` ${sub}` : ""}\` writes to, blocks, or scans production Redis.`
  }
}

/** Compose lifecycle verbs on a production project: one named like a host container, or one fed
 * production env files. Without `-p`, Compose names the project after the working directory. */
function compose(name: string, args: string[], cwd: string | undefined): string | undefined {
  const at = args.indexOf("compose")
  const rest = args.slice(at + 1)
  const verb = rest.find((a, j) => !a.startsWith("-") && !/^(?:-p|--project-name|-f|--file|--env-file|--project-directory|--profile)$/.test(rest[j - 1] ?? ""))
  if (!/^(?:down|stop|rm|kill|restart|pause|up|create|scale|start)$/.test(verb ?? "")) return
  // `-p NAME`, `-pNAME`, `-p=NAME`, `--project-name NAME`, `--project-name=NAME`.
  const named = rest.flatMap((a, j) => (a === "-p" || a === "--project-name" ? [rest[j + 1] ?? ""] : /^(?:-p=?|--project-name=)(.+)$/.exec(a)?.slice(1) ?? []))
  const project = named[0] ?? basename(cwd ?? "")
  if (prodContainer.test(project) || rest.some(a => /\/etc\/tweetstream|\.private\.ya?ml/.test(a))) return `\`${name} compose ${verb}\` changes the production Compose project ${project}.`
}

function docker(name: string, args: string[], inspect: Inspect, cwd?: string): string | undefined {
  const words = operands(args)
  let verb = words[0] ?? ""
  let rest = words.slice(1)
  if (verb === "container" || verb === "network" || verb === "system" || verb === "volume") {
    const group = verb
    verb = words[1] ?? ""
    rest = words.slice(2)
    if ((verb === "prune" && group !== "network") || (group === "volume" && verb === "rm")) return `\`${name} ${group} ${verb}\` can remove stopped production containers or their volumes.`
    if (group !== "container") return
  }
  if (verb === "compose") return compose(name, args, cwd)
  if (!dockerWrites.has(verb)) return
  const live = rest.find(container => prodContainer.test(container) && !(inspect(name, container) ?? []).some(label => label.endsWith(".worktree")))
  if (live) return `\`${name} ${verb} ${live}\` changes a production container.`
}

// Raw-text checks for what the parser drops: redirect targets, flock paths, script files, live runs.
const redirect = /(?:^|[^<>&0-9])(?:[0-9]|&)?>>?\|?\s*["']?([^\s"';|&)<>]+)/g
// A command position: line start or after an operator, then an optional root wrapper, then any of
// env/nice/nohup/command/exec/timeout wrappers and assignments.
const head = String.raw`(?:^|[;&|(\n` + "`" + String.raw`]|\$\()\s*(?:(?:sudo|doas|runuser|pkexec)(?:\s+(?:-[A-Za-z]*[ugCDhprtUT]\s+\S+|-\S+))*\s+)?(?:(?:env|nice|nohup|command|exec|ionice|stdbuf|time)(?:\s+-\S+)*\s+|[A-Za-z_]\w*=\S*\s+|timeout\s+(?:-\S+\s+)*\S+\s+)*`
const deployScript = new RegExp(`${head}(?:(?:ba|da|z)?sh\\s+(?:-\\S+\\s+)*)?\\S*(?:\\bdeploy\\/(?![\\w./-]*-test\\.sh)[\\w.-]+\\.sh|(?:^|\\/)(?:deploy-(?![\\w-]*-test\\.sh)[\\w-]+|ci-vps-release|fomo-reseed|durable-journal|vps-release-entrypoint)\\.sh)\\b`, "m")
const liveRun = new RegExp(`${head}(?:(?:bun|npm|pnpm|yarn)\\s+(?:run\\s+)?|make\\s+(?:-\\S+\\s+)*|go\\s+run\\s+\\S+\\s+)?\\S*(?:(?:smoke|soak|probe)-live|go:smoke:live)`, "m")
// `sudo kill <pid>`: the pid may be production's; signal 0 only probes.
// Root wrapper, then `kill` in the same command (through `sh -c`, `env`, `timeout`, ...), not in a container.
const rootKill = /(?:^|[\s;&|(`])(?:sudo|doas|runuser|pkexec|su)\b(?:(?!\b(?:docker|podman|kubectl)\b)[^;&|\n])*?(?:\/usr\/bin\/|\/bin\/)?\bkill\s+(?!-0\b|-l\b|-L\b)/

/** Returns the ask reason for a Bash command, or undefined to run it without a prompt. */
export function askReason(command: string, cwd: string | undefined, home: string | undefined, inspect: Inspect = inspectLabels): string | undefined {
  const dirs = [cwd, ...[...command.matchAll(/\bcd\s+(?:-[LPe@]+\s+|--\s+)*["']?(\/[^\s"';&|)]+)/g)].map(m => m[1]!)].filter(d => d !== undefined)
  for (const m of command.matchAll(redirect)) {
    const target = m[1]!
    // A relative target must look like a file name: `>22` or `>$x` is usually awk or jq inside quotes.
    const hit = target.startsWith("/") ? (prodPath(target) ? target : undefined) : /^[A-Za-z_.][\w./-]*$/.test(target) ? dirs.map(d => resolve(d, target)).find(prodPath) : undefined
    if (hit) return `A redirect writes to ${hit}, which production reads.`
  }
  const flock = /\bflock\b[^;&|\n]*?(\/\S+)/.exec(command)
  if (flock && prodPath(flock[1]!)) return `\`flock ${flock[1]}\` takes a lock production may wait on.`
  if (deployScript.test(command)) return "It runs a TweetStream deploy script."
  if (liveRun.test(command)) return "It runs a live smoke, soak, or probe against production upstreams."
  if (rootKill.test(command)) return "`kill` as root can stop a production process."
  for (const c of commands(command, { cwd, home, remote: false })) {
    if (c.ctx.remote || c.ctx.container === "scratch" || c.ctx.container === "run") continue
    const reason = check(c, inspect)
    if (reason) return reason
  }
}

/** Ask reason for an Edit or Write call: the target path, when production reads it. */
export const fileReason = (path: string) => (prodPath(path) ? `It edits ${path}, which production reads.` : undefined)

const ask = (reason: string) =>
  JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: `Production: ${reason} ${okHint}` } })

/** Returns the JSON line to print, if any. */
export function handle(input: string, env: Record<string, string | undefined> = process.env, inspect: Inspect = inspectLabels): string | undefined {
  if (env.AGENT_PROD_OK === "1") return
  let parsed: { tool_name?: unknown; tool_input?: { command?: unknown; file_path?: unknown }; cwd?: unknown }
  try {
    parsed = JSON.parse(input)
  } catch {
    console.error("prod-guard: unparseable hook input; allowing")
    return
  }
  const toolInput = parsed?.tool_input ?? {}
  const cwd = typeof parsed?.cwd === "string" ? parsed.cwd : undefined
  try {
    if (typeof toolInput.command === "string") {
      const reason = askReason(toolInput.command, cwd, env.HOME, inspect)
      return reason ? ask(reason) : undefined
    }
    if (typeof toolInput.file_path === "string") {
      const reason = fileReason(toolInput.file_path)
      return reason ? ask(reason) : undefined
    }
  } catch (error) {
    return ask(`the guard failed (${error instanceof Error ? error.message : String(error)}), so it cannot tell whether the command is safe.`)
  }
}

if (import.meta.main) {
  const output = handle(await Bun.stdin.text())
  if (output) console.log(output)
  process.exit(0)
}
