import { describe, expect, test } from "bun:test"
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  collectSubprocess,
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
  type RoutingCase,
  type RoutingFixture,
  type RoutingResult,
} from "./run-routing-evals.ts"

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
    "routing fixture must contain exactly version, engineering_skills, explicit_only_skills, skill_references, cases",
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
    expect(result.stderr).toContain("rg failed while checking")
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
  test("allows local coupled review and independent tracks without an agent quota", () => {
    for (const id of ["small-coupled-review", "independent-review-tracks", "single-track-read-only-review"]) {
      expect(validate(fixture.cases.find(entry => entry.id === id)!)).toEqual([])
    }
  })
  test("rejects missing coverage accounting and conflicting delegation", () => {
    const entry = structuredClone(fixture.cases.find(entry => entry.id === "small-coupled-review")!)
    entry.required_actions = entry.required_actions.filter(action => action !== "account-for-all-review-topics")
    expect(validate(entry)).toContain("cases[0] adaptive review must account for all review topics")
    entry.required_actions.push("delegate-independent-tracks")
    expect(validate(entry)).toContain("cases[0] coupled review cannot require independent delegation")
  })
  test("rejects obsolete fixed reviewer quotas", () => {
    const entry = structuredClone(fixture.cases.find(entry => entry.id === "small-coupled-review")!)
    entry.required_actions.push("launch-exactly-eight-distinct-read-only-subagents")
    expect(validate(entry)).toContain("cases[0] references unknown action launch-exactly-eight-distinct-read-only-subagents")
  })
})
