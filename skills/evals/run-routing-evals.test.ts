import { describe, expect, test } from "bun:test"
import { chmod, cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  collectSubprocess,
  terminateSubprocess,
  codexExecArgs,
  parseArgs,
  validateCase,
  compareResult,
  formatSkillCatalogLine,
  hasExactSkillInvocation,
  parseOpenAiPolicy,
  parseLiveResult,
  parseSkillFrontmatter,
  readJson,
  validateFixtureTopLevel,
  validateExplicitOnlyInventory,
  validateExplicitOnlySelections,
  validateResultSchema,
  validateInvocationCoverage,
  validateSkillEntrypoints,
  buildLivePrompt,
  agentCatalog,
  skillCatalog,
  type RoutingCase,
  type RoutingFixture,
  type RoutingResult,
} from "./run-routing-evals.ts"
import { sourceProvenance } from "./eval-evidence.ts"

const fixture = (await Bun.file(`${import.meta.dir}/routing-cases.json`).json()) as RoutingFixture
const resultSchema: unknown = await Bun.file(`${import.meta.dir}/routing-result.schema.json`).json()

const validResult: RoutingResult = {
  primary_skill: "engineering",
  modifier_skills: [],
  references: [],
  actions: ["inspect-before-editing", "verify-before-completion"],
  first_action: "inspect-current-state",
  mutation: "requested-repo-writes",
  question: "only-if-blocked",
  stop: "after-verification",
}

describe("live result validation", () => {
  test("uses constraints supported by structured output", () => {
    expect(JSON.stringify(resultSchema)).not.toContain('"uniqueItems"')
  })

  test("accepts one JSON object that strictly follows the schema", () => {
    expect(parseLiveResult(JSON.stringify(validResult), fixture, resultSchema)).toEqual(validResult)
  })

  test("rejects output before the JSON object", () => {
    expect(() => parseLiveResult(`progress\n${JSON.stringify(validResult)}`, fixture, resultSchema)).toThrow(
      "did not return JSON",
    )
  })

  test("rejects a result with missing fields", () => {
    const { stop: _stop, ...incomplete } = validResult
    expect(() => parseLiveResult(JSON.stringify(incomplete), fixture, resultSchema)).toThrow(
      "must contain exactly",
    )
  })

  test("rejects repeated references", () => {
    const duplicate = {
      ...validResult,
      references: [
        "engineering/references/feature-shape.md",
        "engineering/references/feature-shape.md",
      ],
    }
    expect(() => parseLiveResult(JSON.stringify(duplicate), fixture, resultSchema)).toThrow(
      "references must not contain duplicates",
    )
  })

  test("rejects the primary skill when it also appears as a modifier", () => {
    const duplicate = { ...validResult, modifier_skills: ["engineering"] }
    expect(() => parseLiveResult(JSON.stringify(duplicate), fixture, resultSchema)).toThrow(
      "repeats primary skill as modifier",
    )
  })
})

test("comparison rejects unneeded modifiers and references", () => {
  const routingCase: RoutingCase = {
    id: "routine-test",
    prompt: "Synthetic request for routine engineering work.",
    primary_skill: "engineering",
    expected_modifier_skills: [],
    expected_references: [],
    required_actions: ["inspect-before-editing"],
    expectations: {
      first_action: "inspect-current-state",
      mutation: "requested-repo-writes",
      question: "only-if-blocked",
      stop: "after-verification",
    },
  }
  const overloaded: RoutingResult = {
    ...validResult,
    modifier_skills: ["test-design"],
    references: ["engineering/references/proof.md"],
  }
  expect(compareResult(routingCase, overloaded)).toEqual([
    "modifier_skills: expected , got test-design",
    "references: expected , got engineering/references/proof.md",
  ])
})

test("accepts listed alternatives in expectation fields", () => {
  const routingCase: RoutingCase = {
    id: "alternative-test",
    prompt: "Synthetic request with alternative expectations.",
    primary_skill: "engineering",
    expected_modifier_skills: [],
    expected_references: [],
    required_actions: ["inspect-before-editing"],
    expectations: {
      first_action: ["inspect-current-state", "verify-branch-state"],
      mutation: ["none", "requested-repo-writes"],
      question: ["only-if-blocked", "required-before-unapproved-action"],
      stop: "after-verification",
    },
  }
  expect(compareResult(routingCase, validResult)).toEqual([])
})

test("parses quoted frontmatter descriptions", () => {
  const frontmatter = parseSkillFrontmatter(`---
name: synthetic
description: "Use when a \\"quoted\\" trigger applies."
---

# Synthetic
`)
  expect(frontmatter).toMatchObject({
    name: "synthetic",
    description: 'Use when a "quoted" trigger applies.',
  })
})

