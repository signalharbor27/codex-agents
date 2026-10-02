#!/usr/bin/env bun

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { harnessHash, parseClaudeTrace, sha256, sourceProvenance } from "./eval-evidence.ts"
import {
  CLAUDE_LIVE_MODEL,
  LIVE_REASONING_EFFORT,
  claudeEnv,
  claudeExecArgs,
  claudeRoutingMarker,
  collectSubprocess,
  shutdownCleanups,
  validateModelOptions,
} from "./run-routing-evals.ts"
import { STANDARDS_CASES, STANDARDS_CATEGORIES, type PlantedDefect, type StandardsCase, type StandardsCategory } from "./standards-cases.ts"

const DEFAULT_SOURCE_ROOT = resolve(import.meta.dir, "../..")
export const STANDARDS_RELATIVE_PATH = "skills/review-and-simplify-changes/references/coding-standards.md"
const REVIEWER_PROFILE_PATH = "agents/reviewer.toml"
const LIVE_TIMEOUT_MS = 300_000
// A defect case fails when more than this many findings match no plant.
export const MAX_STANDARDS_EXTRAS = 1

export const STANDARDS_ISOLATION =
  "fixture cwd + setting-sources=project; --add-dir exposes only the fixture repo and a temp copy of coding-standards.md, the docs it names, and the reviewer profile (no source skills tree, no eval fixtures or judge); user settings/CLAUDE.md/skills/agents/hooks, MCP, slash commands, and auto memory excluded; ~/.claude.json, managed policy, and builtin plugins still load"

const CATEGORY_MEANINGS: Record<StandardsCategory, string> = {
  "tautological-test": "test re-asserts a constant, literal, or value computed by the code under test",
  "structure-sensitive-test": "test reads source text or asserts internal structure instead of observable behaviour",
  "cannot-fail-test": "test stubs the unit's own risky dependency or asserts something any implementation satisfies",
  "private-path-test": "test reaches internals while a public seam can observe the behaviour",
  "slop-comment": "comment restates code, narrates the change or its history, or pads without explaining why",
  "shallow-module": "module whose interface is about as large as what it hides, leaving callers to orchestrate",
  "pass-through-layer": "wrapper or mapping that forwards calls or copies fields unchanged",
  "hypothetical-seam": "interface, factory, or option with one implementation",
  "scattered-invariant": "one rule enforced in several places",
  "lost-locality": "flow split across one-use helpers or tiny files",
  "weak-error-handling": "catch, fallback, default, cast, or weak type that hides a failure or a known shape",
  "correctness-bug": "behaviour that is wrong for a plausible input",
  other: "any other actionable defect a standard covers",
}

export const STANDARDS_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "category", "summary"],
        properties: {
          file: { type: "string" },
          category: { type: "string", enum: [...STANDARDS_CATEGORIES] },
          summary: { type: "string" },
        },
      },
    },
  },
} as const

export type StandardsFinding = { file: string; category: StandardsCategory; summary: string }
export type StandardsVerdict = {
  pass: boolean
  // "no-evidence": a finding had the right file and category but its summary named none of the plant's evidence tokens.
  missing: { category: StandardsCategory; files: string[]; reason: "not-found" | "no-evidence" }[]
  // Control-case findings; every one fails the control.
  false_positives: StandardsFinding[]
  // Findings in defect cases that match no plant; more than MAX_STANDARDS_EXTRAS fails the case.
  extra: StandardsFinding[]
}

type CliOptions = {
  mode: "dry-run" | "live"
  caseIds: string[]
  all: boolean
  allowLive: boolean
  sourceRoot: string
  model: string
  effort: string
}

function usage(): never {
  console.error(`Usage:
  bun skills/evals/run-standards-evals.ts dry-run [--case ID]... [--all] [--source-root PATH]
  bun skills/evals/run-standards-evals.ts live (--case ID... | --all) --allow-live [--model MODEL] [--effort EFFORT] [--source-root PATH]

Live mode runs claude -p (${CLAUDE_LIVE_MODEL} at ${LIVE_REASONING_EFFORT}) with read-only tools against each disposable fixture.`)
  process.exit(2)
}

