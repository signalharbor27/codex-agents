import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  MAX_STANDARDS_EXTRAS,
  buildStandardsPrompt,
  judgeStandards,
  normalizeFindingPath,
  parseArgs,
  parseStandardsResult,
  reviewerInstructions,
  runStandardsCase,
  selectCases,
  stageStandardsDocs,
  standardsDocReferences,
  standardsExecArgs,
  withFixture,
  withStandardsDocs,
  type StandardsFinding,
} from "./run-standards-evals.ts"
import { STANDARDS_CASES, STANDARDS_CATEGORIES } from "./standards-cases.ts"
import { withFakeClaude } from "./fake-claude.ts"

const SOURCE_ROOT = join(import.meta.dir, "../..")
const byId = (id: string) => STANDARDS_CASES.find(entry => entry.id === id)!
const finding = (file: string, category: StandardsFinding["category"], summary = "s"): StandardsFinding => ({ file, category, summary })
const control = STANDARDS_CASES.find(entry => entry.planted.length === 0)!

describe("standards fixtures", () => {
  test("each plant names files the change writes and evidence tokens that occur in them", () => {
    expect(control).toBeDefined()
    for (const entry of STANDARDS_CASES) {
      for (const plant of entry.planted) {
        for (const file of plant.files) expect(file in entry.after).toBe(true)
        const text = plant.files.map(file => entry.after[file]!).join("\n").toLowerCase()
        expect(plant.evidence.length).toBeGreaterThan(0)
        for (const token of plant.evidence) expect(text).toContain(token.toLowerCase())
      }
    }
  })

  test("every fixture's own tests pass", async () => {
    const tested = STANDARDS_CASES.filter(entry => Object.keys(entry.after).some(file => file.includes(".test.")))
    expect(tested.map(entry => entry.id)).toContain("cannot-fail-test")
    for (const entry of tested) {
      await withFixture(entry, async directory => {
        const run = Bun.spawnSync([process.execPath, "test"], { cwd: directory, env: { ...process.env, TMPDIR: tmpdir() }, stdout: "pipe", stderr: "pipe" })
        expect({ id: entry.id, code: run.exitCode, out: run.stderr.toString().match(/\d+ fail/)?.[0] }).toEqual({ id: entry.id, code: 0, out: "0 fail" })
      })
    }
  })

  test("the model sees no case id, planted category, or outcome hint in paths, file names, or the prompt", async () => {
    for (const entry of STANDARDS_CASES) {
      await withFixture(entry, async (directory, diff) => {
        expect(directory.split("/").at(-1)).toStartWith("standards-fixture-")
        const prompt = buildStandardsPrompt(diff, directory, "/docs/review-and-simplify-changes/references/coding-standards.md")
        // The prompt must list every category id for the schema; check everything outside that list.
        const outsideList = prompt.split("\n").filter(line => !STANDARDS_CATEGORIES.some(id => line.startsWith(`- ${id}: `))).join("\n")
        const visible = [directory, ...Object.keys(entry.after), outsideList].join("\n").toLowerCase()
        for (const leak of [entry.id, ...entry.planted.map(plant => plant.category), "clean", "control", "planted"]) expect(visible).not.toContain(leak)
      })
    }
  })

  test("builds a git fixture whose diff contains changed and new files, then removes it", async () => {
    let root = ""
    const diff = await withFixture(byId("structure-sensitive-test"), async (directory, diff) => {
      root = directory
      expect(await readFile(join(directory, "src/Banner.test.ts"), "utf8")).toContain("readFileSync")
      return diff
    })
    expect(diff).toContain("diff --git a/src/Banner.tsx b/src/Banner.tsx")
    expect(diff).toContain("+      <Logo />")
    expect(diff).toContain("new file mode")
    expect(diff).toContain("b/src/Banner.test.ts")
    expect(diff).not.toContain("package.json")
    expect(await Bun.file(join(root, "src/Banner.tsx")).exists()).toBe(false)
  })
})

