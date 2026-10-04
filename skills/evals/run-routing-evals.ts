#!/usr/bin/env bun

import { access, cp, mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { harnessHash, parseClaudeTrace, parseTrace, readAgentProfileFiles, sha256, sourceProvenance } from "./eval-evidence.ts"

const SCRIPT_DIR = import.meta.dir
const CASES_PATH = join(SCRIPT_DIR, "routing-cases.json")
const RESULT_SCHEMA_PATH = join(SCRIPT_DIR, "routing-result.schema.json")
const DEFAULT_SKILLS_ROOT = resolve(SCRIPT_DIR, "..")
export const LIVE_MODEL = "gpt-6-astra"
export const LIVE_REASONING_EFFORT = "high"
export const CLAUDE_LIVE_MODEL = "claude-opus-5-5"
export const HARNESSES = ["codex", "claude"] as const
export type Harness = (typeof HARNESSES)[number]
const CODEX_EFFORTS = ["low", "medium", "high", "xhigh", "max", "ultra"]
const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"]
// Read-only built-in tools; the claude harness never exposes Bash, Edit, Write, or Agent.
export const CLAUDE_READ_ONLY_TOOLS = "Read,Grep,Glob"
const LIVE_TIMEOUT_MS = 120_000
const CLAUDE_LIVE_TIMEOUT_MS = 300_000
const TERMINATION_GRACE_MS = 250
const SETSID = process.platform === "win32" ? null : Bun.which("setsid")

type ExpectationValue = string | string[]

type Expectations = {
  first_action: ExpectationValue
  mutation: ExpectationValue
  question: ExpectationValue
  stop: ExpectationValue
}

export type RoutingCase = {
  id: string
  prompt: string
  primary_skill: string
  expected_modifier_skills: string[]
  expected_references: string[]
  // References a correct route may load but need not, e.g. a path the skill names for reviewer briefs.
  optional_references?: string[]
  // Modifiers a correct route may name but need not, e.g. skills that delegated reviewers apply.
  optional_modifier_skills?: string[]
  required_actions: string[]
  forbidden_actions?: string[]
  expectations: Expectations
}

export type RoutingFixture = {
  version: number
  engineering_skills: string[]
  explicit_only_skills: string[]
  // Skills the host supplies outside this source tree (for example humanizer). A result may name them
  // as modifiers; the comparison ignores them, so naming one neither fails nor is required.
  host_skills: string[]
  skill_references: string[]
  invocation_coverage: Record<string, { positive: string[]; near_negative: string[] }>
  cases: RoutingCase[]
}

export type RoutingResult = {
  primary_skill: string
  modifier_skills: string[]
  references: string[]
  actions: string[]
  first_action: string
  mutation: string
  question: string
  stop: string
}

type ValidatedSuite = {
  fixture: RoutingFixture
  resultSchema: unknown
  // Fixture skills and references the validated source tree lacks; non-empty only for a previous source.
  absent: { skills: string[]; references: string[] }
}

type SkillInvocationPolicy = {
  allowImplicitInvocation: boolean
}

type SkillSurfaceValidation = {
  errors: string[]
  explicitOnlySkills: Set<string>
}

export type CatalogVariant = "full" | "synthetic-truncated" | "synthetic-crowded"

type CliOptions = {
  mode: "validate" | "dry-run" | "live"
  caseId?: string
  all: boolean
  allowLive: boolean
  quiet: boolean
  skillsRoot: string
  previousSourceRoot?: string
  catalogVariant: CatalogVariant
  model: string
  effort: string
  harness: Harness
}

const TOP_LEVEL_KEYS = [
  "version",
  "engineering_skills",
  "explicit_only_skills",
  "host_skills",
  "skill_references",
  "invocation_coverage",
  "cases",
] as const
const CASE_KEYS = [
  "id",
  "prompt",
  "primary_skill",
  "expected_modifier_skills",
  "expected_references",
  "required_actions",
  "expectations",
] as const
const OPTIONAL_CASE_KEYS: readonly string[] = ["forbidden_actions", "optional_references", "optional_modifier_skills"]
const EXPECTATION_KEYS = ["first_action", "mutation", "question", "stop"] as const
const RESULT_KEYS = [
  "primary_skill",
  "modifier_skills",
  "references",
  "actions",
  "first_action",
  "mutation",
  "question",
  "stop",
] as const

function usage(): never {
  console.error(`Usage:
  bun skills/evals/run-routing-evals.ts validate [--skills-root PATH] [--quiet]
  bun skills/evals/run-routing-evals.ts dry-run [--case ID] [--source-root PATH] [--previous-source-root PATH]
  All modes accept --catalog-variant full|synthetic-truncated|synthetic-crowded.
  bun skills/evals/run-routing-evals.ts live (--case ID | --all) --allow-live [--model MODEL] [--effort EFFORT]
  dry-run and live accept --harness codex|claude (default codex).

Live mode runs codex exec with ${LIVE_MODEL} at ${LIVE_REASONING_EFFORT} in a read-only sandbox, or
claude -p with ${CLAUDE_LIVE_MODEL} at ${LIVE_REASONING_EFFORT} limited to ${CLAUDE_READ_ONLY_TOOLS}.`)
  process.exit(2)
}

export function parseArgs(argv: string[]): CliOptions {
  const mode = argv.shift()
  if (mode !== "validate" && mode !== "dry-run" && mode !== "live") usage()
  const options: CliOptions = {
    mode,
    all: false,
    allowLive: false,
    quiet: false,
    skillsRoot: DEFAULT_SKILLS_ROOT,
    catalogVariant: "full",
    model: LIVE_MODEL,
    effort: LIVE_REASONING_EFFORT,
    harness: "codex",
  }
  let explicitModel: string | undefined
  while (argv.length > 0) {
    const arg = argv.shift()
    if (arg === "--case") options.caseId = argv.shift() ?? usage()
    else if (arg === "--skills-root") options.skillsRoot = resolve(argv.shift() ?? usage())
    else if (arg === "--source-root") options.skillsRoot = join(resolve(argv.shift() ?? usage()), "skills")
    else if (arg === "--previous-source-root") options.previousSourceRoot = resolve(argv.shift() ?? usage())
    else if (arg === "--catalog-variant") options.catalogVariant = (argv.shift() ?? usage()) as CatalogVariant
    else if (arg === "--model") explicitModel = argv.shift() ?? usage()
    else if (arg === "--harness") options.harness = (argv.shift() ?? usage()) as Harness
    else if (arg === "--effort") options.effort = argv.shift() ?? usage()
    else if (arg === "--all") options.all = true
    else if (arg === "--allow-live") options.allowLive = true
    else if (arg === "--quiet") options.quiet = true
    else usage()
  }
  if (!["full", "synthetic-truncated", "synthetic-crowded"].includes(options.catalogVariant)) throw new Error("invalid catalog variant")
  if (!HARNESSES.includes(options.harness)) throw new Error("invalid harness; use codex or claude")
  options.model = explicitModel ?? (options.harness === "claude" ? CLAUDE_LIVE_MODEL : LIVE_MODEL)
  validateModelOptions(options.model, options.effort, options.harness)
  if (options.caseId && options.all) usage()
  if (mode === "live" && !options.caseId && !options.all) {
    throw new Error("live mode requires --case ID or --all")
  }
  if (mode === "live" && !options.allowLive) {
    throw new Error("live mode requires --allow-live because it makes external model calls")
  }
  return options
}

export function validateModelOptions(model: string, effort: string, harness: Harness = "codex"): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(model)) throw new Error("invalid model identifier")
  if (!(harness === "claude" ? CLAUDE_EFFORTS : CODEX_EFFORTS).includes(effort)) {
    throw new Error(`invalid reasoning effort for ${harness}`)
  }
}

