#!/usr/bin/env bun
import { cp, readFile, readdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { CASES, type JudgmentCase } from "./judgment-cases.ts"
import { collectSubprocess, discoverSkills, skillCatalog, LIVE_MODEL, LIVE_REASONING_EFFORT, validateModelOptions } from "./run-routing-evals.ts"
import { executionArgs, inSandbox, readReviewRollout } from "./run-execution-evals.ts"
import { harnessHash, parseTrace, sha256, sourceProvenance, type Trace } from "./eval-evidence.ts"

export function options(argv: string[]) {
  const mode = argv.shift()
  if (mode !== "dry-run" && mode !== "live") throw Error("choose dry-run or live")
  let model = LIVE_MODEL, effort = LIVE_REASONING_EFFORT, sourceRoot = resolve(import.meta.dir, "../.."), previousSourceRoot: string | undefined
  let repeat = 1, all = false, allow = false
  const ids: string[] = []
  while (argv.length) {
    const flag = argv.shift()
    if (flag === "--all") { all = true; continue }
    if (flag === "--allow-live") { allow = true; continue }
    const value = argv.shift()
    if (!value || value.startsWith("--")) throw Error(`${flag} requires a value`)
    if (flag === "--case") ids.push(value)
    else if (flag === "--repeat") repeat = Number(value)
    else if (flag === "--model") model = value
    else if (flag === "--effort") effort = value
    else if (flag === "--source-root") sourceRoot = resolve(value)
    else if (flag === "--previous-source-root") previousSourceRoot = resolve(value)
    else throw Error(`unknown flag ${flag}`)
  }
  if (all === Boolean(ids.length)) throw Error("choose --all or one or more --case IDs")
  if (ids.some(id => !CASES.some(c => c.id === id))) throw Error("unknown case")
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 20) throw Error("repeat must be 1..20")
  if (mode === "live" && !allow) throw Error("live mode requires --allow-live")
  validateModelOptions(model, effort)
  return { mode, model, effort, sourceRoot, previousSourceRoot, repeat, cases: CASES.filter(c => all || ids.includes(c.id)) }
}

export type JudgmentEvidence = { trace: Trace; unchanged: boolean; oracle?: { exitCode: number; stdout: string; stderr: string }; review?: Awaited<ReturnType<typeof readReviewRollout>> }
// Evidence gates deliberately do not classify semantic correctness from keywords.
export function judge(c: JudgmentCase, e: JudgmentEvidence) {
  const failures: string[] = []
  if (!e.unchanged) failures.push("protected fixture changed or unexpected artifact created")
  if (!e.trace.messages.length) failures.push("missing response")
  for (const file of c.inspect) {
    if (!e.trace.commands.some(cmd => cmd.exitCode === 0 && cmd.command.includes(file) && cmd.output.trim())) failures.push(`missing observable inspection: ${file}`)
  }
  if (c.implementation) {
    if (!e.oracle || e.oracle.exitCode !== 0 || !e.oracle.stdout.includes("PASS restart oracle")) failures.push("independent restart oracle failed or missing")
    if (!e.review || e.review.reviewLifecycle.failures.length || !e.review.reviewLifecycle.reviews.length) failures.push("independent review lifecycle failed or missing")
  }
  return { status: failures.length ? "evidence-failed" : "needs-transcript-assessment", failures, rubric: c.rubric }
}

async function snapshot(root: string, prefix = ""): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path))
    else result[path] = sha256(await readFile(join(root, path), "utf8"))
  }
  return result
}

// Parent-owned oracle executes actual edited code with untouched legacy input.
export const ORACLE = `import { retries } from './worker.mjs';
import { readFileSync } from 'node:fs';
const old = JSON.parse(readFileSync('settings.json', 'utf8'));
for (const [input, expected] of [[old, 3], [{retries: '3'}, 3], [{retries: 3}, 3], [{retries: 0}, 0]]) {
  if (retries(input) !== expected) throw Error('restart contract failed');
}
console.log('PASS restart oracle');`