describe("standards docs staging", () => {
  test("copies the standards, every doc they name, and the reviewer profile, and nothing from evals", async () => {
    const standards = await readFile(join(SOURCE_ROOT, "skills/review-and-simplify-changes/references/coding-standards.md"), "utf8")
    const named = standardsDocReferences(standards)
    expect(named).toContain("engineering/references/proof.md")
    let staged = ""
    await withStandardsDocs(SOURCE_ROOT, async docs => {
      staged = docs.root
      expect(docs.root.startsWith(join(SOURCE_ROOT, "skills"))).toBe(false)
      expect(await readFile(docs.standardsPath, "utf8")).toBe(standards)
      for (const file of named) expect(await readFile(join(docs.root, file), "utf8")).toBe(await readFile(join(SOURCE_ROOT, "skills", file), "utf8"))
      expect(reviewerInstructions(await readFile(docs.reviewerProfilePath, "utf8"))).toContain("read-only")
      const files = (await readdir(docs.root, { recursive: true })).map(String)
      expect(files.filter(file => /evals|standards-cases/.test(file))).toEqual([])
    })
    expect(await Bun.file(join(staged, "agents/reviewer.toml")).exists()).toBe(false)
  })

  test("fails when the standards name a doc the source lacks", async () => {
    const source = await mkdtemp(join(tmpdir(), "standards-source-"))
    const target = await mkdtemp(join(tmpdir(), "standards-target-"))
    try {
      await mkdir(join(source, "skills/review-and-simplify-changes/references"), { recursive: true })
      await writeFile(join(source, "skills/review-and-simplify-changes/references/coding-standards.md"), "See `engineering/references/gone.md`.\n")
      await expect(stageStandardsDocs(source, target)).rejects.toThrow("names engineering/references/gone.md, which is missing")
    } finally {
      await rm(source, { recursive: true, force: true })
      await rm(target, { recursive: true, force: true })
    }
  })
})

describe("standards judge", () => {
  const taut = (summary: string) => finding("src/nickname.test.ts", "tautological-test", summary)

  test("passes a located plant only when its summary names an evidence token", () => {
    expect(judgeStandards(byId("tautological-test"), [taut("re-asserts MAX_NICKNAME_LENGTH")]).pass).toBe(true)
    expect(judgeStandards(byId("tautological-test"), [taut("re-asserts max_nickname_length")]).pass).toBe(true)
    const vague = judgeStandards(byId("tautological-test"), [taut("this test looks tautological")])
    expect(vague.pass).toBe(false)
    expect(vague.missing).toEqual([{ category: "tautological-test", files: ["src/nickname.test.ts"], reason: "no-evidence" }])
  })

  test("misses a plant reported in the wrong file or under the wrong category", () => {
    const entry = byId("cannot-fail-test")
    expect(judgeStandards(entry, [finding("src/config.ts", "cannot-fail-test", "mocks readFileSync")]).missing).toEqual([{ category: "cannot-fail-test", files: ["src/config.test.ts"], reason: "not-found" }])
    expect(judgeStandards(entry, [finding("src/config.test.ts", "tautological-test", "mocks readFileSync")]).pass).toBe(false)
    expect(judgeStandards(entry, []).pass).toBe(false)
  })

  test("accepts listed alternative categories and caller files for the shallow module", () => {
    const entry = byId("shallow-module")
    expect(judgeStandards(entry, [finding("src/checkout.ts", "pass-through-layer", "calls applyTax after applyDiscount")]).pass).toBe(true)
    expect(judgeStandards(entry, [finding("src/invoice.ts", "slop-comment", "applyTax")]).pass).toBe(false)
  })

  test("fails a defect case with more extras than the cap, whatever their category", () => {
    const entry = byId("tautological-test")
    const extras = (category: StandardsFinding["category"], count: number) => Array.from({ length: count }, (_, index) => finding(`src/x${index}.ts`, category))
    const within = judgeStandards(entry, [taut("MAX_NICKNAME_LENGTH"), ...extras("other", MAX_STANDARDS_EXTRAS)])
    expect(within).toMatchObject({ pass: true })
    expect(within.extra).toHaveLength(MAX_STANDARDS_EXTRAS)
    for (const category of ["slop-comment", "correctness-bug"] as const) {
      const over = judgeStandards(entry, [taut("MAX_NICKNAME_LENGTH"), ...extras(category, MAX_STANDARDS_EXTRAS + 1)])
      expect(over).toMatchObject({ pass: false, missing: [] })
      expect(over.extra).toHaveLength(MAX_STANDARDS_EXTRAS + 1)
    }
  })

  test("fails the control on any finding, including other", () => {
    expect(judgeStandards(control, [])).toEqual({ pass: true, missing: [], false_positives: [], extra: [] })
    const verdict = judgeStandards(control, [finding("src/lru.ts", "other")])
    expect(verdict.pass).toBe(false)
    expect(verdict.false_positives).toEqual([finding("src/lru.ts", "other")])
  })

  test("normalizes absolute, diff-prefixed, dot-relative, and line-suffixed paths", () => {
    expect(normalizeFindingPath("/tmp/fx/src/a.ts", "/tmp/fx")).toBe("src/a.ts")
    expect(normalizeFindingPath("b/src/a.ts")).toBe("src/a.ts")
    expect(normalizeFindingPath("./src/a.ts:12:3")).toBe("src/a.ts")
    expect(judgeStandards(byId("slop-comment"), [finding("/tmp/fx/src/cart.ts:5", "slop-comment", "narrates #412")], "/tmp/fx").pass).toBe(true)
  })
})