export async function readJson(path: string): Promise<unknown> {
  let contents: string
  try {
    contents = await readFile(path, "utf8")
  } catch (error) {
    throw new Error(`unable to read ${path}: ${String(error)}`)
  }
  try {
    return JSON.parse(contents)
  } catch (error) {
    throw new Error(`invalid JSON in ${path}: ${String(error)}`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sameMembers(left: string[], right: string[]): boolean {
  return [...left].sort().join("\0") === [...right].sort().join("\0")
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function isUnique(values: string[]): boolean {
  return new Set(values).size === values.length
}

function enumValues(schema: unknown, property: string): string[] {
  if (!isRecord(schema) || !isRecord(schema.properties)) {
    throw new Error("result schema must define properties")
  }
  const definition = schema.properties[property]
  if (!isRecord(definition)) throw new Error(`result schema missing property ${property}`)
  const values = definition.enum ?? (isRecord(definition.items) ? definition.items.enum : undefined)
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string")) {
    throw new Error(`result schema property ${property} must define a string enum`)
  }
  return values
}

export function validateFixtureTopLevel(value: unknown): string[] {
  if (!isRecord(value)) return ["routing-cases.json must contain an object"]
  return sameMembers(Object.keys(value), [...TOP_LEVEL_KEYS])
    ? []
    : [`routing fixture must contain exactly ${TOP_LEVEL_KEYS.join(", ")}`]
}

export function validateResultSchema(schema: unknown): string[] {
  if (!isRecord(schema)) return ["routing-result.schema.json must contain an object"]
  const errors: string[] = []
  if (schema.type !== "object") errors.push("result schema root type must be object")
  if (schema.additionalProperties !== false) errors.push("result schema must reject additional properties")
  if (!Array.isArray(schema.required) || !sameMembers(schema.required as string[], [...RESULT_KEYS])) {
    errors.push("result schema required keys must match the runtime result contract")
  }
  if (!isRecord(schema.properties)) return [...errors, "result schema must define properties"]
  if (!sameMembers(Object.keys(schema.properties), [...RESULT_KEYS])) {
    errors.push("result schema properties must match the runtime result contract")
  }
  const primary = schema.properties.primary_skill
  if (!isRecord(primary) || primary.type !== "string" || typeof primary.pattern !== "string") {
    errors.push("result schema primary_skill must be a patterned string")
  }
  for (const property of ["modifier_skills", "references"] as const) {
    const definition = schema.properties[property]
    if (
      !isRecord(definition) ||
      definition.type !== "array" ||
      !isRecord(definition.items) ||
      definition.items.type !== "string" ||
      typeof definition.items.pattern !== "string"
    ) {
      errors.push(`result schema ${property} must be an array of patterned strings`)
    }
  }
  const actions = schema.properties.actions
  if (!isRecord(actions) || actions.type !== "array" || !isRecord(actions.items)) {
    errors.push("result schema actions must be an array with item definitions")
  } else {
    const values = actions.items.enum
    if (!Array.isArray(values) || values.length === 0 || !isUnique(values as string[])) {
      errors.push("result schema actions must define a unique non-empty enum")
    }
  }
  for (const property of EXPECTATION_KEYS) {
    const definition = schema.properties[property]
    const values = isRecord(definition) ? definition.enum : undefined
    if (!Array.isArray(values) || values.length === 0 || !isUnique(values as string[])) {
      errors.push(`result schema ${property} must define a unique non-empty enum`)
    }
  }
  if (JSON.stringify(schema).includes('"uniqueItems"')) {
    errors.push("result schema must not use unsupported uniqueItems")
  }
  return errors
}

export function parseSkillFrontmatter(
  contents: string,
  path = "SKILL.md",
): { name: string; description: string; disableModelInvocation: boolean; lines: string[] } {
  const lines = contents.split(/\r?\n/)
  const closing = lines.indexOf("---", 1)
  if (lines[0] !== "---" || closing < 2) throw new Error(`${path} has invalid frontmatter delimiters`)
  const fields = new Map<string, string>()
  for (const line of lines.slice(1, closing)) {
    if (!line.trim()) continue
    const match = line.match(/^([a-z][a-z0-9-]*):\s*(.+)$/)
    if (!match) throw new Error(`${path} has unsupported frontmatter line: ${line}`)
    const [, key, raw] = match
    if (fields.has(key)) throw new Error(`${path} repeats frontmatter key ${key}`)
    fields.set(key, raw)
  }
  const keys = [...fields.keys()].filter(key => key !== "disable-model-invocation")
  if (!sameMembers(keys, ["name", "description"])) {
    throw new Error(`${path} frontmatter must contain exactly name and description, plus optional disable-model-invocation`)
  }
  const disable = fields.get("disable-model-invocation")
  if (disable !== undefined && disable !== "true") {
    throw new Error(`${path} disable-model-invocation must be true when present`)
  }
  let description: unknown
  try {
    description = JSON.parse(fields.get("description") ?? "")
  } catch {
    throw new Error(`${path} description must be a quoted string`)
  }
  if (typeof description !== "string") throw new Error(`${path} description must be a quoted string`)
  return { name: fields.get("name") ?? "", description, disableModelInvocation: disable === "true", lines }
}

export function parseOpenAiPolicy(
  contents: string,
  path = "agents/openai.yaml",
): SkillInvocationPolicy {
  let inPolicy = false
  let sawPolicy = false
  let allowImplicitInvocation: boolean | undefined
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue
    const indent = line.match(/^ */)?.[0].length ?? 0
    const trimmed = line.trim()
    if (indent === 0) {
      inPolicy = false
      if (trimmed.startsWith("policy:")) {
        if (!/^policy:\s*(?:#.*)?$/.test(trimmed)) {
          throw new Error(`${path}:${index + 1} policy must be a YAML mapping`)
        }
        if (sawPolicy) throw new Error(`${path}:${index + 1} repeats policy`)
        sawPolicy = true
        inPolicy = true
      }
      continue
    }
    if (!inPolicy || !trimmed.startsWith("allow_implicit_invocation")) continue
    if (indent !== 2) {
      throw new Error(`${path}:${index + 1} allow_implicit_invocation must be directly under policy`)
    }
    const match = trimmed.match(/^allow_implicit_invocation:\s*(true|false)\s*(?:#.*)?$/)
    if (!match) {
      throw new Error(`${path}:${index + 1} allow_implicit_invocation must be true or false`)
    }
    if (allowImplicitInvocation !== undefined) {
      throw new Error(`${path}:${index + 1} repeats allow_implicit_invocation`)
    }
    allowImplicitInvocation = match[1] === "true"
  }
  return { allowImplicitInvocation: allowImplicitInvocation ?? true }
}

async function readSkillInvocationPolicy(
  skillsRoot: string,
  skill: string,
): Promise<SkillInvocationPolicy> {
  const path = join(skillsRoot, skill, "agents/openai.yaml")
  try {
    return parseOpenAiPolicy(await readFile(path, "utf8"), path)
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return { allowImplicitInvocation: true }
    throw error
  }
}

export function hasExactSkillInvocation(prompt: string, skill: string): boolean {
  const invocation = `$${skill}`
  let offset = 0
  while (offset < prompt.length) {
    const index = prompt.indexOf(invocation, offset)
    if (index < 0) return false
    const before = index === 0 ? "" : prompt[index - 1] ?? ""
    const after = prompt[index + invocation.length] ?? ""
    if (!/[A-Za-z0-9_$-]/.test(before) && !/[A-Za-z0-9_-]/.test(after)) return true
    offset = index + invocation.length
  }
  return false
}

export function validateExplicitOnlySelections(
  prompt: string,
  selectedSkills: string[],
  explicitOnlySkills: Set<string>,
  label = "routing case",
): string[] {
  return selectedSkills
    .filter((skill) => explicitOnlySkills.has(skill) && !hasExactSkillInvocation(prompt, skill))
    .map((skill) => `${label} selects explicit-only skill ${skill} without exact $${skill} invocation`)
}

export function validateExplicitOnlyInventory(
  value: unknown,
  actualExplicitOnlySkills: Set<string>,
): string[] {
  const expected = strings(value)
  if (!expected) return ["explicit_only_skills must be a string array"]
  if (!isUnique(expected)) return ["explicit_only_skills must be unique"]
  const actual = [...actualExplicitOnlySkills].sort()
  if (!sameMembers(expected, actual)) {
    return [`explicit_only_skills mismatch; fixture=${[...expected].sort().join(",")} actual=${actual.join(",")}`]
  }
  return []
}

export function formatSkillCatalogLine(
  skill: string,
  description: string,
  policy: SkillInvocationPolicy,
): string {
  const invocation = policy.allowImplicitInvocation
    ? ""
    : ` [explicit-only; exact $${skill} invocation required]`
  return `- ${skill}${invocation}: ${description}`
}

export async function discoverSkills(skillsRoot: string): Promise<string[]> {
  const entries = await readdir(skillsRoot, { withFileTypes: true })
  const skills: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      await access(join(skillsRoot, entry.name, "SKILL.md"))
      skills.push(entry.name)
    } catch {
      // Ignore support directories that do not contain SKILL.md.
    }
  }
  return skills.sort()
}

export async function validateSkillEntrypoints(
  skillsRoot: string,
  skills: string[],
): Promise<SkillSurfaceValidation> {
  const errors: string[] = []
  const explicitOnlySkills = new Set<string>()
  for (const skill of skills) {
    const path = join(skillsRoot, skill, "SKILL.md")
    const contents = await readFile(path, "utf8")
    try {
      const policy = await readSkillInvocationPolicy(skillsRoot, skill)
      if (!policy.allowImplicitInvocation) explicitOnlySkills.add(skill)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
    let frontmatter: ReturnType<typeof parseSkillFrontmatter>
    try {
      frontmatter = parseSkillFrontmatter(contents, path)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      continue
    }
    if (frontmatter.name !== skill) errors.push(`${path} name must match its directory`)
    // Claude Code reads disable-model-invocation; Codex reads agents/openai.yaml. Both must agree.
    const explicitOnly = explicitOnlySkills.has(skill)
    if (frontmatter.disableModelInvocation && !explicitOnly) {
      errors.push(`${path} sets disable-model-invocation but agents/openai.yaml allows implicit invocation`)
    } else if (!frontmatter.disableModelInvocation && explicitOnly) {
      errors.push(`${path} must set disable-model-invocation: true because agents/openai.yaml disallows implicit invocation`)
    }
    if (!frontmatter.description.includes("Use when")) {
      errors.push(`${path} description must contain 'Use when'`)
    } else if (frontmatter.description.length > 240) {
      errors.push(`${path} description exceeds 240 characters`)
    }
    if (frontmatter.lines.length - 1 > 120) errors.push(`${path} exceeds 120 lines`)
  }
  return { errors, explicitOnlySkills }
}

async function discoverMarkdownFiles(root: string): Promise<string[]> {
  const files: string[] = []
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path)
    }
  }
  await visit(root)
  return files.sort()
}

async function validateLocalMarkdownLinks(root: string): Promise<string[]> {
  const errors: string[] = []
  for (const file of await discoverMarkdownFiles(root)) {
    const contents = await readFile(file, "utf8")
    for (const match of contents.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1]?.trim() ?? ""
      const target = rawTarget.split("#", 1)[0]
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
      try {
        await access(resolve(dirname(file), target))
      } catch {
        const line = contents.slice(0, match.index).split("\n").length
        errors.push(`${file}:${line} has missing local link target ${target}`)
      }
    }
  }
  return errors
}