export function oracleArgs(): string[] {
  const sandbox = Bun.which("bwrap")
  if (!sandbox) throw Error("restart oracle requires bubblewrap; no unsandboxed fallback")
  const args = [sandbox, "--unshare-all", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", "--die-with-parent", "--new-session", "--", "bun", "--eval", ORACLE]
  const setsid = Bun.which("setsid")
  return setsid ? [setsid, ...args] : args
}

type CapturedProcess = { stdout: string; stderr: string; exitCode: number | null; error?: string }
export async function captureProcess(args: string[], directory: string, label: string, timeout: number): Promise<CapturedProcess> {
  const child = Bun.spawn({ cmd: args, cwd: directory, stdin: "ignore", stdout: "pipe", stderr: "pipe" })
  const [stdout, savedOut] = child.stdout.tee()
  const [stderr, savedErr] = child.stderr.tee()
  const capturedOut = new Response(savedOut).text(), capturedErr = new Response(savedErr).text()
  const processView = { pid: child.pid, get exitCode() { return child.exitCode }, exited: child.exited, kill: child.kill.bind(child), stdout, stderr }
  try {
    return await collectSubprocess(processView as Parameters<typeof collectSubprocess>[0], label, timeout, args[0]?.endsWith("setsid") ?? false)
  } catch (error) {
    return { stdout: await capturedOut, stderr: await capturedErr, exitCode: await child.exited, error: String(error) }
  } finally {
    await Promise.all([capturedOut, capturedErr])
  }
}

// Kept separate from fixture setup so failures at every execution stage can be tested without model calls.
export async function assessPrepared(c: JudgmentCase, directory: string, prompt: string, args: string[], dependencies = { execute: captureProcess, rollout: readReviewRollout }) {
  const before = await snapshot(directory)
  const mutable = (path: string) => Boolean(c.implementation && (path === "worker.mjs" || /^test-[^/]+\.mjs$/.test(path)))
  const protectedEqual = (after: Record<string, string>) => [...new Set([...Object.keys(before), ...Object.keys(after)])].every(path => mutable(path) || before[path] === after[path])
  const base = { prompt_hash: sha256(prompt), fixture_hash: sha256(JSON.stringify(c.files)) }
  const start = performance.now()
  let stage = "model", raw: CapturedProcess | undefined, oracleEnvironment: CapturedProcess | undefined, oracle: CapturedProcess | undefined, trace: Trace | undefined, review: JudgmentEvidence["review"]
  let preOracle: Record<string, string> | undefined, postOracle: Record<string, string> | undefined
  const artifacts = async () => {
    const hashes: Record<string, string> = {}, contents: Record<string, string> = {}, errors: Record<string, string> = {}
    const collect = async (prefix = "") => {
      let entries
      try { entries = await readdir(join(directory, prefix), { withFileTypes: true }) }
      catch (error) { errors[prefix || "."] = String(error); return }
      for (const entry of entries) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.isDirectory()) { await collect(path); continue }
        try {
          const text = await readFile(join(directory, path), "utf8")
          hashes[path] = sha256(text)
          if (mutable(path) || hashes[path] !== before[path]) contents[path] = text
        } catch (error) { errors[path] = String(error) }
      }
    }
    await collect()
    return { artifacts: contents, artifact_hashes: hashes, initial_hashes: before, artifact_errors: errors }
  }
  try {
    raw = await dependencies.execute(args, directory, c.id, c.implementation ? 600_000 : 180_000)
    if (raw.error || raw.exitCode !== 0) throw Error(raw.error ?? `codex exited ${raw.exitCode}`)
    stage = "parse-trace"
    trace = parseTrace(raw.stdout)
    trace.elapsed_ms = Math.round(performance.now() - start)
    stage = "pre-oracle-snapshot"
    preOracle = await snapshot(directory)
    if (c.implementation) {
      stage = "oracle-environment"
      const sandboxArgs = oracleArgs()
      oracleEnvironment = await dependencies.execute([...sandboxArgs.slice(0, -1), "process.exit(0)"], directory, "oracle environment", 10_000)
      if (oracleEnvironment.error || oracleEnvironment.exitCode !== 0) throw Error(oracleEnvironment.error ?? `oracle sandbox exited ${oracleEnvironment.exitCode}: ${oracleEnvironment.stderr}`)
      stage = "oracle"
      try {
        oracle = await dependencies.execute(sandboxArgs, directory, "restart oracle", 10_000)
        if (oracle.error) throw Error(oracle.error)
      } finally {
        postOracle = await snapshot(directory)
      }
      stage = "rollout"
      review = await dependencies.rollout(raw.stdout)
    }
    stage = "artifacts"
    const saved = await artifacts()
    const oracleIntact = !postOracle || JSON.stringify(postOracle) === JSON.stringify(preOracle)
    const evidence = { trace, unchanged: !Object.keys(saved.artifact_errors).length && protectedEqual(saved.artifact_hashes) && oracleIntact, oracle: oracle as JudgmentEvidence["oracle"], review }
    return { ...base, ...saved, evidence, verdict: judge(c, evidence), oracle_environment: oracleEnvironment, pre_oracle_hashes: preOracle, post_oracle_hashes: postOracle }
  } catch (error) {
    let saved: Partial<Awaited<ReturnType<typeof artifacts>>> = {}, artifact_error: string | undefined
    try { saved = await artifacts() } catch (captureError) { artifact_error = String(captureError) }
    return { ...base, ...saved, initial_hashes: before, status: "runner-error" as const, stage, error: String(error), raw, trace, oracle_environment: oracleEnvironment, oracle, review, pre_oracle_hashes: preOracle, post_oracle_hashes: postOracle, artifact_error, elapsed_ms: Math.round(performance.now() - start) }
  }
}

