import { describe, expect, test } from "bun:test"
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  compareResult,
  collectSubprocess,
  parseSkillFrontmatter,
  parseLiveResult,
  readJson,
  validateFixtureTopLevel,
  validateResultSchema,
  type RoutingCase,
  type RoutingFixture,
  type RoutingResult,
} from "./run-routing-evals.ts"

const fixture = (await Bun.file(`${import.meta.dir}/routing-cases.json`).json()) as RoutingFixture
const resultSchema: unknown = await Bun.file(`${import.meta.dir}/routing-result.schema.json`).json()

const validResult: RoutingResult = {
  mandatory_router: "software-engineering-flow",
  primary_skill: "writing-software",
  secondary_skills: ["verification-before-completion"],
  sequence: ["software-engineering-flow", "writing-software", "verification-before-completion"],
  actions: ["inspect-before-editing", "verify-before-completion"],
  first_action: "inspect-current-state",
  mutation: "requested-repo-writes",
  question: "only-if-blocked",
  stop: "after-verification",
}

describe("live result boundary", () => {
  test("uses only structured-output-compatible array constraints", () => {
    expect(JSON.stringify(resultSchema)).not.toContain('"uniqueItems"')
  })

  test("accepts one strict schema-shaped JSON object", () => {
    expect(parseLiveResult(JSON.stringify(validResult), fixture, resultSchema)).toEqual(validResult)
  })

  test("rejects prefixed output instead of extracting braces", () => {
    expect(() => parseLiveResult(`progress\n${JSON.stringify(validResult)}`, fixture, resultSchema)).toThrow(
      "did not return JSON",
    )
  })

  test("rejects missing fields", () => {
    const { stop: _stop, ...incomplete } = validResult
    expect(() => parseLiveResult(JSON.stringify(incomplete), fixture, resultSchema)).toThrow(
      "must contain exactly",
    )
  })

  test("rejects duplicate sequence entries", () => {
    const duplicate = {
      ...validResult,
      sequence: [...validResult.sequence, "verification-before-completion"],
    }
    expect(() => parseLiveResult(JSON.stringify(duplicate), fixture, resultSchema)).toThrow(
      "sequence must not contain duplicates",
    )
  })
})

test("secondary skill order must match sequence order", () => {
  const routingCase: RoutingCase = {
    id: "ordered-secondary-test",
    prompt: "Synthetic ordering case for the routing evaluator.",
    mandatory_router: "software-engineering-flow",
    primary_skill: "writing-software",
    allowed_secondary_skills: ["testing-software", "verification-before-completion"],
    expected_sequence: ["software-engineering-flow", "writing-software"],
    required_actions: ["inspect-before-editing"],
    expectations: {
      first_action: "inspect-current-state",
      mutation: "requested-repo-writes",
      question: "only-if-blocked",
      stop: "after-verification",
    },
  }
  const reversed: RoutingResult = {
    ...validResult,
    secondary_skills: ["testing-software", "verification-before-completion"],
    sequence: [
      "software-engineering-flow",
      "writing-software",
      "verification-before-completion",
      "testing-software",
    ],
    actions: ["inspect-before-editing"],
  }
  expect(compareResult(routingCase, reversed)).toContain(
    "secondary_skills must match the ordered secondary entries in sequence",
  )
})

test("accepts explicit alternatives for every expectation field", () => {
  const routingCase: RoutingCase = {
    id: "first-action-alternative-test",
    prompt: "Synthetic first-action alternative case for the routing evaluator.",
    mandatory_router: "software-engineering-flow",
    primary_skill: "writing-software",
    allowed_secondary_skills: ["verification-before-completion"],
    expected_sequence: ["software-engineering-flow", "writing-software"],
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

test("decodes quoted frontmatter descriptions for the live catalog", () => {
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

test("result schema validation rejects property-shape drift", () => {
  const invalid = structuredClone(resultSchema)
  if (typeof invalid !== "object" || invalid === null || Array.isArray(invalid)) throw new Error("bad fixture")
  const properties = (invalid as Record<string, unknown>).properties
  if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
    throw new Error("bad fixture properties")
  }
  const primarySkill = (properties as Record<string, unknown>).primary_skill
  if (typeof primarySkill !== "object" || primarySkill === null || Array.isArray(primarySkill)) {
    throw new Error("bad primary_skill fixture")
  }
  Reflect.set(primarySkill, "type", "number")
  expect(validateResultSchema(invalid)).toContain(
    "result schema primary_skill must be a patterned string",
  )
})

test("JSON loading distinguishes missing files from malformed content", async () => {
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

test("fixture contract rejects unknown top-level fields", () => {
  expect(validateFixtureTopLevel({ ...fixture, unexpected: true })).toEqual([
    "routing fixture must contain exactly version, engineering_skills, and cases",
  ])
})

test("subprocess timeout kills a TERM-resistant process group", async () => {
  const setsid = Bun.which("setsid")
  const cmd = setsid
    ? [setsid, "sh", "-c", "trap '' TERM; sleep 5"]
    : ["sleep", "5"]
  const child = Bun.spawn({
    cmd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const startedAt = performance.now()
  await expect(collectSubprocess(child, "synthetic child", 10, Boolean(setsid), 20)).rejects.toThrow(
    "synthetic child timed out after 10ms",
  )
  expect(performance.now() - startedAt).toBeLessThan(1_000)
  expect(await child.exited).not.toBe(0)
})

test("surface check propagates rg operational failures", async () => {
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