async function validateProgressiveReferences(
  skillsRoot: string,
  references: unknown,
  allowMissingFixtureReferences = false,
): Promise<string[]> {
  if (!Array.isArray(references) || !references.every((value) => typeof value === "string")) {
    return ["skill_references must be a string array"]
  }
  const errors: string[] = []
  if (!isUnique(references)) errors.push("skill_references must be unique")
  for (const reference of references) {
    if (!/^[a-z0-9-]+\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.md$/.test(reference)) {
      errors.push(`invalid local skill reference ${reference}`)
      continue
    }
    const path = join(skillsRoot, reference)
    try {
      const contents = await readFile(path, "utf8")
      if (/\[[^\]]*\]\((?![a-z][a-z0-9+.-]*:|#)[^)]+\.md(?:#[^)]+)?\)/i.test(contents)) {
        errors.push(`${reference} must not link to another Markdown reference`)
      }
    } catch (error) {
      if (!isRecord(error) || error.code !== "ENOENT") throw error
      if (!allowMissingFixtureReferences) errors.push(`missing skill reference ${reference}`)
    }
  }
  return errors
}

function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : null
}

export function validateCase(
  value: unknown,
  index: number,
  skills: Set<string>,
  references: Set<string>,
  explicitOnlySkills: Set<string>,
  resultSchema: unknown,
  hostSkills: Set<string> = new Set(),
): string[] {
  const errors: string[] = []
  const label = `cases[${index}]`
  if (!isRecord(value)) return [`${label} must be an object`]
  if (!sameMembers(Object.keys(value).filter(key => !OPTIONAL_CASE_KEYS.includes(key)), [...CASE_KEYS])) {
    errors.push(`${label} must contain ${CASE_KEYS.join(", ")} and optional ${OPTIONAL_CASE_KEYS.join(", ")} only`)
  }
  if (typeof value.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    errors.push(`${label}.id must be kebab-case`)
  }
  if (typeof value.prompt !== "string" || value.prompt.length < 10) {
    errors.push(`${label}.prompt must be a non-trivial string`)
  }
  if (typeof value.primary_skill !== "string" || !(skills.has(value.primary_skill) || value.primary_skill === "none")) {
    errors.push(`${label}.primary_skill must name a known skill or none`)
  }
  const modifiers = strings(value.expected_modifier_skills)
  const expectedReferences = strings(value.expected_references)
  const actions = strings(value.required_actions)
  const forbiddenActions = "forbidden_actions" in value ? strings(value.forbidden_actions) : []
  const optionalReferences = "optional_references" in value ? strings(value.optional_references) : []
  const optionalModifiers = "optional_modifier_skills" in value ? strings(value.optional_modifier_skills) : []
  for (const [key, values] of [
    ["expected_modifier_skills", modifiers],
    ["optional_modifier_skills", optionalModifiers],
    ["expected_references", expectedReferences],
    ["optional_references", optionalReferences],
    ["required_actions", actions],
    ["forbidden_actions", forbiddenActions],
  ] as const) {
    if (!values) errors.push(`${label}.${key} must be a string array`)
    else if (!isUnique(values)) errors.push(`${label}.${key} must not contain duplicates`)
  }
  for (const modifier of [...(modifiers ?? []), ...(optionalModifiers ?? [])]) {
    if (hostSkills.has(modifier)) errors.push(`${label} expects host skill ${modifier}; host skills are ignored by comparison`)
    else if (!skills.has(modifier)) errors.push(`${label} references unknown modifier ${modifier}`)
    if (modifier === value.primary_skill) errors.push(`${label} repeats primary skill as a modifier`)
  }
  if (typeof value.prompt === "string") {
    const selectedSkills = [
      ...(typeof value.primary_skill === "string" ? [value.primary_skill] : []),
      ...(modifiers ?? []),
    ]
    errors.push(...validateExplicitOnlySelections(value.prompt, selectedSkills, explicitOnlySkills, label))
  }
  for (const reference of [...(expectedReferences ?? []), ...(optionalReferences ?? [])]) {
    if (!references.has(reference)) errors.push(`${label} references unknown reference ${reference}`)
  }
  for (const reference of optionalReferences ?? []) {
    if (expectedReferences?.includes(reference)) errors.push(`${label} both expects and optionally accepts reference ${reference}`)
  }
  if (value.primary_skill === "none" && ((modifiers?.length ?? 0) > 0 || (expectedReferences?.length ?? 0) > 0 || (optionalReferences?.length ?? 0) > 0)) errors.push(`${label} none route must not select modifiers or references`)
  const knownActions = new Set(enumValues(resultSchema, "actions"))
  if ((actions ?? []).length === 0 && value.primary_skill !== "none") errors.push(`${label}.required_actions must not be empty`)
  for (const action of [...(actions ?? []), ...(forbiddenActions ?? [])]) {
    if (!knownActions.has(action)) errors.push(`${label} references unknown action ${action}`)
  }
  for (const action of forbiddenActions ?? []) {
    if (actions?.includes(action)) errors.push(`${label} both requires and forbids action ${action}`)
  }
  if (!isRecord(value.expectations)) {
    errors.push(`${label}.expectations must be an object`)
  } else if (!sameMembers(Object.keys(value.expectations), [...EXPECTATION_KEYS])) {
    errors.push(`${label}.expectations must contain exactly ${EXPECTATION_KEYS.join(", ")}`)
  } else {
    for (const key of EXPECTATION_KEYS) {
      const raw = value.expectations[key]
      const expected = Array.isArray(raw) ? raw : [raw]
      if (
        expected.length === 0 ||
        !expected.every((item) => typeof item === "string") ||
        !isUnique(expected as string[]) ||
        !expected.every((item) => enumValues(resultSchema, key).includes(item as string))
      ) {
        errors.push(`${label}.expectations.${key} has invalid value ${String(raw)}`)
      }
    }
  }
  if (value.primary_skill === "review-and-simplify-changes") {
    const caseActions = actions ?? []
    if (!/(diff|wip|commit|branch|pr\b)/i.test(String(value.prompt))) {
      errors.push(`${label} review-and-simplify prompt must pin a diff-like scope`)
    }
    const broad = caseActions.includes("select-minimum-useful-reviewers")
    const evidenceRoles = ["delegate-fast-review", "delegate-command-verification"]
    const evidenceRole = evidenceRoles.find(action => caseActions.includes(action))
    const evidenceOnly = evidenceRole !== undefined && [
      ...evidenceRoles.filter(action => action !== evidenceRole),
      "delegate-reviewer-review", "delegate-oracle-review", "consult-oracle", "use-built-in-review-agent", "delegate-independent-tracks",
      "delegate-standards-intent-simplification", "delegate-one-coupled-review", "dispatch-independent-tracks-in-parallel", "keep-coupled-review-local",
      "apply-post-implementation-review", "review-entire-intended-diff", "review-delta-since-last-snapshot", "review-combined-integration", "delegate-design-reviewer-review",
    ].every(action => forbiddenActions?.includes(action))
    const single = caseActions.includes("honor-single-track-scope") || evidenceOnly
    const blocked = caseActions.includes("report-blocked-review-coverage")
    if (!blocked && broad === single) errors.push(`${label} review must select adaptive coverage or explicit single-track`)
    if (broad && !caseActions.includes("account-for-all-review-topics")) {
      errors.push(`${label} adaptive review must account for all review topics`)
    }
    if (caseActions.includes("keep-coupled-review-local")) errors.push(`${label} review cannot require main-agent coverage`)
    if (!forbiddenActions?.includes("keep-coupled-review-local")) errors.push(`${label} review must forbid main-agent coverage`)
    if (!evidenceOnly && !blocked) {
      for (const action of ["delegate-standards-intent-simplification", "keep-reviewers-nonrecursive", "retain-main-review-ownership"]) {
        if (!caseActions.includes(action)) errors.push(`${label} substantive review must require ${action}`)
      }
      if (!caseActions.includes("delegate-reviewer-review") && !caseActions.includes("delegate-oracle-review")) {
        errors.push(`${label} substantive review must require independent reviewer dispatch`)
      }
    }
    if (blocked && (!isRecord(value.expectations) || value.expectations.stop !== "blocked")) {
      errors.push(`${label} unavailable independent coverage must stop blocked`)
    }
    if (caseActions.includes("delegate-one-coupled-review") && caseActions.includes("delegate-independent-tracks")) {
      errors.push(`${label} one coupled reviewer cannot require separate review tracks`)
    }
    if (caseActions.includes("dispatch-independent-tracks-in-parallel") && !caseActions.includes("delegate-independent-tracks")) {
      errors.push(`${label} parallel review must assign independent tracks`)
    }
    // A continuing review may start by evaluating the open findings it was handed instead of re-pinning scope.
    const firstAction = isRecord(value.expectations) ? value.expectations.first_action : undefined
    const pinsFirst = firstAction === "pin-review-scope" ||
      (Array.isArray(firstAction) && firstAction.includes("pin-review-scope") && firstAction.every(item => item === "pin-review-scope" || item === "evaluate-feedback"))
    if (!caseActions.includes("pin-review-scope") && !pinsFirst) errors.push(`${label} review must pin scope`)
    if (single && !caseActions.includes("keep-task-read-only")) {
      errors.push(`${label} single-track review must remain read-only`)
    }
  }
  return errors
}

