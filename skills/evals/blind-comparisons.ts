#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { join } from "node:path"
import { sha256 } from "./eval-evidence.ts"

// Alternate within repetitions, with a stable case-dependent first position.
export function comparisonOrder<T>(sources: T[], caseId: string, repetition: number): T[] {
  return (parseInt(sha256(caseId).slice(0, 2), 16) + repetition) % 2 ? [...sources].reverse() : [...sources]
}

export function blindPackets(rows: any[], token = randomUUID()) {
  const groups = new Map<string, any[]>()
  for (const row of rows) {
    const key = `${row.case}:${row.repetition ?? 1}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  const packets: unknown[] = [], provenance: unknown[] = []
  for (const [key, pair] of groups) {
    if (pair.length !== 2 || !pair.some(r => r.source === "previous") || !pair.some(r => r.source === "candidate")) throw Error(`expected previous/candidate pair: ${key}`)
    // Source labels, source hashes, prompt text, instructions and rollout paths
    // belong only in the private key. Preserve task evidence in the judge packet.
    const ordered = comparisonOrder([...pair].sort((a, b) => a.source.localeCompare(b.source)), `${token}:${pair[0].case}`, pair[0].repetition ?? 1)
    const id = sha256(`${token}:${key}`).slice(0, 16)
    const samples = ordered.map((row, index) => {
      const label = index === 0 ? "A" : "B"
      const rawTrace = row.evidence?.trace ?? row.trace
      const scrubTrace = (trace: any) => trace && { ...trace, commands: trace.commands?.map((command: any) => /(?:\.agents\/skills|skills\/|SKILL\.md|AGENTS\.md)/.test(command.command) ? { ...command, output: "<INSTRUCTION READ OMITTED>" } : command) }
      const trace = scrubTrace(rawTrace)
      const coldRaw = row.cold_raw && { ...row.cold_raw, stdout: row.cold_raw.stdout.split("\n").map((line: string) => {
        try {
          const event = JSON.parse(line)
          const item = event.item
          if (item?.type === "command_execution" && /(?:\.agents\/skills|skills\/|SKILL\.md|AGENTS\.md)/.test(item.command ?? "")) item.aggregated_output = "<INSTRUCTION READ OMITTED>"
          return JSON.stringify(event)
        } catch { return line }
      }).join("\n") }

      const roots = [row.source_root, row.skills_root, ...(JSON.stringify(row).match(/\/[^\s"\\]*skill-execution-eval-[^/\s"\\]+/g) ?? [])].filter(Boolean).sort((a, b) => b.length - a.length)
      const neutralize = (value: unknown) => {
        let text = JSON.stringify(value)
        for (const root of roots) text = text.split(root).join("<PROJECT>")
        return JSON.parse(text)
      }
      provenance.push({ id, label, original: row })
      const artifacts = Object.fromEntries(Object.entries(row.artifacts ?? {}).filter(([path]) => !path.startsWith(".agents/") && path !== "AGENTS.md"))
      return neutralize({ label, trace, cold_trace: scrubTrace(row.evidence?.cold?.trace), cold_raw: coldRaw, artifacts, oracle: row.evidence?.oracle ?? row.oracle, failures: row.verdict?.failures, runner_error: row.status === "runner-error" ? { stage: row.stage, error: row.error } : undefined })
    })
    packets.push({ id, case: pair[0].case, rubric: pair[0].verdict?.rubric ?? pair[0].rubric, samples })
  }
  return { packets, provenance }
}

if (import.meta.main) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output) throw Error("usage: bun blind-comparisons.ts results.jsonl NEW_OUTPUT_DIRECTORY")
  const rows = (await readFile(input, "utf8")).trim().split("\n").map(line => JSON.parse(line))
  const result = blindPackets(rows)
  // Refuse overwrite; keep the identity key separate from the grader's input.
  await mkdir(output)
  await writeFile(join(output, "judge.json"), JSON.stringify(result.packets, null, 2))
  await writeFile(join(output, "private-provenance.json"), JSON.stringify(result.provenance, null, 2), { mode: 0o600 })
}
