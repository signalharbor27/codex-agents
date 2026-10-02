import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

export function sha256(contents: string): string {
  return createHash("sha256").update(contents).digest("hex")
}

async function digestTree(root: string, prefix = ""): Promise<[string, string][]> {
  const result: [string, string][] = []
  const entries = await readdir(join(root, prefix), { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "evals" || entry.name === ".git") continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) result.push(...await digestTree(root, path))
    else if (entry.isFile()) result.push([path, sha256(await readFile(join(root, path), "utf8"))])
  }
  return result
}

export async function readAgentProfileFiles(sourceRoot: string) {
  const agentsRoot = join(sourceRoot, "agents")
  let filenames: string[]
  try {
    filenames = await readdir(agentsRoot)
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return []
    throw error
  }
  return Promise.all(filenames.filter(name => name.endsWith(".toml") && name !== "registry.toml").sort().map(async filename => {
    const path = join(agentsRoot, filename)
    return { filename, path, contents: await readFile(path, "utf8") }
  }))
}

export async function sourceProvenance(sourceRoot: string, skillsRoot = join(sourceRoot, "skills")) {
  const [skills, agents, profileFiles] = await Promise.all([
    digestTree(skillsRoot),
    readFile(join(sourceRoot, "AGENTS.md"), "utf8"),
    readAgentProfileFiles(sourceRoot),
  ])
  const profiles = profileFiles.map(({ filename, contents }) => [filename, sha256(contents)])
  return { source_root: sourceRoot, skills_root: skillsRoot, source_hash: sha256(JSON.stringify({ skills, agents, profiles })), agents_hash: sha256(agents) }
}

export type Trace = {
  commands: { command: string; output: string; exitCode: number | null }[]
  messages: string[]
  usage?: Record<string, unknown> | null
  elapsed_ms?: number
}

// Command records preserve practical evidence of skill/reference reads. They are
// not a filesystem audit: other tool types may also read files.
export function parseTrace(stdout: string): Trace {
  const trace: Trace = { commands: [], messages: [], usage: null }
  let completed = false
  for (const line of stdout.trim().split("\n")) {
    if (!line.trim()) continue
    const event = JSON.parse(line)
    if (event.type === "turn.failed" || event.type === "error") throw new Error(`model execution failed: ${line}`)
    if (event.type === "turn.completed") {
      completed = true
      trace.usage = event.usage ?? null
    }
    if (event.type !== "item.completed") continue
    const item = event.item
    if (item?.type === "command_execution") {
      if (typeof item.command !== "string" || typeof item.aggregated_output !== "string") throw new Error("malformed command evidence")
      trace.commands.push({ command: item.command, output: item.aggregated_output, exitCode: item.exit_code ?? null })
    }
    if (item?.type === "agent_message" && typeof item.text === "string") trace.messages.push(item.text)
  }
  if (!completed || !trace.messages.length) throw new Error("execution trace lacks completed turn or assistant response")
  return trace
}

export async function harnessHash(): Promise<string> {
  const entries = (await readdir(import.meta.dir)).filter(name => /\.(?:ts|json|sh)$/.test(name)).sort()
  return sha256(JSON.stringify(await Promise.all(entries.map(async name => [name, await readFile(join(import.meta.dir, name), "utf8")]))))
}

export type ClaudeTrace = Trace & {
  // Session init evidence (tools, skills, agents, MCP servers, model) for auditing isolation.
  init?: Record<string, unknown> | null
  result_meta?: Record<string, unknown>
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content.map(block => (block && typeof block === "object" && "text" in block && typeof block.text === "string" ? block.text : "")).join("")
}

// Parses `claude -p --output-format json` output: a single result object, or with --verbose an array
// of session messages ending in the result. Tool calls are recorded as command evidence.
export function parseClaudeTrace(stdout: string): ClaudeTrace {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout.trim())
  } catch {
    throw new Error(`claude -p did not return JSON: ${stdout.trim().slice(0, 500)}`)
  }
  const events = (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, any>[]
  const result = events.findLast(event => event?.type === "result")
  if (!result) throw new Error("claude -p output lacks a result message")
  if (result.is_error || result.subtype !== "success") {
    throw new Error(`model execution failed: ${result.subtype ?? "error"} ${String(result.result ?? result.errors ?? "").slice(0, 500)}`)
  }
  const init = events.find(event => event?.type === "system" && event.subtype === "init") ?? null
  const trace: ClaudeTrace = { commands: [], messages: [], usage: result.usage ?? null, init: init && { model: init.model, tools: init.tools, skills: init.skills, slash_commands: init.slash_commands, agents: init.agents, mcp_servers: init.mcp_servers, plugins: init.plugins, permission_mode: init.permissionMode, claude_code_version: init.claude_code_version } }
  trace.result_meta = { duration_ms: result.duration_ms, duration_api_ms: result.duration_api_ms, num_turns: result.num_turns, total_cost_usd: result.total_cost_usd, model_usage: result.modelUsage }
  const pending = new Map<string, Trace["commands"][number]>()
  for (const event of events) {
    const content = event?.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (event.type === "assistant" && block?.type === "tool_use") {
        const command = { command: `${block.name} ${JSON.stringify(block.input ?? {})}`, output: "", exitCode: null as number | null }
        trace.commands.push(command)
        if (typeof block.id === "string") pending.set(block.id, command)
      } else if (event.type === "user" && block?.type === "tool_result") {
        const command = pending.get(block.tool_use_id)
        if (command) {
          command.output = textOf(block.content).slice(0, 4000)
          command.exitCode = block.is_error ? 1 : 0
        }
      }
    }
  }
  const structured = result.structured_output
  const message = structured !== undefined && structured !== null ? JSON.stringify(structured) : typeof result.result === "string" ? result.result : ""
  if (!message.trim()) throw new Error("claude -p result has no structured output or text")
  trace.messages.push(message)
  return trace
}