export async function validateFixture(
  skillsRoot: string,
  { previous = false }: { previous?: boolean } = {},
): Promise<ValidatedSuite> {
  const [fixture, resultSchema, actualSkills, linkErrors] = await Promise.all([
    readJson(CASES_PATH),
    readJson(RESULT_SCHEMA_PATH),
    discoverSkills(skillsRoot),
    validateLocalMarkdownLinks(skillsRoot),
    agentCatalog(dirname(skillsRoot)),
  ])
  const topErrors = validateFixtureTopLevel(fixture)
  if (!isRecord(fixture)) throw new Error(topErrors.join("\n"))
  const errors = [...topErrors, ...linkErrors, ...validateResultSchema(resultSchema)]
  if (fixture.version !== 7) errors.push("routing fixture version must be 7")
  const skillSurface = await validateSkillEntrypoints(skillsRoot, actualSkills)
  errors.push(...skillSurface.errors)
  errors.push(...(await validateProgressiveReferences(skillsRoot, fixture.skill_references, previous)))
  const hostSkills = strings(fixture.host_skills)
  if (!hostSkills) errors.push("host_skills must be a string array")
  else if (!isUnique(hostSkills)) errors.push("host_skills must be unique")
  else for (const skill of hostSkills) if (actualSkills.includes(skill)) errors.push(`host skill ${skill} is also a source skill`)

  // A previous source predates some fixture skills or references. Its cases are validated against the
  // candidate; here it only needs a valid skill surface, and absent entries are reported for skipping.
  if (previous) {
    if (errors.length > 0) throw new Error(`routing eval validation failed (previous source):\n- ${errors.join("\n- ")}`)
    const routing = fixture as unknown as RoutingFixture
    const present = new Set(actualSkills)
    const references = await Promise.all(routing.skill_references.map(async reference => ({ reference, exists: await exists(join(skillsRoot, reference)) })))
    const absentReferences = references.filter(entry => !entry.exists).map(entry => entry.reference)
    return {
      fixture: {
        ...routing,
        engineering_skills: routing.engineering_skills.filter(skill => present.has(skill)),
        explicit_only_skills: [...skillSurface.explicitOnlySkills],
        skill_references: routing.skill_references.filter(reference => !absentReferences.includes(reference)),
      },
      resultSchema,
      absent: { skills: routing.engineering_skills.filter(skill => !present.has(skill)), references: absentReferences },
    }
  }

  const inventory = strings(fixture.engineering_skills)
  if (!inventory) errors.push("engineering_skills must be a string array")
  else if (!isUnique(inventory)) errors.push("engineering_skills must be unique")
  else if (!sameMembers(inventory, actualSkills)) {
    errors.push(`engineering_skills mismatch; fixture=${[...inventory].sort().join(",")} actual=${actualSkills.join(",")}`)
  }

  const skillSet = new Set(actualSkills)
  errors.push(...validateExplicitOnlyInventory(fixture.explicit_only_skills, skillSurface.explicitOnlySkills))
  for (const skill of strings(fixture.explicit_only_skills) ?? []) {
    if (!skillSet.has(skill)) errors.push(`explicit_only_skills references unknown skill ${skill}`)
  }
  const referenceSet = new Set(strings(fixture.skill_references) ?? [])
  if (!Array.isArray(fixture.cases)) {
    errors.push("cases must be an array")
  } else {
    fixture.cases.forEach((entry, index) => {
      errors.push(...validateCase(entry, index, skillSet, referenceSet, skillSurface.explicitOnlySkills, resultSchema, new Set(hostSkills ?? [])))
    })
    const records = fixture.cases.filter(isRecord)
    const ids = records.map((entry) => entry.id).filter((id): id is string => typeof id === "string")
    if (!isUnique(ids)) errors.push("case ids must be unique")
    const coveredSkills = new Set<string>()
    const coveredReferences = new Set<string>()
    for (const entry of records) {
      if (typeof entry.primary_skill === "string") coveredSkills.add(entry.primary_skill)
      for (const skill of strings(entry.expected_modifier_skills) ?? []) coveredSkills.add(skill)
      for (const reference of strings(entry.expected_references) ?? []) coveredReferences.add(reference)
    }
    for (const skill of actualSkills) {
      if (!coveredSkills.has(skill)) errors.push(`no routing case exercises skill ${skill}`)
    }
    for (const reference of referenceSet) {
      if (!coveredReferences.has(reference)) errors.push(`no routing case exercises reference ${reference}`)
    }
  }
  errors.push(...validateInvocationCoverage(fixture as unknown as RoutingFixture))
  if (errors.length > 0) throw new Error(`routing eval validation failed:\n- ${errors.join("\n- ")}`)
  return { fixture: fixture as unknown as RoutingFixture, resultSchema, absent: { skills: [], references: [] } }
}