export function parseArgs(argv: string[]): CliOptions {
  const mode = argv.shift()
  if (mode !== "dry-run" && mode !== "live") usage()
  const options: CliOptions = { mode, caseIds: [], all: false, allowLive: false, sourceRoot: DEFAULT_SOURCE_ROOT, model: CLAUDE_LIVE_MODEL, effort: LIVE_REASONING_EFFORT }
  while (argv.length > 0) {
    const arg = argv.shift()
    if (arg === "--case") options.caseIds.push(argv.shift() ?? usage())
    else if (arg === "--all") options.all = true
    else if (arg === "--allow-live") options.allowLive = true
    else if (arg === "--source-root") options.sourceRoot = resolve(argv.shift() ?? usage())
    else if (arg === "--model") options.model = argv.shift() ?? usage()
    else if (arg === "--effort") options.effort = argv.shift() ?? usage()
    else usage()
  }
  validateModelOptions(options.model, options.effort, "claude")
  if (options.all && options.caseIds.length) usage()
  for (const id of options.caseIds) if (!STANDARDS_CASES.some(entry => entry.id === id)) throw new Error(`unknown case id: ${id}`)
  if (mode === "live" && !options.all && !options.caseIds.length) throw new Error("live mode requires --case ID or --all")
  if (mode === "live" && !options.allowLive) throw new Error("live mode requires --allow-live because it makes external model calls")
  return options
}

export function selectCases(options: Pick<CliOptions, "caseIds">): StandardsCase[] {
  return options.caseIds.length ? STANDARDS_CASES.filter(entry => options.caseIds.includes(entry.id)) : STANDARDS_CASES
}