describe("skill invocation policy", () => {
  test("parses explicit-only metadata and treats a missing policy as implicit", () => {
    expect(parseOpenAiPolicy("interface:\n  display_name: Grill Me\npolicy:\n  allow_implicit_invocation: false\n"))
      .toEqual({ allowImplicitInvocation: false })
    expect(parseOpenAiPolicy("policy:\n  allow_implicit_invocation: true\n"))
      .toEqual({ allowImplicitInvocation: true })
    expect(parseOpenAiPolicy("interface:\n  display_name: Engineering\n"))
      .toEqual({ allowImplicitInvocation: true })
  })

  test("rejects an invalid invocation policy", () => {
    expect(() => parseOpenAiPolicy("policy:\n  allow_implicit_invocation: no\n", "synthetic.yaml"))
      .toThrow("synthetic.yaml:2 allow_implicit_invocation must be true or false")
    expect(() => parseOpenAiPolicy("policy:\n  allow_implicit_invocation : false\n", "synthetic.yaml"))
      .toThrow("synthetic.yaml:2 allow_implicit_invocation must be true or false")
  })

  test("recognizes only an exact skill token with a dollar prefix", () => {
    expect(hasExactSkillInvocation("Use $grill-me to interview me.", "grill-me")).toBe(true)
    expect(hasExactSkillInvocation("Please grill me interactively.", "grill-me")).toBe(false)
    expect(hasExactSkillInvocation("Use $grill-me-extra.", "grill-me")).toBe(false)
  })

  test("rejects an implicit fixture selection for an explicit-only skill", () => {
    const explicitOnly = new Set(["grill-me"])
    expect(validateExplicitOnlySelections("Please grill me.", ["grill-me"], explicitOnly, "cases[0]")).toEqual([
      "cases[0] selects explicit-only skill grill-me without exact $grill-me invocation",
    ])
    expect(validateExplicitOnlySelections("Use $grill-me.", ["grill-me"], explicitOnly, "cases[0]")).toEqual([])
  })

  test("rejects explicit-only metadata that is missing or changed", () => {
    expect(validateExplicitOnlyInventory([], new Set())).toEqual([])
    expect(validateExplicitOnlyInventory(["grill-me"], new Set())).toEqual([
      "explicit_only_skills mismatch; fixture=grill-me actual=",
    ])
    expect(validateExplicitOnlyInventory(["grill-me"], new Set(["grill-me"]))).toEqual([])
    expect(validateExplicitOnlyInventory(["grill-me"], new Set(["grill-me", "grilling"]))).toEqual([
      "explicit_only_skills mismatch; fixture=grill-me actual=grill-me,grilling",
    ])
  })

  test("labels explicit-only skills in the live catalog", () => {
    expect(formatSkillCatalogLine("grill-me", "Explicit wrapper.", { allowImplicitInvocation: false }))
      .toBe("- grill-me [explicit-only; exact $grill-me invocation required]: Explicit wrapper.")
    expect(formatSkillCatalogLine("engineering", "Implicit owner.", { allowImplicitInvocation: true }))
      .toBe("- engineering: Implicit owner.")
  })
})

test("result schema validation rejects a changed property type", () => {
  const invalid = structuredClone(resultSchema) as Record<string, unknown>
  const properties = invalid.properties as Record<string, unknown>
  const primary = properties.primary_skill as Record<string, unknown>
  primary.type = "number"
  expect(validateResultSchema(invalid)).toContain(
    "result schema primary_skill must be a patterned string",
  )
})