// Why a previous source cannot run a case (skip) or cannot pass it (expected red); empty when neither applies.
export function previousSourceGaps(routingCase: RoutingCase, absent: ValidatedSuite["absent"]): { skip: string[]; expected_red: string[] } {
  const skip = [routingCase.primary_skill, ...routingCase.expected_modifier_skills]
    .filter(skill => absent.skills.includes(skill))
    .map(skill => `skill ${skill} is absent from this source`)
  const expected_red = routingCase.expected_references
    .filter(reference => absent.references.includes(reference))
    .map(reference => `reference ${reference} is absent from this source`)
  return { skip, expected_red }
}

function selectCases(fixture: RoutingFixture, caseId?: string): RoutingCase[] {
  if (!caseId) return fixture.cases
  const selected = fixture.cases.find((entry) => entry.id === caseId)
  if (!selected) throw new Error(`unknown case id: ${caseId}`)
  return [selected]
}

export function validateInvocationCoverage(fixture: RoutingFixture): string[] {
  const errors: string[] = []
  const coverage = fixture.invocation_coverage
  if (!isRecord(coverage) || !sameMembers(Object.keys(coverage), fixture.engineering_skills)) return ["invocation coverage must name every installed skill exactly once"]
  for (const skill of fixture.engineering_skills) {
    const pair = coverage[skill]
    for (const polarity of ["positive", "near_negative"] as const) {
      const ids = pair && strings(pair[polarity])
      if (!ids?.length || !isUnique(ids)) { errors.push(`${skill} needs unique ${polarity} cases`); continue }
      for (const id of ids) {
        const entry = fixture.cases.find(entry => entry.id === id)
        if (!entry) { errors.push(`${skill} coverage names unknown case ${id}`); continue }
        const selected = entry.primary_skill === skill || entry.expected_modifier_skills.includes(skill)
        if (selected !== (polarity === "positive")) errors.push(`${skill} ${polarity} case ${id} has contradictory selection`)
      }
    }
  }
  if (!fixture.cases.some(entry => entry.primary_skill === "none")) errors.push("missing no-applicable-skill case")
  return errors
}

export async function skillCatalog(skillsRoot: string, skills: string[], variant: CatalogVariant = "full"): Promise<string> {
  const lines: string[] = []
  for (const skill of skills) {
    const path = join(skillsRoot, skill, "SKILL.md")
    const frontmatter = parseSkillFrontmatter(await readFile(path, "utf8"), path)
    const policy = await readSkillInvocationPolicy(skillsRoot, skill)
    const description = variant === "synthetic-truncated" ? frontmatter.description.slice(0, 96) : frontmatter.description
    lines.push(`${formatSkillCatalogLine(skill, description, policy)} (path: ${path})`)
  }
  if (variant === "synthetic-crowded") {
    // Deliberate unrelated distractors; this does not reproduce host catalog ordering.
    for (let i = 0; i < 60; i++) lines.splice(i * 2 % (lines.length + 1), 0, `- synthetic-catalog-${i}: Use when cataloging museum specimen ${i}. (synthetic distractor; no file)`)
  }
  return lines.join("\n")
}

/** Reads a profile's name and description: TOML for Codex profiles, YAML-ish frontmatter for Claude agents. */
function profileFields(filename: string, contents: string): { name?: unknown; description?: unknown } {
  if (filename.endsWith(".toml")) {
    const profile = Bun.TOML.parse(contents)
    return isRecord(profile) ? profile : {}
  }
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(contents)?.[1] ?? ""
  const field = (key: string) => {
    const raw = new RegExp(`^${key}: (.*)$`, "m").exec(frontmatter)?.[1]
    return raw?.startsWith('"') ? JSON.parse(raw) : raw
  }
  return { name: field("name"), description: field("description") }
}