async function git(directory: string, ...args: string[]): Promise<string> {
  const child = Bun.spawn({ cmd: ["git", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], cwd: directory, stdin: "ignore", stdout: "pipe", stderr: "pipe", env: { ...process.env, GIT_AUTHOR_NAME: "fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid", GIT_COMMITTER_NAME: "fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid" } })
  const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed (${exitCode}): ${stderr.trim()}`)
  return stdout
}

async function writeFiles(root: string, files: Record<string, string>): Promise<void> {
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), contents)
  }
}

// Commits `before`, writes `after`, and returns the uncommitted diff including new files.
export async function prepareFixture(entry: StandardsCase, directory: string): Promise<string> {
  await writeFiles(directory, entry.before)
  await git(directory, "init", "-q", "-b", "main")
  await git(directory, "add", "-A")
  await git(directory, "commit", "-q", "-m", "Initial fixture")
  await writeFiles(directory, entry.after)
  await git(directory, "add", "-N", ".")
  return git(directory, "diff", "--no-color", "--no-ext-diff")
}

async function withTempDir<T>(prefix: string, run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  const cleanup = () => rm(directory, { recursive: true, force: true })
  shutdownCleanups.add(cleanup)
  try {
    return await run(directory)
  } finally {
    shutdownCleanups.delete(cleanup)
    await cleanup()
  }
}

// The directory name is neutral: the model sees it, so it must not reveal the case or its expected outcome.
export function withFixture<T>(entry: StandardsCase, run: (directory: string, diff: string) => Promise<T>): Promise<T> {
  return withTempDir("standards-fixture-", async directory => run(directory, await prepareFixture(entry, directory)))
}

// Skill-relative Markdown paths that coding-standards.md names in backticks, such as
// `engineering/references/proof.md` or `review-and-simplify-changes/SKILL.md`.
export function standardsDocReferences(standards: string): string[] {
  return [...new Set([...standards.matchAll(/`([a-z0-9-]+\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.md)`/g)].map(match => match[1]!))]
}

export type StandardsDocs = { root: string; standardsPath: string; reviewerProfilePath: string; files: string[] }

// Copies the standards, the docs they name, and the reviewer profile into `root`, keeping skill-relative
// layout. The reviewer reads only this copy, never the source tree that also holds the eval cases.
export async function stageStandardsDocs(sourceRoot: string, root: string): Promise<StandardsDocs> {
  const skillsRoot = join(sourceRoot, "skills")
  const standardsRelative = relative(skillsRoot, join(sourceRoot, STANDARDS_RELATIVE_PATH))
  const standards = await readFile(join(skillsRoot, standardsRelative), "utf8")
  const files = [standardsRelative, ...standardsDocReferences(standards)]
  for (const file of files) {
    await mkdir(dirname(join(root, file)), { recursive: true })
    await copyFile(join(skillsRoot, file), join(root, file)).catch(error => {
      throw new Error(`${STANDARDS_RELATIVE_PATH} names ${file}, which is missing from ${skillsRoot}: ${error instanceof Error ? error.message : String(error)}`)
    })
  }
  await mkdir(join(root, "agents"), { recursive: true })
  await copyFile(join(sourceRoot, REVIEWER_PROFILE_PATH), join(root, REVIEWER_PROFILE_PATH))
  return { root, standardsPath: join(root, standardsRelative), reviewerProfilePath: join(root, REVIEWER_PROFILE_PATH), files: [...files, REVIEWER_PROFILE_PATH] }
}

export function withStandardsDocs<T>(sourceRoot: string, run: (docs: StandardsDocs) => Promise<T>): Promise<T> {
  return withTempDir("review-docs-", root => stageStandardsDocs(sourceRoot, root).then(run))
}

export function buildStandardsPrompt(diff: string, fixtureRoot: string, standardsPath: string): string {
  const categories = STANDARDS_CATEGORIES.map(id => `- ${id}: ${CATEGORY_MEANINGS[id]}`).join("\n")
  return `Review the uncommitted change in the repository at ${fixtureRoot}. The diff is below; read files there for context.

Apply the coding standards in ${standardsPath}. Read that file first, and read CODING_STANDARDS.md at the repository root when present. Report every actionable finding in code the diff adds or changes, including defects the standards do not name. Return an empty findings array when nothing is actionable; do not report praise, preferences no standard covers, or pre-existing code.

For each finding return:
- file: path relative to the repository root
- category: exactly one of these ids
${categories}
- summary: one sentence naming the problem and the fix

This is a read-only review. Do not edit files.

<diff>
${diff}</diff>`
}

export function reviewerInstructions(contents: string): string {
  const profile = Bun.TOML.parse(contents) as { developer_instructions?: unknown }
  if (typeof profile.developer_instructions !== "string" || !profile.developer_instructions.trim()) {
    throw new Error("reviewer profile lacks developer_instructions")
  }
  return profile.developer_instructions.trim()
}

export function parseStandardsResult(text: string): StandardsFinding[] {
  let value: unknown
  try {
    value = JSON.parse(text.trim())
  } catch {
    throw new Error(`reviewer did not return JSON: ${text.trim().slice(0, 500)}`)
  }
  if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).join() !== "findings") {
    throw new Error("reviewer result must be an object with exactly findings")
  }
  const findings = (value as { findings: unknown }).findings
  if (!Array.isArray(findings)) throw new Error("reviewer findings must be an array")
  return findings.map((finding, index) => {
    const record = finding as Record<string, unknown>
    if (typeof record?.file !== "string" || typeof record.summary !== "string" || !STANDARDS_CATEGORIES.includes(record.category as StandardsCategory)) {
      throw new Error(`reviewer finding ${index} must have file, a known category, and summary`)
    }
    return { file: record.file, category: record.category as StandardsCategory, summary: record.summary }
  })
}

export function normalizeFindingPath(file: string, fixtureRoot = ""): string {
  let path = file.trim().replace(/:\d+(?::\d+)?$/, "")
  if (fixtureRoot && path.startsWith(fixtureRoot)) path = relative(fixtureRoot, path)
  return path.replace(/^(?:\.\/|[ab]\/)/, "")
}

export function judgeStandards(entry: StandardsCase, findings: StandardsFinding[], fixtureRoot = ""): StandardsVerdict {
  const located = findings.map(finding => ({ ...finding, file: normalizeFindingPath(finding.file, fixtureRoot) }))
  if (entry.planted.length === 0) return { pass: located.length === 0, missing: [], false_positives: located, extra: [] }
  const locates = (plant: PlantedDefect, finding: StandardsFinding) =>
    (plant.accept ?? [plant.category]).includes(finding.category) && plant.files.includes(finding.file)
  const evidences = (plant: PlantedDefect, finding: StandardsFinding) =>
    plant.evidence.some(token => finding.summary.toLowerCase().includes(token.toLowerCase()))
  const missing: StandardsVerdict["missing"] = []
  for (const plant of entry.planted) {
    const candidates = located.filter(finding => locates(plant, finding))
    if (!candidates.some(finding => evidences(plant, finding))) missing.push({ category: plant.category, files: plant.files, reason: candidates.length ? "no-evidence" : "not-found" })
  }
  const extra = located.filter(finding => !entry.planted.some(plant => locates(plant, finding)))
  return { pass: missing.length === 0 && extra.length <= MAX_STANDARDS_EXTRAS, missing, false_positives: [], extra }
}

export function standardsExecArgs(options: { model: string; effort: string; instructions: string; fixtureRoot: string; docsRoot: string }): string[] {
  return claudeExecArgs({
    model: options.model,
    effort: options.effort,
    schema: JSON.stringify(STANDARDS_RESULT_SCHEMA),
    instructions: options.instructions,
    addDirs: [options.fixtureRoot, options.docsRoot],
  })
}

export async function runStandardsCase(entry: StandardsCase, options: Pick<CliOptions, "mode" | "model" | "effort" | "sourceRoot">, base: Record<string, unknown>) {
  return withStandardsDocs(options.sourceRoot, async docs => {
    const [standards, reviewerProfile] = await Promise.all([readFile(docs.standardsPath, "utf8"), readFile(docs.reviewerProfilePath, "utf8")])
    const instructions = reviewerInstructions(reviewerProfile)
    return withFixture(entry, async (fixtureRoot, diff) => {
      const prompt = buildStandardsPrompt(diff, fixtureRoot, docs.standardsPath)
      // Temp roots differ per run; hash the prompt with them replaced so equal inputs hash equally.
      const stablePrompt = prompt.replaceAll(docs.root, "<DOCS_ROOT>").replaceAll(fixtureRoot, "<FIXTURE_ROOT>")
      const provenance = { ...base, standards_docs: docs.files, standards_hash: sha256(standards), reviewer_hash: sha256(instructions), diff_hash: sha256(diff), prompt_hash: sha256(stablePrompt) }
      if (options.mode === "dry-run") {
        const args = standardsExecArgs({ model: options.model, effort: options.effort, instructions: "<SOURCE_REVIEWER_INSTRUCTIONS>", fixtureRoot: "<FIXTURE_ROOT>", docsRoot: "<DOCS_ROOT>" })
        return { ...provenance, external_call: false, would_execute: args, cwd: "<FIXTURE_ROOT>", stdin: "<STANDARDS_REVIEW_PROMPT>", diff_files: [...diff.matchAll(/^diff --git a\/(\S+)/gm)].map(match => match[1]), planted: entry.planted }
      }
      const args = standardsExecArgs({ model: options.model, effort: options.effort, instructions, fixtureRoot, docsRoot: docs.root })
      const started = performance.now()
      const child = Bun.spawn({ cmd: args, cwd: fixtureRoot, env: claudeEnv(), stdin: new Blob([prompt]), stdout: "pipe", stderr: "pipe" })
      const { stdout, stderr, exitCode } = await collectSubprocess(child, `claude -p for ${entry.id}`, LIVE_TIMEOUT_MS, args[0]?.endsWith("setsid") ?? false)
      if (exitCode !== 0) throw new Error(`claude -p failed for ${entry.id} (${exitCode}): ${stderr.trim() || stdout.trim().slice(0, 500)}`)
      const trace = parseClaudeTrace(stdout)
      trace.elapsed_ms = Math.round(performance.now() - started)
      try {
        const findings = parseStandardsResult(trace.messages.at(-1)!)
        return { ...provenance, findings, verdict: judgeStandards(entry, findings, fixtureRoot), trace }
      } catch (error) {
        return { ...provenance, findings: null, verdict: null, failures: [error instanceof Error ? error.message : String(error)], trace }
      }
    })
  })
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  if (options.mode === "live" && !Bun.which("claude")) throw new Error("live mode requires the claude executable on PATH")
  const [provenance, harness_hash] = await Promise.all([sourceProvenance(options.sourceRoot), harnessHash()])
  let failed = false
  for (const entry of selectCases(options)) {
    const base = { case: entry.id, harness: "claude", ...provenance, harness_hash, fixture_hash: sha256(JSON.stringify(entry)), model: options.model, reasoning_effort: options.effort, host_native_discovery: STANDARDS_ISOLATION, claude_routing: claudeRoutingMarker() }
    try {
      const record = await runStandardsCase(entry, options, base)
      console.log(JSON.stringify(record))
      if (options.mode === "live" && !("verdict" in record && record.verdict?.pass)) failed = true
    } catch (error) {
      failed = true
      console.log(JSON.stringify({ ...base, error: error instanceof Error ? error.message : String(error) }))
    }
  }
  if (failed) process.exitCode = 1
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