describe("standards result parsing", () => {
  test("accepts the schema shape and rejects unknown categories, extra keys, and prose", () => {
    expect(parseStandardsResult('{"findings":[{"file":"a.ts","category":"slop-comment","summary":"x"}]}')).toEqual([finding("a.ts", "slop-comment", "x")])
    expect(() => parseStandardsResult('{"findings":[{"file":"a.ts","category":"style","summary":"x"}]}')).toThrow("known category")
    expect(() => parseStandardsResult('{"findings":[],"notes":"x"}')).toThrow("exactly findings")
    expect(() => parseStandardsResult("Looks good")).toThrow("did not return JSON")
  })
})

describe("standards CLI and command", () => {
  test("requires explicit live permission and a case selection", () => {
    expect(() => parseArgs(["live", "--case", "clean-control"])).toThrow("--allow-live")
    expect(() => parseArgs(["live", "--allow-live"])).toThrow("requires --case")
    expect(() => parseArgs(["dry-run", "--case", "nope"])).toThrow("unknown case")
    expect(() => parseArgs(["dry-run", "--effort", "ultra"])).toThrow("invalid reasoning effort")
    const options = parseArgs(["dry-run", "--case", "clean-control", "--case", "slop-comment"])
    expect(selectCases(options).map(entry => entry.id).sort()).toEqual(["clean-control", "slop-comment"])
    expect(selectCases(parseArgs(["dry-run"]))).toEqual(STANDARDS_CASES)
  })

  test("runs claude with read-only tools and only the fixture and staged docs readable", () => {
    const args = standardsExecArgs({ model: "claude-opus-5-5", effort: "high", instructions: "Stay read-only.", fixtureRoot: "/fx", docsRoot: "/docs" })
    expect(args[args.indexOf("--tools") + 1]).toBe("Read,Grep,Glob")
    expect(args.filter((_, index) => args[index - 1] === "--add-dir")).toEqual(["/fx", "/docs"])
    expect(args[args.indexOf("--append-system-prompt") + 1]).toBe("Stay read-only.")
  })

  test("reads reviewer instructions from a profile and rejects one without them", () => {
    expect(reviewerInstructions('developer_instructions = """\nStay read-only.\n"""\n')).toBe("Stay read-only.")
    expect(() => reviewerInstructions('name = "reviewer"\n')).toThrow("developer_instructions")
  })

  test("a fake claude on PATH gets the diff on stdin, the fixture as cwd, only fixture and docs dirs, and a scrubbed env", async () => {
    const entry = byId("cannot-fail-test")
    await withFakeClaude({ findings: [finding("src/config.test.ts", "cannot-fail-test", "mocks readFileSync, the unit's own dependency")] }, async log => {
      const record = await runStandardsCase(entry, { mode: "live", model: "claude-opus-5-5", effort: "high", sourceRoot: SOURCE_ROOT }, {})
      expect("verdict" in record && record.verdict?.pass).toBe(true)
      const seen = await log()
      expect(seen.cwd.split("/").at(-1)).toStartWith("standards-fixture-")
      expect(seen.cwdEntries.sort()).toEqual([".git", "package.json", "src"])
      expect(seen.stdin).toContain("+test(\"rejects malformed config\"")
      expect(seen.stdin).toContain(`repository at ${seen.cwd}`)
      expect(seen.addDirs).toHaveLength(2)
      expect(seen.addDirs[0]).toBe(seen.cwd)
      expect(seen.stdin).toContain(join(seen.addDirs[1]!, "review-and-simplify-changes/references/coding-standards.md"))
      const standards = await readFile(join(SOURCE_ROOT, "skills/review-and-simplify-changes/references/coding-standards.md"), "utf8")
      const expected = ["agents/reviewer.toml", "review-and-simplify-changes/references/coding-standards.md", ...standardsDocReferences(standards)]
      expect(seen.files.filter(file => file.startsWith(seen.addDirs[1]!)).map(file => file.slice(seen.addDirs[1]!.length + 1)).sort()).toEqual(expected.sort())
      expect(seen.stdin).not.toContain(SOURCE_ROOT)
      expect(seen.env.CLAUDECODE).toBeUndefined()
      expect(seen.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY).toBe("1")
      expect(seen.env.FAKE_PASSTHROUGH).toBe("kept")
    })
  })
})