test("JSON loading distinguishes a missing file from invalid content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "routing-evals-json-"))
  const malformed = join(directory, "malformed.json")
  try {
    await expect(readJson(join(directory, "missing.json"))).rejects.toThrow("unable to read")
    await writeFile(malformed, "{not-json}\n")
    await expect(readJson(malformed)).rejects.toThrow("invalid JSON")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("fixture validation rejects unknown top-level fields", () => {
  expect(validateFixtureTopLevel({ ...fixture, unexpected: true })).toEqual([
    "routing fixture must contain exactly version, engineering_skills, explicit_only_skills, skill_references, invocation_coverage, cases",
  ])
})

test("a subprocess timeout kills a process group that ignores TERM", async () => {
  const setsid = Bun.which("setsid")
  const cmd = setsid ? [setsid, "sh", "-c", "trap '' TERM; sleep 5"] : ["sleep", "5"]
  const child = Bun.spawn({ cmd, stdin: "ignore", stdout: "pipe", stderr: "pipe" })
  const startedAt = performance.now()
  await expect(collectSubprocess(child, "synthetic child", 10, Boolean(setsid), 20)).rejects.toThrow(
    "synthetic child timed out after 10ms",
  )
  expect(performance.now() - startedAt).toBeLessThan(1_000)
  expect(await child.exited).not.toBe(0)
})

test("the surface check reports rg execution failures", async () => {
  const directory = await mkdtemp(join(tmpdir(), "routing-evals-rg-"))
  const rg = join(directory, "rg")
  try {
    await writeFile(rg, "#!/bin/sh\nexit 2\n")
    await chmod(rg, 0o700)
    const child = Bun.spawn({
      cmd: ["bash", join(import.meta.dir, "check-skill-surface.sh")],
      cwd: join(import.meta.dir, "../.."),
      env: { ...process.env, PATH: `${directory}:${process.env.PATH ?? ""}` },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    })
    const result = await collectSubprocess(child, "surface check", 5_000)
    expect(result.exitCode).toBe(2)
    expect(result.stdout).not.toContain("skill surface checks passed")
    expect(result.stderr).toContain("rg could not scan for outdated guidance")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})


describe("eval model selection", () => {
  test("defaults to deployed model and accepts explicit comparison runs", () => {
    const defaults = parseArgs(["dry-run"])
    expect(defaults.model).toBe("gpt-6-astra")
    expect(defaults.effort).toBe("high")
    const comparison = parseArgs(["dry-run", "--model", "gpt-5.6-sol", "--effort", "xhigh"])
    const args = codexExecArgs("/tmp/example", "task", comparison.model, comparison.effort)
    expect(args).toContain("gpt-5.6-sol")
    expect(args).toContain('model_reasoning_effort="xhigh"')
    expect(args).toContain("read-only")
  })
  test("guards live calls and rejects config injection", () => {
    expect(() => parseArgs(["live", "--case", "routine-refactor"])).toThrow("--allow-live")
    expect(() => parseArgs(["live", "--allow-live"])).toThrow("requires --case")
    expect(() => parseArgs(["dry-run", "--effort", 'high" bad=true'])).toThrow("invalid reasoning")
    expect(() => parseArgs(["dry-run", "--model", "model with spaces"])).toThrow("invalid model")
  })
})

describe("adaptive review contract", () => {
  const validate = (entry: RoutingCase) => validateCase(entry, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(fixture.explicit_only_skills), resultSchema)
  test("allows one independent coupled reviewer and separate tracks without an agent quota", () => {
    for (const id of ["small-coupled-review", "independent-review-tracks", "single-track-read-only-review"]) {
      expect(validate(fixture.cases.find(entry => entry.id === id)!)).toEqual([])
    }
  })
  test("rejects missing coverage accounting and conflicting delegation", () => {
    const entry = structuredClone(fixture.cases.find(entry => entry.id === "small-coupled-review")!)
    entry.required_actions = entry.required_actions.filter(action => action !== "account-for-all-review-topics")
    expect(validate(entry)).toContain("cases[0] adaptive review must account for all review topics")
    entry.required_actions.push("delegate-independent-tracks")
    expect(validate(entry)).toContain("cases[0] one coupled reviewer cannot require separate review tracks")
  })
  test("rejects obsolete fixed reviewer quotas", () => {
    const entry = structuredClone(fixture.cases.find(entry => entry.id === "small-coupled-review")!)
    entry.required_actions.push("launch-exactly-eight-distinct-read-only-subagents")
    expect(validate(entry)).toContain("cases[0] references unknown action launch-exactly-eight-distinct-read-only-subagents")
  })
})

describe("progressive review contract", () => {
  const entry = (id: string) => fixture.cases.find(candidate => candidate.id === id)!
  const resultFor = (routingCase: RoutingCase): RoutingResult => ({
    primary_skill: routingCase.primary_skill,
    modifier_skills: [...routingCase.expected_modifier_skills],
    references: [...routingCase.expected_references],
    actions: [...routingCase.required_actions],
    ...Object.fromEntries(Object.entries(routingCase.expectations).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])),
  } as RoutingResult)
  const validate = (value: unknown) => validateCase(value, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)

  test("completion and commit cases require review without naming the skill", () => {
    for (const id of ["implementation-complete-needs-review", "commit-ready-needs-review"]) {
      const routingCase = entry(id)
      expect(routingCase.prompt).not.toContain("review-and-simplify-changes")
      const result = resultFor(routingCase)
      expect(parseLiveResult(JSON.stringify(result), fixture, resultSchema)).toEqual(result)
      expect(compareResult(routingCase, result)).toEqual([])
      expect(compareResult(routingCase, { ...result, primary_skill: "engineering", actions: ["verify-before-completion"] })).toContain(
        "missing required action apply-post-implementation-review",
      )
      expect(compareResult(routingCase, { ...result, primary_skill: "engineering" })).toContain(
        "primary_skill: expected review-and-simplify-changes, got engineering",
      )
    }
  })

  test("an initial pass cannot substitute a delta for the full intended diff", () => {
    const routingCase = entry("implementation-complete-needs-review")
    const result = resultFor(routingCase)
    result.actions = result.actions.filter(action => action !== "review-entire-intended-diff")
    result.actions.push("review-delta-since-last-snapshot")
    expect(compareResult(routingCase, result)).toEqual(["missing required action review-entire-intended-diff"])
  })

  test("a valid follow-up rejects a full repeat and keeps affected context and open findings", () => {
    const routingCase = entry("follow-up-review-delta")
    const result = resultFor(routingCase)
    expect(compareResult(routingCase, result)).toEqual([])
    expect(compareResult(routingCase, { ...result, actions: [...result.actions, "review-entire-intended-diff"] })).toEqual([
      "forbidden action review-entire-intended-diff",
    ])
    for (const action of ["review-delta-since-last-snapshot", "trace-affected-contracts", "carry-unresolved-findings-forward", "retain-main-review-ownership", "confirm-final-review-coverage"]) {
      expect(compareResult(routingCase, { ...result, actions: result.actions.filter(value => value !== action) })).toEqual([
        `missing required action ${action}`,
      ])
    }
  })

  test("main-agent review cannot satisfy independent reviewer selection", () => {
    const routingCase = entry("follow-up-review-delta")
    const result = resultFor(routingCase)
    result.actions = result.actions.filter(action => action !== "select-minimum-useful-reviewers")
    result.actions.push("keep-coupled-review-local")
    expect(compareResult(routingCase, result)).toEqual([
      "missing required action select-minimum-useful-reviewers",
      "forbidden action keep-coupled-review-local",
    ])
  })

  test("missing reviewer selection and arbitrary delegation still fail", () => {
    const routingCase = entry("follow-up-review-delta")
    const result = resultFor(routingCase)
    result.actions = result.actions.filter(action => action !== "select-minimum-useful-reviewers")
    expect(compareResult(routingCase, result)).toEqual(["missing required action select-minimum-useful-reviewers"])
    result.actions.push("delegate-independent-tracks")
    expect(compareResult(routingCase, result)).toEqual(["missing required action select-minimum-useful-reviewers"])
  })

  test("a missing snapshot cannot pass with assumed incremental coverage", () => {
    const routingCase = entry("follow-up-review-missing-snapshot")
    const result = resultFor(routingCase)
    result.actions = result.actions.filter(action => !["recover-review-snapshot-or-full-scope", "review-entire-intended-diff"].includes(action))
    result.actions.push("review-delta-since-last-snapshot")
    expect(compareResult(routingCase, result)).toEqual([
      "missing required action recover-review-snapshot-or-full-scope",
      "missing required action review-entire-intended-diff",
    ])
  })

  test("slice checks alone cannot close unreviewed combined wiring", () => {
    const routingCase = entry("combined-slice-review")
    const result = resultFor(routingCase)
    result.actions = result.actions.filter(action => action !== "apply-post-implementation-review")
    expect(compareResult(routingCase, result)).toEqual([])
    result.actions = result.actions.filter(action => action !== "review-combined-integration")
    expect(compareResult(routingCase, result)).toEqual(["missing required action review-combined-integration"])
  })

  test("standalone review remains read-only and delegation loads its own reference", () => {
    const readOnly = entry("broad-read-only-review")
    expect(compareResult(readOnly, { ...resultFor(readOnly), mutation: "requested-repo-writes" })).toEqual([
      "mutation: expected none, got requested-repo-writes",
    ])
    const delegated = entry("independent-review-tracks")
    expect(compareResult(delegated, { ...resultFor(delegated), references: [] })).toEqual([
      "references: expected review-and-simplify-changes/references/delegated-review.md, got ",
    ])
  })

  test("forbidden actions are optional, known, unique, and disjoint from required actions", () => {
    const routingCase = entry("follow-up-review-delta")
    expect(validate(routingCase)).toEqual([])
    expect(validate(entry("broad-read-only-review"))).toEqual([])
    expect(validate({ ...routingCase, forbidden_actions: "review-entire-intended-diff" })).toContain("cases[0].forbidden_actions must be a string array")
    expect(validate({ ...routingCase, forbidden_actions: ["review-entire-intended-diff", "review-entire-intended-diff"] })).toContain("cases[0].forbidden_actions must not contain duplicates")
    expect(validate({ ...routingCase, forbidden_actions: ["unknown-review-action"] })).toContain("cases[0] references unknown action unknown-review-action")
    expect(validate({ ...routingCase, forbidden_actions: ["review-delta-since-last-snapshot"] })).toContain("cases[0] both requires and forbids action review-delta-since-last-snapshot")
    expect(validate({ ...routingCase, unexpected: true }).some(error => error.includes("optional forbidden_actions only"))).toBe(true)
  })
})

describe("oracle review selection", () => {
  const resultFor = (entry: RoutingCase): RoutingResult => ({
    primary_skill: entry.primary_skill, modifier_skills: entry.expected_modifier_skills, references: entry.expected_references,
    actions: entry.required_actions, first_action: "pin-review-scope", mutation: "none", question: "only-if-blocked", stop: "findings",
  })

  test("delegated substantive review needs Oracle, all assigned coverage, and nonrecursive children", () => {
    const entry = fixture.cases.find(candidate => candidate.id === "delegated-substantive-defect-review")!
    const result = resultFor(entry)
    expect(parseLiveResult(JSON.stringify(result), fixture, resultSchema)).toEqual(result)
    expect(compareResult(entry, result)).toEqual([])
    for (const action of ["delegate-oracle-review", "delegate-standards-intent-simplification", "use-built-in-review-agent", "keep-reviewers-nonrecursive", "retain-main-review-ownership"]) {
      expect(compareResult(entry, { ...result, actions: result.actions.filter(value => value !== action) })).toEqual([`missing required action ${action}`])
    }
  })

  test("every substantive pass requires independent review including initial, fix, and integration passes", () => {
    const excluded = new Set(["delegated-mechanical-review-evidence", "delegated-review-command-evidence", "review-no-independent-capacity"])
    const cases = fixture.cases.filter(entry => entry.primary_skill === "review-and-simplify-changes" && !excluded.has(entry.id))
    for (const entry of cases) {
      const result = {
        ...resultFor(entry),
        ...Object.fromEntries(Object.entries(entry.expectations).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])),
      } as RoutingResult
      expect(compareResult(entry, result)).toEqual([])
      for (const action of ["delegate-oracle-review", "delegate-standards-intent-simplification", "keep-reviewers-nonrecursive", "retain-main-review-ownership"]) {
        expect(compareResult(entry, { ...result, actions: result.actions.filter(value => value !== action) })).toEqual([`missing required action ${action}`])
        const incomplete = { ...entry, required_actions: entry.required_actions.filter(value => value !== action) }
        expect(validateCase(incomplete, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)).toContain(`cases[0] substantive review must require ${action}`)
      }
      expect(compareResult(entry, { ...result, actions: [...result.actions, "keep-coupled-review-local"] })).toEqual(["forbidden action keep-coupled-review-local"])
    }
  })

  test("separable material tracks are assigned and dispatched in parallel when capacity exists", () => {
    const entry = fixture.cases.find(candidate => candidate.id === "independent-review-tracks")!
    const result = resultFor(entry)
    expect(compareResult(entry, result)).toEqual([])
    for (const action of ["delegate-independent-tracks", "dispatch-independent-tracks-in-parallel", "account-for-all-review-topics"]) {
      expect(compareResult(entry, { ...result, actions: result.actions.filter(value => value !== action) })).toEqual([`missing required action ${action}`])
    }
    expect(compareResult(entry, { ...result, actions: [...result.actions, "delegate-one-coupled-review"] })).toEqual(["forbidden action delegate-one-coupled-review"])
    const unassigned = { ...entry, required_actions: entry.required_actions.filter(action => action !== "delegate-independent-tracks") }
    expect(validateCase(unassigned, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)).toContain("cases[0] parallel review must assign independent tracks")
  })

  test("unavailable independent capacity blocks review without main-agent fallback or unnecessary questions", () => {
    const entry = fixture.cases.find(candidate => candidate.id === "review-no-independent-capacity")!
    expect(entry.required_actions).not.toContain("select-minimum-useful-reviewers")
    expect(entry.required_actions).not.toContain("account-for-all-review-topics")
    expect(validateCase(entry, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)).toEqual([])
    const result = { ...resultFor(entry), question: "none", stop: "blocked" }
    expect(parseLiveResult(JSON.stringify(result), fixture, resultSchema)).toEqual(result)
    expect(compareResult(entry, result)).toEqual([])
    expect(compareResult(entry, { ...result, actions: result.actions.filter(action => action !== "report-blocked-review-coverage") })).toEqual(["missing required action report-blocked-review-coverage"])
    for (const action of ["keep-coupled-review-local", "delegate-oracle-review", "confirm-final-review-coverage"]) {
      expect(compareResult(entry, { ...result, actions: [...result.actions, action] })).toEqual([`forbidden action ${action}`])
    }
    expect(compareResult(entry, { ...result, question: "only-if-blocked" })).toEqual(["question: expected none, got only-if-blocked"])
    for (const stop of ["findings", "after-verification"]) {
      expect(compareResult(entry, { ...result, stop })).toEqual([`stop: expected blocked, got ${stop}`])
    }
    expect(compareResult(entry, { ...result, mutation: "requested-repo-writes" })).toEqual(["mutation: expected none, got requested-repo-writes"])
  })

  test("mechanical evidence and command verification require their own roles", () => {
    for (const [id, role] of [["delegated-mechanical-review-evidence", "delegate-fast-review"], ["delegated-review-command-evidence", "delegate-command-verification"]]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      const result = resultFor(entry)
      expect(compareResult(entry, result)).toEqual([])
      expect(compareResult(entry, { ...result, actions: result.actions.filter(action => action !== role) })).toEqual([`missing required action ${role}`])
      expect(compareResult(entry, { ...result, actions: [...result.actions, "delegate-oracle-review"] })).toEqual(["forbidden action delegate-oracle-review"])
      expect(compareResult(entry, { ...result, actions: [...result.actions, "consult-oracle"] })).toEqual(["forbidden action consult-oracle"])
      expect(compareResult(entry, { ...result, actions: [...result.actions, "use-built-in-review-agent"] })).toEqual(["forbidden action use-built-in-review-agent"])
      const otherRole = role === "delegate-fast-review" ? "delegate-command-verification" : "delegate-fast-review"
      expect(compareResult(entry, { ...result, actions: [...result.actions, otherRole] })).toEqual([`forbidden action ${otherRole}`])
      expect(compareResult(entry, { ...result, actions: result.actions.filter(action => action !== "keep-task-read-only") })).toEqual(["missing required action keep-task-read-only"])
      expect(compareResult(entry, { ...result, mutation: "requested-repo-writes" })).toEqual(["mutation: expected none, got requested-repo-writes"])
      if (role === "delegate-command-verification") {
        for (const action of ["do-not-invent-verification", "retain-main-review-ownership"]) {
          expect(compareResult(entry, { ...result, actions: result.actions.filter(value => value !== action) })).toEqual([`missing required action ${action}`])
        }
      }
    }
  })

  test("evidence-only completion accepts the requested boundary without redundant scope labels", () => {
    for (const id of ["delegated-mechanical-review-evidence", "delegated-review-command-evidence"]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      const result = resultFor(entry)
      expect(result.actions).not.toContain("pin-review-scope")
      expect(result.actions).not.toContain("honor-single-track-scope")
      const stops = id === "delegated-review-command-evidence"
        ? ["findings", "after-verification", "after-requested-scope"]
        : ["findings", "after-requested-scope"]
      for (const stop of stops) {
        const scoped = { ...result, stop }
        expect(parseLiveResult(JSON.stringify(scoped), fixture, resultSchema)).toEqual(scoped)
        expect(compareResult(entry, scoped)).toEqual([])
      }
      expect(compareResult(entry, { ...result, stop: "plan" }).some(failure => failure.startsWith("stop:"))).toBe(true)
      expect(compareResult(entry, { ...result, first_action: "inspect-current-state" })).toEqual(["first_action: expected pin-review-scope, got inspect-current-state"])
    }
    const command = fixture.cases.find(candidate => candidate.id === "delegated-review-command-evidence")!
    expect(compareResult(command, {
      ...resultFor(command), stop: "after-verification",
      actions: ["delegate-command-verification", "retain-main-review-ownership", "keep-task-read-only", "select-minimum-useful-reviewers", "do-not-invent-verification", "verify-before-completion", "confirm-final-review-coverage"],
    })).toEqual([])
  })

  test("evidence-only scope rejects broader delegation and reopened source review", () => {
    for (const id of ["delegated-mechanical-review-evidence", "delegated-review-command-evidence"]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      const result = resultFor(entry)
      for (const action of ["delegate-independent-tracks", "delegate-standards-intent-simplification", "delegate-one-coupled-review", "dispatch-independent-tracks-in-parallel", "keep-coupled-review-local", "apply-post-implementation-review", "review-entire-intended-diff", "review-delta-since-last-snapshot", "review-combined-integration"]) {
        expect(compareResult(entry, { ...result, actions: [...result.actions, action] })).toEqual([`forbidden action ${action}`])
      }
    }
  })

  test("evidence-only fixture validation requires explicit role and scope exclusions", () => {
    const validate = (entry: RoutingCase) => validateCase(entry, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)
    for (const id of ["delegated-mechanical-review-evidence", "delegated-review-command-evidence"]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      expect(validate(entry)).toEqual([])
      for (const action of entry.forbidden_actions!) {
        expect(validate({ ...entry, forbidden_actions: entry.forbidden_actions!.filter(value => value !== action) })).toContain("cases[0] review must select adaptive coverage or explicit single-track")
      }
      expect(validate({ ...entry, expectations: { ...entry.expectations, first_action: "inspect-current-state" } })).toContain("cases[0] review must pin scope")
      expect(validate({ ...entry, required_actions: entry.required_actions.filter(action => action !== "keep-task-read-only") })).toContain("cases[0] single-track review must remain read-only")
    }
  })

  test("Oracle design and debugging advice do not become defect reviews", () => {
    for (const id of ["oracle-design-advice", "oracle-stalled-debugging-advice"]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      const result = { ...resultFor(entry), first_action: "inspect-current-state", stop: "recommendation" }
      expect(parseLiveResult(JSON.stringify(result), fixture, resultSchema)).toEqual(result)
      expect(compareResult(entry, result)).toEqual([])
      expect(compareResult(entry, { ...result, actions: result.actions.filter(action => action !== "consult-oracle") })).toEqual(["missing required action consult-oracle"])
      for (const action of ["delegate-oracle-review", "use-built-in-review-agent"]) {
        expect(compareResult(entry, { ...result, actions: [...result.actions, action] })).toEqual([`forbidden action ${action}`])
      }
    }
  })

  test("each concrete risk requires oracle selection and preserves read-only review", () => {
    for (const id of ["oracle-tenant-boundary-review", "oracle-charge-retry-review", "oracle-mixed-version-migration-review", "oracle-unresolved-review-dispute"]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      const result = resultFor(entry)
      expect(parseLiveResult(JSON.stringify(result), fixture, resultSchema)).toEqual(result)
      expect(compareResult(entry, result)).toEqual([])
      expect(compareResult(entry, { ...result, actions: result.actions.filter(action => action !== "delegate-oracle-review") })).toEqual([
        "missing required action delegate-oracle-review",
      ])
      expect(compareResult(entry, { ...result, mutation: "requested-repo-writes" })).toEqual(["mutation: expected none, got requested-repo-writes"])
    }
  })

  test("billing copy and a small coupled helper still require one independent reviewer", () => {
    for (const id of ["billing-copy-independent-review", "small-coupled-review"]) {
      const entry = fixture.cases.find(candidate => candidate.id === id)!
      const result = resultFor(entry)
      expect(compareResult(entry, result)).toEqual([])
      for (const action of ["delegate-oracle-review", "delegate-one-coupled-review"]) {
        expect(compareResult(entry, { ...result, actions: result.actions.filter(value => value !== action) })).toEqual([`missing required action ${action}`])
      }
      for (const action of ["keep-coupled-review-local", "delegate-independent-tracks", "dispatch-independent-tracks-in-parallel"]) {
        expect(compareResult(entry, { ...result, actions: [...result.actions, action] })).toEqual([`forbidden action ${action}`])
      }
    }
  })

  test("migration review retains its data modifier and actual root references", () => {
    const entry = fixture.cases.find(candidate => candidate.id === "oracle-mixed-version-migration-review")!
    const result = resultFor(entry)
    expect(compareResult(entry, { ...result, modifier_skills: [] })).toEqual([
      "modifier_skills: expected designing-data-intensive-systems, got ",
    ])
    expect(result.references).toContain("designing-data-intensive-systems/FOUNDATIONS.md")
    expect(result.references).toContain("designing-data-intensive-systems/TRANSACTIONS.md")
    expect(parseLiveResult(JSON.stringify(result), fixture, resultSchema)).toEqual(result)
  })

  test("oracle follow-up retains the delta and prior coverage", () => {
    const entry = fixture.cases.find(candidate => candidate.id === "oracle-unresolved-review-dispute")!
    const result = resultFor(entry)
    expect(compareResult(entry, { ...result, actions: [...result.actions, "review-entire-intended-diff"] })).toEqual(["forbidden action review-entire-intended-diff"])
    expect(compareResult(entry, { ...result, actions: result.actions.filter(action => action !== "review-delta-since-last-snapshot") })).toEqual([
      "missing required action review-delta-since-last-snapshot",
    ])
    const conflicting = { ...entry, required_actions: [...entry.required_actions, "keep-coupled-review-local"] }
    expect(validateCase(conflicting, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)).toContain(
      "cases[0] review cannot require main-agent coverage",
    )
  })
})