export async function run(c: JudgmentCase, sourceRoot: string, model: string, effort: string, dry: boolean) {
  return inSandbox(async directory => {
    const skills = await discoverSkills(join(sourceRoot, "skills"))
    for (const name of skills) await cp(join(sourceRoot, "skills", name), join(directory, ".agents/skills", name), { recursive: true })
    await cp(join(sourceRoot, "AGENTS.md"), join(directory, "AGENTS.md"))
    for (const [name, contents] of Object.entries(c.files)) await writeFile(join(directory, name), contents)
    const scope = c.implementation
      ? "Work only in this disposable project. You may edit worker.mjs and test-worker.mjs and add test files named test-*.mjs. Preserve persisted settings and all instructions. Independent reviews remain available and required by project guidance. No external actions, dependencies, or changes outside this fixture."
      : "This is a read-only task in a disposable project. Do not modify files or take external actions."
    const prompt = `${scope}\n\nAvailable skills:\n${await skillCatalog(join(directory, ".agents/skills"), skills)}\n\n${c.prompt}`
    const args = executionArgs(directory, prompt, model, effort, !c.implementation, Boolean(c.implementation))
    if (dry) return { prompt, command: args, rubric: c.rubric, fixture_hash: sha256(JSON.stringify(c.files)) }
    return assessPrepared(c, directory, prompt, args)
  })
}

if (import.meta.main) {
  try {
    const o = options(process.argv.slice(2)), harness = await harnessHash()
    let failed = false
    for (let repetition = 1; repetition <= o.repeat; repetition++) {
      for (const c of o.cases) {
        for (const source of [...(o.previousSourceRoot ? [{ label: "previous", root: o.previousSourceRoot }] : []), { label: "candidate", root: o.sourceRoot }]) {
          const provenance = await sourceProvenance(source.root)
          try {
            const result = await run(c, source.root, o.model, o.effort, o.mode === "dry-run")
            console.log(JSON.stringify({ case: c.id, source: source.label, repetition, model: o.model, effort: o.effort, harness_hash: harness, ...provenance, ...result }))
            if (("status" in result && result.status === "runner-error") || ("verdict" in result && result.verdict?.failures.length)) failed = true
          } catch (error) {
            failed = true
            console.log(JSON.stringify({ case: c.id, source: source.label, repetition, model: o.model, effort: o.effort, harness_hash: harness, ...provenance, status: "runner-error", error: String(error) }))
          }
        }
      }
    }
    if (failed) process.exitCode = 1
  } catch (error) { console.error(String(error)); process.exitCode = 1 }
}
