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