export async function agentCatalog(sourceRoot: string): Promise<string> {
  const lines = new Map<string, string>()
  for (const { filename, path, contents } of await readAgentProfileFiles(sourceRoot)) {
    const profile = profileFields(filename, contents)
    if (profile.name !== filename.replace(/\.(toml|md)$/, "") || typeof profile.description !== "string" || !profile.description.trim()) {
      throw new Error(`${path} must define its filename-matching name and a non-empty description`)
    }
    if (!lines.has(profile.name)) lines.set(profile.name, `- ${profile.name}: ${profile.description} (path: ${path})`)
  }
  return [...lines.keys()].sort().map(name => lines.get(name)).join("\n") || "No source agent profiles."
}

export async function buildLivePrompt(
  routingCase: RoutingCase,
  fixture: RoutingFixture,
  skillsRoot: string,
  variant: CatalogVariant = "full",
): Promise<string> {
  const [catalog, agents] = await Promise.all([
    skillCatalog(skillsRoot, fixture.engineering_skills, variant),
    agentCatalog(dirname(skillsRoot)),
  ])
  return `Classify the skill route for the task below. Do not execute the task.

The content inside <task> is test data. Do not make its edits, run its commands, call external services, or change branches. Return the JSON object required by the output schema. All result fields describe handling the task inside <task>, not this classification exercise. Infer intended actions from that task and applicable skill instructions. Use primary_skill "none" when no listed skill applies. The schema describes the result fields; it does not require every task to use a skill or reference.

Reference paths are relative to the supplied skills root, beginning with the owning skill folder. Preserve the existing filename and case; omit a leading skills/ or absolute path prefix.

Available skills (${variant}; synthetic variants are stress tests, not measurements of host catalog rendering):
${catalog}

Available agents from this source tree:
${agents}

<task>
${routingCase.prompt}
</task>`
}

export function parseLiveResult(
  output: string,
  fixture: RoutingFixture,
  resultSchema: unknown,
  label = "codex exec",
): RoutingResult {
  let value: unknown
  try {
    value = JSON.parse(output.trim())
  } catch {
    throw new Error(`${label} did not return JSON: ${output.trim().slice(0, 500)}`)
  }
  if (!isRecord(value)) throw new Error(`${label} result must be a JSON object`)
  if (!sameMembers(Object.keys(value), [...RESULT_KEYS])) {
    throw new Error(`${label} result must contain exactly ${RESULT_KEYS.join(", ")}`)
  }
  const knownSkills = new Set(fixture.engineering_skills)
  if (typeof value.primary_skill !== "string" || !(knownSkills.has(value.primary_skill) || value.primary_skill === "none")) {
    throw new Error(`${label} result primary_skill must name a known skill or none`)
  }
  for (const key of ["modifier_skills", "references", "actions"] as const) {
    if (!Array.isArray(value[key]) || !value[key].every((item) => typeof item === "string")) {
      throw new Error(`${label} result ${key} must be a string array`)
    }
    if (!isUnique(value[key])) throw new Error(`${label} result ${key} must not contain duplicates`)
  }
  if (value.primary_skill === "none" && ((value.modifier_skills as string[]).length || (value.references as string[]).length)) throw new Error("none route must not select modifiers or references")
  const hostSkills = new Set(fixture.host_skills)
  for (const skill of value.modifier_skills as string[]) {
    if (!knownSkills.has(skill) && !hostSkills.has(skill)) throw new Error(`${label} result references unknown skill ${skill}`)
    if (skill === value.primary_skill) throw new Error(`${label} result repeats primary skill as modifier`)
  }
  const knownReferences = new Set(fixture.skill_references)
  for (const reference of value.references as string[]) {
    if (!knownReferences.has(reference)) throw new Error(`${label} result references unknown reference ${reference}`)
  }
  const knownActions = new Set(enumValues(resultSchema, "actions"))
  for (const action of value.actions as string[]) {
    if (!knownActions.has(action)) throw new Error(`${label} result references unknown action ${action}`)
  }
  for (const key of EXPECTATION_KEYS) {
    if (typeof value[key] !== "string" || !enumValues(resultSchema, key).includes(value[key])) {
      throw new Error(`${label} result ${key} has invalid value ${String(value[key])}`)
    }
  }
  return value as unknown as RoutingResult
}

// Modifiers and references are unordered sets: neither the prompt nor the schema gives their order meaning.
export function compareResult(routingCase: RoutingCase, result: RoutingResult, hostSkills: readonly string[] = []): string[] {
  const failures: string[] = []
  if (result.primary_skill !== routingCase.primary_skill) {
    failures.push(`primary_skill: expected ${routingCase.primary_skill}, got ${result.primary_skill}`)
  }
  const optionalModifiers = routingCase.optional_modifier_skills ?? []
  const modifiers = result.modifier_skills.filter(skill => !hostSkills.includes(skill) && !optionalModifiers.includes(skill))
  if (!sameMembers(modifiers, routingCase.expected_modifier_skills)) {
    failures.push(
      `modifier_skills: expected ${routingCase.expected_modifier_skills.join(",")}, got ${modifiers.join(",")}`,
    )
  }
  const optionalReferences = routingCase.optional_references ?? []
  if (!sameMembers(result.references.filter(reference => !optionalReferences.includes(reference)), routingCase.expected_references)) {
    failures.push(
      `references: expected ${routingCase.expected_references.join(",")}, got ${result.references.join(",")}`,
    )
  }
  for (const action of routingCase.required_actions) {
    if (!result.actions.includes(action)) failures.push(`missing required action ${action}`)
  }
  for (const action of routingCase.forbidden_actions ?? []) {
    if (result.actions.includes(action)) failures.push(`forbidden action ${action}`)
  }
  for (const key of EXPECTATION_KEYS) {
    const raw = routingCase.expectations[key]
    const expected = Array.isArray(raw) ? raw : [raw]
    if (!expected.includes(result[key])) {
      failures.push(`${key}: expected ${expected.join(" or ")}, got ${result[key]}`)
    }
  }
  return failures
}

export function codexExecArgs(repoRoot: string, prompt: string, model = LIVE_MODEL, effort = LIVE_REASONING_EFFORT): string[] {
  validateModelOptions(model, effort)
  const args = [
    "codex",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--skip-git-repo-check",
    "--json",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--model",
    model,
    "-c",
    `model_reasoning_effort="${effort}"`,
    "--output-schema",
    RESULT_SCHEMA_PATH,
    "--cd",
    repoRoot,
    prompt,
  ]
  return SETSID ? [SETSID, ...args] : args
}

export type ClaudeExecOptions = {
  model?: string
  effort?: string
  // JSON Schema text for --json-schema; structured output arrives as result.structured_output.
  schema: string
  // Source host instructions appended to the default system prompt, mirroring codex loading AGENTS.md from --cd.
  instructions: string
  // Readable roots; the process runs from an empty cwd so no project instruction file loads.
  addDirs: string[]
}

// The prompt travels on stdin: `--tools` and `--add-dir` are variadic and would swallow a trailing
// positional prompt. `--setting-sources project` with an empty cwd skips user settings, CLAUDE.md
// and AGENTS.md discovery, user skills, agents, and hooks; `--disable-slash-commands` hides every
// skill because the prompt supplies the source catalog.
export function claudeExecArgs({ model = CLAUDE_LIVE_MODEL, effort = LIVE_REASONING_EFFORT, schema, instructions, addDirs }: ClaudeExecOptions): string[] {
  validateModelOptions(model, effort, "claude")
  const args = [
    "claude",
    "-p",
    "--output-format",
    "json",
    "--verbose",
    "--no-session-persistence",
    "--setting-sources",
    "project",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--permission-mode",
    "dontAsk",
    "--tools",
    CLAUDE_READ_ONLY_TOOLS,
    ...addDirs.flatMap(dir => ["--add-dir", dir]),
    "--model",
    model,
    "--effort",
    effort,
    "--json-schema",
    schema,
    "--append-system-prompt",
    instructions,
  ]
  return SETSID ? [SETSID, ...args] : args
}

