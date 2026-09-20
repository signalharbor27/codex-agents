#!/usr/bin/env bun
import { cp, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { captureProcess, oracleArgs, snapshot } from "./run-judgment-evals.ts"
import { executionArgs, inSandbox } from "./run-execution-evals.ts"
import { discoverSkills, skillCatalog, LIVE_MODEL, LIVE_REASONING_EFFORT } from "./run-routing-evals.ts"
import { harnessHash, parseTrace, sha256, sourceProvenance } from "./eval-evidence.ts"

export const CONTRACT = "Invoices have globally unique IDs. Every request, including a warm cache hit, must authorize session.tenant against invoice.tenant. Cache values must survive allowed hits. Only access.mjs may change. No external actions.\n"
export const INITIAL = "const cache = new Map(); export function get(session, invoice) { if (session.tenant !== invoice.tenant) throw Error('denied'); if (!cache.has(invoice.id)) cache.set(invoice.id, invoice); return cache.get('invoice'); }\n"
// Deliberately applied after a real model repair, to test delta review detection.
export const INJECTED = "const cache = new Map(); export function get(session, invoice) { if (cache.has(invoice.id)) return cache.get(invoice.id); if (session.tenant !== invoice.tenant) throw Error('denied'); cache.set(invoice.id, invoice); return invoice; }\n"
export const CYCLE_ORACLE = `import {get} from './access.mjs';
function fail(reason) { console.log('FAIL contract: ' + reason); process.exit(42); }
const invoice = {id:'one',tenant:'a'};
let coldDenied = false; try { get({tenant:'b'},{id:'cold',tenant:'a'}); } catch { coldDenied = true; }
if (!coldDenied) fail('cold unauthorized cache miss');
if (get({tenant:'a'},invoice) !== invoice || get({tenant:'a'},invoice) !== invoice) fail('allowed path broken');
if (get({tenant:'a'},{id:'one',tenant:'a'}) !== invoice) fail('cache value not retained');
let denied = false; try { get({tenant:'b'},invoice); } catch { denied = true; }
if (!denied) fail('warm unauthorized cache hit');
console.log('PASS case oracle');`

export async function reviewCycle(sourceRoot: string, dry = false, execute = captureProcess) {
  return inSandbox(async directory => {
    await cp(join(sourceRoot, "AGENTS.md"), join(directory, "AGENTS.md"))
    for (const skill of await discoverSkills(join(sourceRoot, "skills"))) await cp(join(sourceRoot, "skills", skill), join(directory, ".agents/skills", skill), { recursive: true })
    await writeFile(join(directory, "contract.md"), CONTRACT)
    await writeFile(join(directory, "access.mjs"), INITIAL)
    const catalog = await skillCatalog(join(directory, ".agents/skills"), await discoverSkills(join(directory, ".agents/skills")))
    const phases = [
      { id: "full-review", readOnly: true, prompt: "Review access.mjs against contract.md. Report substantive defects and a concrete reproducer. You are an independent reviewer; do not edit or delegate." },
      { id: "repair", readOnly: false, prompt: "Repair access.mjs to satisfy contract.md and the preceding review. You are the assigned implementer; the harness owns independent review. Do not delegate. Preserve all other files." },
      { id: "delta-review", readOnly: true, prompt: "Independently review the current access.mjs changes against the previously reviewed snapshot and contract.md. Check affected assumptions and demonstrate any new defect, including its concrete input. Do not edit or delegate." },
      { id: "repair-regression", readOnly: false, prompt: "Repair the current access.mjs using the delta review and contract.md. Preserve working behavior. You are the assigned implementer; the harness owns independent review. Do not delegate or change other files." },
      { id: "final-review", readOnly: true, prompt: "Independently review the final access.mjs against contract.md, both earlier findings, and the snapshots. Determine whether the fixes introduce defects and whether final contract coverage is complete. Do not edit or delegate." },
    ]
    if (dry) return { phases, fault_injection: INJECTED, oracle: CYCLE_ORACLE, model: LIVE_MODEL, effort: LIVE_REASONING_EFFORT }
    const initialHashes = await snapshot(directory)
    const threads = new Set<string>()
    const results: any[] = []
    let previous = "", reviewed = INITIAL, stage = "setup"
    try {
    for (const phase of phases) {
      stage = `${phase.id}:prepare`
      if (phase.id === "delta-review") {
        const repaired = await readFile(join(directory, "access.mjs"), "utf8")
        await writeFile(join(directory, "access.mjs"), INJECTED)
        results.push({ phase: "fault-injection", prior: repaired, current: INJECTED, prior_hash: sha256(repaired), current_hash: sha256(INJECTED) })
      }
      const before = await readFile(join(directory, "access.mjs"), "utf8")
      const prompt = `${phase.prompt}\nAvailable skills:\n${catalog}\nPrevious reviewed snapshot:\n${reviewed}\nPrior review evidence:\n${previous}`
      const args = executionArgs(directory, prompt, LIVE_MODEL, LIVE_REASONING_EFFORT, phase.readOnly)
      const item: any = { phase: phase.id, before, before_hash: sha256(before), prompt_hash: sha256(prompt) }
      results.push(item)
      stage = `${phase.id}:model`
      const raw = await execute(args, directory, phase.id, 180_000)
      item.raw = raw
      stage = `${phase.id}:snapshot`
      const after = await readFile(join(directory, "access.mjs"), "utf8")
      item.after = after
      item.after_hash = sha256(after)
      if (raw.error || raw.exitCode !== 0) return { status: "runner-error", results, error: raw.error ?? `exit ${raw.exitCode}` }
      stage = `${phase.id}:trace`
      item.trace = parseTrace(raw.stdout)
      const thread = raw.stdout.split("\n").filter(Boolean).map(line => JSON.parse(line)).find(event => event.type === "thread.started")?.thread_id
      if (typeof thread !== "string" || threads.has(thread)) return { status: "evidence-failed", results, error: "missing or reused independent session identity" }
      threads.add(thread)
      item.thread_id = thread
      item.artifact_hashes = await snapshot(directory)
      if ([...new Set([...Object.keys(initialHashes), ...Object.keys(item.artifact_hashes)])].some(path => path !== "access.mjs" && initialHashes[path] !== item.artifact_hashes[path])) return { status: "evidence-failed", results, error: "protected fixture changed" }
      if (phase.readOnly && before !== after) return { status: "evidence-failed", results, error: "reviewer changed implementation" }
      if (await readFile(join(directory, "contract.md"), "utf8") !== CONTRACT) return { status: "evidence-failed", results, error: "contract changed" }
      previous += `\n${phase.id}: ${item.trace.messages.join("\n")}`
      if (phase.id === "full-review") reviewed = before
      if (phase.id === "repair") {
        stage = `${phase.id}:oracle`
        item.oracle = await execute(oracleArgs(CYCLE_ORACLE), directory, "initial repair oracle", 10_000)
        if (item.oracle.error || item.oracle.exitCode !== 0 || !item.oracle.stdout.includes("PASS case oracle") || before === after) return { status: "evidence-failed", results, error: "initial repair failed before fault injection" }
      }
      if (phase.id === "delta-review") {
        stage = `${phase.id}:oracle`
        item.oracle = await execute(oracleArgs(CYCLE_ORACLE), directory, "injected regression oracle", 10_000)
        if (item.oracle.error || item.oracle.exitCode !== 42 || item.oracle.stdout.trim() !== "FAIL contract: warm unauthorized cache hit") return { status: "evidence-failed", results, stage, error: "injected regression lacks expected contract failure" }
      }
      if (phase.id === "repair-regression") {
        stage = `${phase.id}:oracle`
        item.oracle = await execute(oracleArgs(CYCLE_ORACLE), directory, "final contract oracle", 10_000)
        if (item.oracle.error || item.oracle.exitCode !== 0 || !item.oracle.stdout.includes("PASS case oracle")) return { status: "evidence-failed", results, error: "final contract oracle failed" }
        reviewed = before
      }
    }
    } catch (error) { return { status: "runner-error", results, stage, error: String(error) } }
    return { status: "needs-transcript-assessment", results, rubric: ["Full independent review identifies the incorrect cache lookup and a reproducer.", "A real implementation turn repairs that defect before explicit harness fault injection.", "Independent delta review identifies the injected authorization bypass on a warm cross-tenant hit, with a concrete reproducer.", "Final repair satisfies the executable cold/warm access contract; independent final review covers the current snapshot and prior findings.", "Review quality is assessed from actual tool records and returned findings, not stage labels or oracle success alone."] }
  })
}

if (import.meta.main) {
  const [mode, ...args] = process.argv.slice(2)
  if (!['dry-run', 'live'].includes(mode ?? '') || (mode === 'live' && !args.includes('--allow-live'))) throw Error('choose dry-run or live --allow-live; optional --source-root PATH')
  const index = args.indexOf('--source-root')
  const root = index < 0 ? resolve(import.meta.dir, '../..') : resolve(args[index + 1]!)
  const result = await reviewCycle(root, mode === 'dry-run')
  console.log(JSON.stringify({ ...await sourceProvenance(root), harness_hash: await harnessHash(), ...result }))
  if ('status' in result && result.status !== 'needs-transcript-assessment') process.exitCode = 1
}