describe("source agent catalog", () => {
  test("consumed symlinked profile changes alter provenance without traversing directory links", async () => {
    const root = await mkdtemp(join(tmpdir(), "routing-symlink-profile-"))
    try {
      await mkdir(join(root, "skills"))
      await mkdir(join(root, "agents"))
      await writeFile(join(root, "AGENTS.md"), "# Source instructions\n")
      const target = join(root, "profile.toml")
      await writeFile(target, 'name = "oracle"\ndescription = "Original review trigger."\n')
      await symlink(target, join(root, "agents/oracle.toml"))
      await symlink(join(root, "agents"), join(root, "agents/loop"))
      const before = await sourceProvenance(root)
      expect(await agentCatalog(root)).toContain("Original review trigger.")
      await writeFile(target, 'name = "oracle"\ndescription = "Changed review trigger."\n')
      expect(await agentCatalog(root)).toContain("Changed review trigger.")
      expect((await sourceProvenance(root)).source_hash).not.toBe(before.source_hash)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  test("paired prompts read their own descriptions and profile edits change source evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "routing-agent-catalog-"))
    try {
      const roots = [join(root, "previous"), join(root, "candidate")]
      for (const source of roots) {
        await mkdir(join(source, "agents"), { recursive: true })
        await symlink(join(import.meta.dir, ".."), join(source, "skills"))
        await writeFile(join(source, "AGENTS.md"), "# Source instructions\n")
        await writeFile(join(source, "agents/registry.toml"), "[agents]\nmax_depth = 2\n")
        await writeFile(join(source, "agents/oracle_reviewer.toml"), 'name = "oracle_reviewer"\ndescription = "Previous review trigger."\n')
      }
      expect((await sourceProvenance(roots[0]!)).source_hash).toBe((await sourceProvenance(roots[1]!)).source_hash)
      await rm(join(roots[1]!, "agents/oracle_reviewer.toml"))
      await writeFile(join(roots[1]!, "agents/oracle.toml"), 'name = "oracle"\ndescription = "Candidate concrete risk trigger."\n')
      const previous = await buildLivePrompt(fixture.cases[0]!, fixture, join(roots[0]!, "skills"))
      const candidate = await buildLivePrompt(fixture.cases[0]!, fixture, join(roots[1]!, "skills"))
      expect(previous).toContain("oracle_reviewer: Previous review trigger.")
      expect(previous).not.toContain("Candidate concrete risk trigger.")
      expect(candidate).toContain("oracle: Candidate concrete risk trigger.")
      expect(candidate).not.toContain("oracle_reviewer")
      expect(candidate).not.toContain("Previous review trigger.")
      expect(candidate).not.toContain("max_depth")
      expect((await sourceProvenance(roots[0]!)).source_hash).not.toBe((await sourceProvenance(roots[1]!)).source_hash)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  test("malformed profiles fail instead of silently dropping a role", async () => {
    const root = await mkdtemp(join(tmpdir(), "routing-agent-profile-"))
    try {
      expect(await agentCatalog(root)).toBe("No source agent profiles.")
      await mkdir(join(root, "agents"))
      const path = join(root, "agents/oracle.toml")
      await writeFile(path, 'name = "wrong_role"\ndescription = "Review trigger."\n')
      await expect(agentCatalog(root)).rejects.toThrow("filename-matching name")
      await writeFile(path, 'name = "oracle"\ndescription = ""\n')
      await expect(agentCatalog(root)).rejects.toThrow("non-empty description")
      await writeFile(path, 'name = "oracle"\ndescription = [\n')
      await expect(agentCatalog(root)).rejects.toThrow()
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  test("a profile directory access error is not an absent catalog", async () => {
    const root = await mkdtemp(join(tmpdir(), "routing-agent-error-"))
    try {
      await writeFile(join(root, "agents"), "not a directory")
      await expect(agentCatalog(root)).rejects.toThrow()
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})

describe("invocation coverage and catalog stress", () => {
  test("all descriptions have positive and near-negative cases; none is a valid route", () => {
    expect(validateInvocationCoverage(fixture)).toEqual([])
    const entry = fixture.cases.find(entry => entry.id === "no-applicable-skill")!
    expect(parseLiveResult(JSON.stringify({ ...validResult, primary_skill: "none" }), fixture, resultSchema).primary_skill).toBe("none")
    expect(validateCase(entry, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)).toEqual([])
    expect(compareResult(entry, validResult)).toContain("primary_skill: expected none, got engineering")
    expect(() => parseLiveResult(JSON.stringify({ ...validResult, primary_skill: "none", modifier_skills: ["test-design"] }), fixture, resultSchema)).toThrow("none route must not select")
  })
  test("missing, unknown, or positive-selected near negatives fail coverage", () => {
    const changed = structuredClone(fixture)
    delete changed.invocation_coverage.debugging
    expect(validateInvocationCoverage(changed)).toContain("invocation coverage must name every installed skill exactly once")
    changed.invocation_coverage = structuredClone(fixture.invocation_coverage)
    changed.invocation_coverage.debugging!.near_negative = ["unknown-flaky-failure"]
    expect(validateInvocationCoverage(changed)).toContain("debugging near_negative case unknown-flaky-failure has contradictory selection")
    changed.invocation_coverage.debugging!.near_negative = ["missing"]
    expect(validateInvocationCoverage(changed)).toContain("debugging coverage names unknown case missing")
  })
  test("catalog variants are deterministic and explicitly synthetic", async () => {
    const root = join(import.meta.dir, "..")
    const full = await skillCatalog(root, fixture.engineering_skills)
    const truncated = await skillCatalog(root, fixture.engineering_skills, "synthetic-truncated")
    const crowded = await skillCatalog(root, fixture.engineering_skills, "synthetic-crowded")
    expect(truncated.length).toBeLessThan(full.length)
    expect(crowded).toContain("synthetic-catalog-59")
    expect(crowded).toContain("synthetic distractor; no file")
    expect(await skillCatalog(root, fixture.engineering_skills, "synthetic-crowded")).toBe(crowded)
    const prompt = await buildLivePrompt(fixture.cases[0]!, fixture, root, "synthetic-truncated")
    expect(prompt).toContain('primary_skill "none"')
    expect(prompt).toContain("stress tests, not measurements of host catalog rendering")
    expect(prompt).not.toContain("Classification rules:")
    expect(prompt).not.toContain("Permission to implement does not grant")
    expect(prompt).not.toContain("An explicit review-scope pin comes first")
  })
  test("comparison roots preserve case, model, effort, and variant selection", () => {
    const args = parseArgs(["dry-run", "--case", "routine-refactor", "--source-root", "/tmp/candidate", "--previous-source-root", "/tmp/previous", "--catalog-variant", "synthetic-crowded"])
    expect(args.skillsRoot).toBe("/tmp/candidate/skills")
    expect(args.previousSourceRoot).toBe("/tmp/previous")
    expect(args.catalogVariant).toBe("synthetic-crowded")
    expect(() => parseArgs(["dry-run", "--catalog-variant", "native-truncated"])).toThrow("invalid catalog")
  })
  test("surface validation permits prose restructuring while preserving metadata limits", async () => {
    const root = await mkdtemp(join(tmpdir(), "skill-surface-"))
    try {
      await mkdir(join(root, "example"))
      const path = join(root, "example/SKILL.md")
      await writeFile(path, '---\nname: example\ndescription: "Use when evaluating the example."\n---\n\n# Example\n\nA short instruction, without fixed headings.\n')
      expect((await validateSkillEntrypoints(root, ["example"])).errors).toEqual([])
      await writeFile(path, '---\nname: wrong\ndescription: "A workflow summary."\n---\n')
      const errors = (await validateSkillEntrypoints(root, ["example"])).errors
      expect(errors.some(error => error.includes("name must match"))).toBe(true)
      expect(errors.some(error => error.includes("Use when"))).toBe(true)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  test("reference schema accepts actual local reference paths", () => {
    const pattern = (resultSchema as any).properties.references.items.pattern
    for (const reference of ["engineering/references/boundary-design.md", "designing-data-intensive-systems/FOUNDATIONS.md", "designing-data-intensive-systems/TRANSACTIONS.md", "effect-ts/references/BEST_PRACTICES/schema-patterns.md"]) {
      expect(new RegExp(pattern).test(reference)).toBe(true)
    }
    for (const reference of ["engineering/references/boundary-designXmd", "../SKILL.md", "engineering/../SKILL.md", "/tmp/reference.md"]) {
      expect(new RegExp(pattern).test(reference)).toBe(false)
    }
  })
  test("reference serialization keeps the owning skill and rejects invented paths", async () => {
    const prompt = await buildLivePrompt(fixture.cases[0]!, fixture, join(import.meta.dir, ".."))
    expect(prompt).toContain("Reference paths are relative to the supplied skills root, beginning with the owning skill folder.")
    for (const reference of ["skills/references/delegated-review.md", "designing-data-intensive-systems/references/placeholder.md", "designing-data-intensive-systems/MISSING.md"]) {
      expect(() => parseLiveResult(JSON.stringify({ ...validResult, references: [reference] }), fixture, resultSchema)).toThrow("unknown reference")
    }
  })
})

test("none route allows no extra actions and either direct-answer stop", () => {
  const entry = fixture.cases.find(entry => entry.id === "no-applicable-skill")!
  for (const stop of ["after-artifact", "after-requested-scope"]) {
    expect(compareResult(entry, { primary_skill: "none", modifier_skills: [], references: [], actions: [], first_action: "answer-directly", mutation: "none", question: "only-if-blocked", stop })).toEqual([])
  }
  const emptyActions = { ...fixture.cases.find(entry => entry.primary_skill === "engineering")!, required_actions: [] }
  expect(validateCase(emptyActions, 0, new Set(fixture.engineering_skills), new Set(fixture.skill_references), new Set(), resultSchema)).toContain("cases[0].required_actions must not be empty")
})

test("CLI validates the exact supplied skill root, including nonstandard and missing paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "skill-root-selection-"))
  try {
    await symlink(join(import.meta.dir, ".."), join(root, "custom-skills"))
    await writeFile(join(root, "AGENTS.md"), "# Fixture instructions\n")
    const run = async (path: string) => collectSubprocess(Bun.spawn({
      cmd: ["bun", join(import.meta.dir, "run-routing-evals.ts"), "validate", "--skills-root", path],
      stdout: "pipe", stderr: "pipe",
    }), "exact skill root", 5_000)
    expect((await run(join(root, "custom-skills"))).exitCode).toBe(0)
    const missing = await run(join(import.meta.dir, "../..", "does-not-exist-for-validation"))
    expect(missing.exitCode).not.toBe(0)
    expect(missing.stdout).not.toContain("Routing eval fixture is valid")
  } finally { await rm(root, { recursive: true, force: true }) }
})

describe("previous source reference validation", () => {
  const reference = "review-and-simplify-changes/references/delegated-review.md"
  const candidateRoot = join(import.meta.dir, "../..")
  const withMissingReference = async (run: (root: string) => Promise<void>, keepSourceLink = false) => {
    const root = await mkdtemp(join(tmpdir(), "routing-previous-source-"))
    try {
      await cp(join(candidateRoot, "skills"), join(root, "skills"), { recursive: true })
      await cp(join(candidateRoot, "AGENTS.md"), join(root, "AGENTS.md"))
      await rm(join(root, "skills", reference))
      if (!keepSourceLink) {
        const entrypoint = join(root, "skills/review-and-simplify-changes/SKILL.md")
        const contents = await Bun.file(entrypoint).text()
        await writeFile(entrypoint, contents.split("\n").filter(line => !line.includes("references/delegated-review.md")).join("\n"))
      }
      await run(root)
    } finally { await rm(root, { recursive: true, force: true }) }
  }
  const dryRun = async (sourceRoot: string, previousRoot?: string, caseId = "routine-refactor") => collectSubprocess(Bun.spawn({
    cmd: ["bun", join(import.meta.dir, "run-routing-evals.ts"), "dry-run", "--case", caseId, "--source-root", sourceRoot,
      ...(previousRoot ? ["--previous-source-root", previousRoot] : [])],
    stdout: "pipe", stderr: "pipe",
  }), "previous source dry-run", 5_000)

  test("paired dry-runs retain expectations when only the previous source lacks a reference", async () => {
    await withMissingReference(async root => {
      for (const caseId of ["routine-refactor", "independent-review-tracks"]) {
        const result = await dryRun(candidateRoot, root, caseId)
        expect(result.exitCode).toBe(0)
        const records = result.stdout.trim().split("\n").map(line => JSON.parse(line))
        expect(records.map(record => record.source)).toEqual(["previous", "candidate"])
        expect(records[0].contract).toEqual(records[1].contract)
        expect(records[0].fixture_hash).toBe(records[1].fixture_hash)
        if (caseId === "independent-review-tracks") expect(records[0].contract.expected_references).toEqual([reference])
      }
    })
  })

  test("the candidate must contain every fixture reference", async () => {
    await withMissingReference(async root => {
      const result = await dryRun(root)
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain(`missing skill reference ${reference}`)
    })
  })

  test("a previous source's own broken Markdown link remains an error", async () => {
    await withMissingReference(async root => {
      const result = await dryRun(candidateRoot, root)
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("has missing local link target references/delegated-review.md")
    }, true)
  })

  test("a previous source reference read error is not treated as an absent file", async () => {
    await withMissingReference(async root => {
      await mkdir(join(root, "skills", reference))
      const result = await dryRun(candidateRoot, root)
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("EISDIR")
    })
  })
})


test("SIGKILL reaping has a separate scheduling allowance from TERM grace", async () => {
  const signals: string[] = []
  let finish!: (code: number) => void
  const exited = new Promise<number>(resolve => { finish = resolve })
  const child = {
    pid: 0, exitCode: null as number | null, exited,
    kill(signal: string) {
      signals.push(signal)
      if (signal === "SIGKILL") setTimeout(() => { child.exitCode = 137; finish(137) }, 50)
    },
  }
  await terminateSubprocess(child as unknown as Parameters<typeof terminateSubprocess>[0], false, 5)
  expect(signals).toEqual(["SIGTERM", "SIGKILL"])
  expect(child.exitCode).toBe(137)
})