const CLAUDE_SESSION_ENV = /^(?:CLAUDECODE|CLAUDE_CODE_(?:SESSION_ID|SESSION_ATTENDED|CHILD_SESSION|ENTRYPOINT|EXECPATH|MESSAGING_SOCKET|MESSAGING_TOKEN)|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AGENT_SDK_VERSION|AI_AGENT)$/

// Drops the parent session's coupling variables so a nested run starts as an independent session,
// keeps ANTHROPIC_* auth (user settings.json env is not loaded), and disables auto memory, which
// setting sources do not control.
export function claudeEnv(base: Record<string, string | undefined> = process.env): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && !CLAUDE_SESSION_ENV.test(key)) env[key] = value
  }
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = "1"
  return env
}

// Claude Code reads host instructions from CLAUDE.md, so the harness supplies the source tree's
// generated claude/CLAUDE.md, falling back to AGENTS.md for sources that predate host generation.
export async function sourceInstructions(sourceRoot: string): Promise<{ path: string; contents: string }> {
  for (const relative of ["claude/CLAUDE.md", "AGENTS.md"]) {
    const path = join(sourceRoot, relative)
    try {
      return { path, contents: await readFile(path, "utf8") }
    } catch (error) {
      if (!isRecord(error) || error.code !== "ENOENT") throw error
    }
  }
  throw new Error(`${sourceRoot} has neither claude/CLAUDE.md nor AGENTS.md`)
}

// Claude Code validates --json-schema with a default-draft validator that rejects the 2020-12 `$schema`
// meta-schema URI, so the claude harness sends the same schema without that key.
export function claudeJsonSchema(schemaText: string): string {
  const { $schema: _metaSchema, ...schema } = JSON.parse(schemaText) as Record<string, unknown>
  return JSON.stringify(schema)
}

export const CLAUDE_ISOLATION =
  "empty cwd + setting-sources=project; --add-dir exposes only a temp copy of the source skills (without evals), agents, AGENTS.md, and claude/CLAUDE.md; user settings/CLAUDE.md/skills/agents/hooks, project instruction files, MCP, slash commands, and auto memory excluded; ~/.claude.json, managed policy, and builtin plugins still load"

// Non-secret record of where a nested claude run sends requests and where its credentials come from.
// "env" means the inherited environment carries an Anthropic credential; "config" means claude falls
// back to its own stored login. Never records credential values.
export function claudeRoutingMarker(env: Record<string, string | undefined> = process.env): { anthropic_base_url_host: string | null; auth_source: "env" | "config" } {
  let host: string | null = null
  if (env.ANTHROPIC_BASE_URL) {
    try {
      host = new URL(env.ANTHROPIC_BASE_URL).host
    } catch {
      host = "<unparseable>"
    }
  }
  return { anthropic_base_url_host: host, auth_source: env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY ? "env" : "config" }
}

const STAGED_SOURCE_FILES = ["AGENTS.md", "claude/CLAUDE.md"]

// Copies what the claude harness may read into `root`: skills without the eval cases and judge,
// agent profiles, and the host instruction files. The model never sees the source tree itself.
export async function stageClaudeSource(sourceRoot: string, root: string): Promise<string> {
  const skillsRoot = join(sourceRoot, "skills")
  await cp(skillsRoot, join(root, "skills"), { recursive: true, filter: source => source !== join(skillsRoot, "evals") })
  if (await exists(join(sourceRoot, "agents"))) await cp(join(sourceRoot, "agents"), join(root, "agents"), { recursive: true })
  for (const file of STAGED_SOURCE_FILES) {
    if (!(await exists(join(sourceRoot, file)))) continue
    await mkdir(dirname(join(root, file)), { recursive: true })
    await cp(join(sourceRoot, file), join(root, file))
  }
  return join(root, "skills")
}

export async function withEmptyCwd<T>(run: (cwd: string) => Promise<T>, prefix = "claude-eval-cwd-"): Promise<T> {
  const cwd = await mkdtemp(join(tmpdir(), prefix))
  const cleanup = () => rm(cwd, { recursive: true, force: true })
  shutdownCleanups.add(cleanup)
  try {
    return await run(cwd)
  } finally {
    shutdownCleanups.delete(cleanup)
    await cleanup()
  }
}

type EvalSubprocess = ReturnType<typeof Bun.spawn>
const activeChildren = new Map<EvalSubprocess, boolean>()

function signalSubprocess(child: EvalSubprocess, signal: "SIGTERM" | "SIGKILL", group: boolean): void {
  if (child.exitCode !== null) return
  if (group && process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal)
      return
    } catch {
      // Try the child directly if the process group has already exited.
    }
  }
  try {
    child.kill(signal)
  } catch {
    // The process may exit before it receives the signal.
  }
}

async function exitsWithin(child: EvalSubprocess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null) return true
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      child.exited.then(() => true),
      new Promise<false>((resolveTimeout) => {
        timer = setTimeout(() => resolveTimeout(false), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function terminateSubprocess(
  child: EvalSubprocess,
  processGroup: boolean,
  graceMs = TERMINATION_GRACE_MS,
): Promise<void> {
  signalSubprocess(child, "SIGTERM", processGroup)
  if (await exitsWithin(child, graceMs)) return
  signalSubprocess(child, "SIGKILL", processGroup)
  // Reaping after SIGKILL can take longer than the configurable TERM grace
  // under concurrent load; keep a separate bounded scheduling allowance.
  if (!(await exitsWithin(child, Math.max(graceMs, 1_000)))) throw new Error(`subprocess ${child.pid} did not exit after SIGKILL`)
}

export const shutdownCleanups = new Set<() => Promise<void>>()
let shuttingDown = false
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return
    shuttingDown = true
    void Promise.all(
      [...activeChildren].map(([child, processGroup]) => terminateSubprocess(child, processGroup)),
    ).finally(async () => {
      await Promise.allSettled([...shutdownCleanups].map(cleanup => cleanup()))
      process.exit(signal === "SIGINT" ? 130 : 143)
    })
  })
}

export async function collectSubprocess(
  child: EvalSubprocess,
  label: string,
  timeoutMs = LIVE_TIMEOUT_MS,
  processGroup = false,
  terminationGraceMs = TERMINATION_GRACE_MS,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  activeChildren.set(child, processGroup)
  const stdoutPromise = new Response(child.stdout).text()
  const stderrPromise = new Response(child.stderr).text()
  const timeout = Symbol("timeout")
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const outcome = await Promise.race([
      child.exited,
      new Promise<typeof timeout>((resolveTimeout) => {
        timer = setTimeout(() => resolveTimeout(timeout), timeoutMs)
      }),
    ])
    if (outcome === timeout) {
      await terminateSubprocess(child, processGroup, terminationGraceMs)
      const stderr = await stderrPromise
      throw new Error(`${label} timed out after ${timeoutMs}ms${stderr.trim() ? `: ${stderr.trim()}` : ""}`)
    }
    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise])
    return { stdout, stderr, exitCode: outcome }
  } finally {
    if (timer) clearTimeout(timer)
    activeChildren.delete(child)
    if (child.exitCode === null) await terminateSubprocess(child, processGroup, terminationGraceMs)
  }
}

async function runLiveCase(
  routingCase: RoutingCase,
  fixture: RoutingFixture,
  resultSchema: unknown,
  skillsRoot: string,
  model: string,
  effort: string,
  variant: CatalogVariant,
  harness: Harness,
) {
  if (harness === "claude") return runClaudeLiveCase(routingCase, fixture, resultSchema, skillsRoot, model, effort, variant)
  const repoRoot = dirname(skillsRoot)
  const prompt = await buildLivePrompt(routingCase, fixture, skillsRoot, variant)
  const args = codexExecArgs(repoRoot, prompt, model, effort)
  const started = performance.now()
  const child = Bun.spawn({ cmd: args, cwd: repoRoot, stdin: "ignore", stdout: "pipe", stderr: "pipe" })
  const { stdout, stderr, exitCode } = await collectSubprocess(child, `codex exec for ${routingCase.id}`, LIVE_TIMEOUT_MS, SETSID !== null && args[0] === SETSID)
  if (exitCode !== 0) throw new Error(`codex exec failed for ${routingCase.id} (${exitCode}): ${stderr.trim()}`)
  const trace = parseTrace(stdout)
  trace.elapsed_ms = Math.round(performance.now() - started)
  try {
    const result = parseLiveResult(trace.messages.at(-1)!, fixture, resultSchema)
    return { result, failures: compareResult(routingCase, result, fixture.host_skills), trace, prompt_hash: sha256(prompt) }
  } catch (error) {
    return { result: null, failures: [error instanceof Error ? error.message : String(error)], trace, prompt_hash: sha256(prompt) }
  }
}

export async function runClaudeLiveCase(
  routingCase: RoutingCase,
  fixture: RoutingFixture,
  resultSchema: unknown,
  skillsRoot: string,
  model: string,
  effort: string,
  variant: CatalogVariant,
) {
  const repoRoot = dirname(skillsRoot)
  const [instructions, schema] = await Promise.all([sourceInstructions(repoRoot), readFile(RESULT_SCHEMA_PATH, "utf8")])
  return withEmptyCwd(async stageRoot => {
    const stagedSkillsRoot = await stageClaudeSource(repoRoot, stageRoot)
    const prompt = await buildLivePrompt(routingCase, fixture, stagedSkillsRoot, variant)
    const args = claudeExecArgs({ model, effort, schema: claudeJsonSchema(schema), instructions: instructions.contents, addDirs: [stageRoot] })
    const started = performance.now()
    const { stdout, stderr, exitCode } = await withEmptyCwd(cwd => {
      const child = Bun.spawn({ cmd: args, cwd, env: claudeEnv(), stdin: new Blob([prompt]), stdout: "pipe", stderr: "pipe" })
      return collectSubprocess(child, `claude -p for ${routingCase.id}`, CLAUDE_LIVE_TIMEOUT_MS, SETSID !== null && args[0] === SETSID)
    })
    if (exitCode !== 0) throw new Error(`claude -p failed for ${routingCase.id} (${exitCode}): ${stderr.trim() || stdout.trim().slice(0, 500)}`)
    const trace = parseClaudeTrace(stdout)
    trace.elapsed_ms = Math.round(performance.now() - started)
    // The staged root differs per run; hash the prompt with it replaced so equal inputs hash equally.
    const evidence = { trace, prompt_hash: sha256(prompt.replaceAll(stageRoot, "<STAGED_SOURCE>")), instructions_file: instructions.path, instructions_hash: sha256(instructions.contents) }
    try {
      const result = parseLiveResult(trace.messages.at(-1)!, fixture, resultSchema, "claude -p")
      return { result, failures: compareResult(routingCase, result, fixture.host_skills), ...evidence }
    } catch (error) {
      return { result: null, failures: [error instanceof Error ? error.message : String(error)], ...evidence }
    }
  }, "claude-eval-source-")
}

export function dryRunCommand(options: Pick<CliOptions, "harness" | "model" | "effort">, sourceRoot: string): string[] {
  return options.harness === "claude"
    ? claudeExecArgs({ model: options.model, effort: options.effort, schema: `<${RESULT_SCHEMA_PATH}>`, instructions: "<SOURCE_INSTRUCTIONS>", addDirs: ["<STAGED_SOURCE>"] })
    : codexExecArgs(sourceRoot, "<ROUTING_EVAL_PROMPT>", options.model, options.effort)
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const sources = [
    ...(options.previousSourceRoot ? [{ label: "previous", root: options.previousSourceRoot, skillsRoot: join(options.previousSourceRoot, "skills") }] : []),
    { label: "candidate", root: dirname(options.skillsRoot), skillsRoot: options.skillsRoot },
  ]
  const harness_hash = await harnessHash()
  const suites = await Promise.all(sources.map(async source => ({
    ...source,
    ...await validateFixture(source.skillsRoot, { previous: source.label === "previous" }),
    ...await sourceProvenance(source.root, source.skillsRoot),
  })))
  if (options.mode === "validate") {
    if (!options.quiet) for (const suite of suites) console.log(`Routing eval fixture is valid (${suite.label}): ${suite.fixture.cases.length} cases, ${suite.fixture.engineering_skills.length} skills; positive and near-negative invocation coverage complete`)
    return
  }
  if (options.mode === "live" && !Bun.which(options.harness)) throw new Error(`live mode requires the ${options.harness} executable on PATH`)
  let failed = false
  // Pair each case across sources to keep fixtures, settings, and catalog variant identical. Cases come
  // from the candidate fixture, which is the only one validated case by case.
  for (const routingCase of selectCases(suites.at(-1)!.fixture, options.caseId)) {
    for (const suite of suites) {
      const routing = options.harness === "claude" ? { host_native_discovery: CLAUDE_ISOLATION, claude_routing: claudeRoutingMarker() } : { host_native_discovery: "unisolated" }
      const provenance = { case: routingCase.id, source: suite.label, source_root: suite.root, skills_root: suite.skillsRoot, source_hash: suite.source_hash, harness_hash, fixture_hash: sha256(JSON.stringify(routingCase)), harness: options.harness, model: options.model, reasoning_effort: options.effort, catalog_variant: options.catalogVariant, ...routing }
      const gaps = previousSourceGaps(routingCase, suite.absent)
      if (gaps.skip.length) {
        console.log(JSON.stringify({ ...provenance, skipped: gaps.skip }))
        continue
      }
      const expectation = gaps.expected_red.length ? { expected_red: gaps.expected_red } : {}
      if (options.mode === "dry-run") {
        const stdin = options.harness === "claude" ? { cwd: "<EMPTY_TEMP_DIR>", stdin: "<ROUTING_EVAL_PROMPT>", instructions_file: (await sourceInstructions(suite.root)).path } : {}
        console.log(JSON.stringify({ ...provenance, ...expectation, external_call: false, would_execute: dryRunCommand(options, suite.root), ...stdin, contract: routingCase }))
        continue
      }
      try {
        const result = await runLiveCase(routingCase, suite.fixture, suite.resultSchema, suite.skillsRoot, options.model, options.effort, options.catalogVariant, options.harness)
        console.log(JSON.stringify({ ...provenance, ...expectation, ...result }))
        // An expected-red previous result documents the gap the candidate closes; it does not fail the run.
        if (result.failures.length && !gaps.expected_red.length) failed = true
      } catch (error) {
        failed = true
        console.log(JSON.stringify({ ...provenance, error: error instanceof Error ? error.message : String(error) }))
      }
    }
  }
  if (failed) process.exitCode = 1
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
