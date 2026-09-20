import { expect, test } from "bun:test"
import { symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { CASES } from "./judgment-cases.ts"
import { judge, options, oracleArgs, assessPrepared, captureProcess, type JudgmentEvidence } from "./run-judgment-evals.ts"
import { inSandbox } from "./run-execution-evals.ts"
import { collectSubprocess } from "./run-routing-evals.ts"

function evidence(id: string): JudgmentEvidence {
  const c = CASES.find(c => c.id === id)!
  return { unchanged: true, trace: { messages: ["A plausible but not yet graded answer."], commands: c.inspect.map(file => ({ command: `cat ${file}`, output: c.files[file]!, exitCode: 0 })) } }
}
test("evidence gates never award semantic success", () => {
  const c = CASES.find(c => c.id === "research-limits")!
  expect(judge(c, evidence(c.id)).status).toBe("needs-transcript-assessment")
})
test("claims without inspection and unsuccessful reads fail", () => {
  const c = CASES[0]!, e = evidence(c.id)
  e.trace.commands = []
  expect(judge(c, e).failures).toContain("missing observable inspection: README.md")
  e.trace.commands = [{ command: "cat README.md", output: "permission denied", exitCode: 1 }]
  expect(judge(c, e).status).toBe("evidence-failed")
})
test("protected mutation fails even with a convincing response", () => {
  const c = CASES[0]!, e = evidence(c.id)
  e.unchanged = false
  expect(judge(c, e).status).toBe("evidence-failed")
})
test("implementation cannot pass with narrative review or missing oracle", () => {
  const c = CASES.find(c => c.implementation)!, e = evidence(c.id)
  e.trace.messages = ["I fixed it; independent review passed."]
  expect(judge(c, e).failures).toContain("independent review lifecycle failed or missing")
  expect(judge(c, e).failures).toContain("independent restart oracle failed or missing")
  e.oracle = { exitCode: 1, stdout: "PASS restart oracle", stderr: "failure" }
  expect(judge(c, e).failures).toContain("independent restart oracle failed or missing")
})
test("selection, repeats and live authorization are explicit", () => {
  expect(options(["dry-run", "--case", "trivial-control", "--repeat", "2"]).repeat).toBe(2)
  expect(() => options(["live", "--all"])).toThrow("--allow-live")
  expect(() => options(["dry-run", "--all", "--case", "trivial-control"])).toThrow()
  expect(() => options(["dry-run", "--all", "--repeat", "0"])).toThrow()
})
test("existing warmed check masks bug, cold oracle catches it and accepts repair", async () => {
  await inSandbox(async directory => {
    const c = CASES.find(c => c.implementation)!
    for (const [name, contents] of Object.entries(c.files)) await writeFile(join(directory, name), contents)
    const execute = (cmd: string[]) => collectSubprocess(Bun.spawn({ cmd, cwd: directory, stdout: "pipe", stderr: "pipe" }), "oracle self-test", 10_000)
    expect((await execute(["bun", "test-worker.mjs"])).exitCode).toBe(0)
    expect((await execute(oracleArgs())).exitCode).not.toBe(0)
    await writeFile(join(directory, "worker.mjs"), "export function retries(settings) { const n = Number(settings.retries); return Number.isInteger(n) ? n : 0; }\n")
    expect((await execute(oracleArgs())).exitCode).toBe(0)
  })
})

test("restart oracle cannot repair persisted settings during module import", async () => {
  await inSandbox(async directory => {
    const c = CASES.find(c => c.implementation)!
    for (const [name, contents] of Object.entries(c.files)) await writeFile(join(directory, name), contents)
    await writeFile(join(directory, "worker.mjs"), `import { writeFileSync } from 'node:fs';
writeFileSync('settings.json', '{"retries":3}');
export function retries(settings) { return Number.isInteger(settings.retries) ? settings.retries : 0; }`)
    const result = await collectSubprocess(Bun.spawn({ cmd: oracleArgs(), cwd: directory, stdout: "pipe", stderr: "pipe" }), "protected oracle", 10_000)
    expect(result.exitCode).not.toBe(0)
    expect(await Bun.file(join(directory, "settings.json")).text()).toBe(c.files["settings.json"]!)
  })
})

const completedTrace = [
  { type: "item.completed", item: { type: "agent_message", text: "Partial repair retained." } },
  { type: "turn.completed", usage: { input_tokens: 4, output_tokens: 3 } },
].map(event => JSON.stringify(event)).join("\n")

test("failure rows preserve raw output, artifacts, hashes and exact execution stage", async () => {
  for (const failure of ["model", "parse-trace", "oracle-environment", "oracle", "rollout"]) {
    await inSandbox(async directory => {
      const c = CASES.find(c => c.implementation)!
      for (const [name, contents] of Object.entries(c.files)) await writeFile(join(directory, name), contents)
      const repaired = "export function retries(settings) { return Number(settings.retries); }\n"
      const result = await assessPrepared(c, directory, "ordinary task", ["unused"], {
        execute: async (_args, _dir, label) => {
          if (label === "oracle environment") return { stdout: "", stderr: "bwrap diagnostic", exitCode: failure === "oracle-environment" ? 1 : 0 }
          if (label === "restart oracle") return { stdout: "oracle output", stderr: "oracle diagnostic", exitCode: null, error: "synthetic oracle timeout" }
          await writeFile(join(directory, "worker.mjs"), repaired)
          return { stdout: failure === "parse-trace" ? "incomplete JSON" : completedTrace, stderr: "model diagnostic", exitCode: failure === "model" ? 1 : 0 }
        },
        rollout: async () => { throw Error("missing rollout") },
      // For the rollout failure, let the oracle succeed first.
        ...(failure === "rollout" ? { execute: async (_args: string[], _dir: string, label: string) => {
          await writeFile(join(directory, "worker.mjs"), repaired)
          return { stdout: label === "restart oracle" ? "PASS restart oracle" : completedTrace, stderr: "model diagnostic", exitCode: 0 }
        } } : {}),
      })
      expect(result).toMatchObject({ status: "runner-error", stage: failure })
      expect(result.raw?.stdout).toBe(failure === "parse-trace" ? "incomplete JSON" : completedTrace)
      expect(result.raw?.stderr).toBe("model diagnostic")
      expect(result.artifacts?.["worker.mjs"]).toBe(repaired)
      expect(result.artifact_hashes?.["worker.mjs"]).not.toBe(result.initial_hashes?.["worker.mjs"])
      expect(result.prompt_hash).toHaveLength(64)
      expect(result.fixture_hash).toHaveLength(64)
      if (failure === "oracle" || failure === "rollout") expect(result.post_oracle_hashes?.["settings.json"]).toBe(result.initial_hashes?.["settings.json"])
    })
  }
})

test("oracle-time mutation fails integrity even when the oracle reports success", async () => {
  await inSandbox(async directory => {
    const c = CASES.find(c => c.implementation)!
    for (const [name, contents] of Object.entries(c.files)) await writeFile(join(directory, name), contents)
    const result = await assessPrepared(c, directory, "task", ["unused"], {
      execute: async (_args, _dir, label) => {
        if (label === "restart oracle") await writeFile(join(directory, "settings.json"), '{"retries":3}')
        return { stdout: label === "restart oracle" ? "PASS restart oracle" : completedTrace, stderr: "", exitCode: 0 }
      },
      rollout: async () => ({ reviewLifecycle: { failures: [], reviews: [] }, rollout: { path: "fixture", hash: "fixture", threadId: "fixture" } }) as Awaited<ReturnType<typeof import("./run-execution-evals.ts").readReviewRollout>>,
    })
    expect(result.evidence?.unchanged).toBe(false)
    expect(result.verdict?.failures).toContain("protected fixture changed or unexpected artifact created")
  })
})

test("timed out processes retain partial streams and terminate their process group", async () => {
  await inSandbox(async directory => {
    const setsid = Bun.which("setsid")
    const command = ["sh", "-c", "echo partial; echo diagnostic >&2; sleep 5"]
    const result = await captureProcess(setsid ? [setsid, ...command] : command, directory, "partial output", 50)
    expect(result.error).toContain("timed out")
    expect(result.stdout).toContain("partial")
    expect(result.stderr).toContain("diagnostic")
    expect(result.exitCode).not.toBeNull()
  })
})

test("one unreadable artifact preserves other files and initial hashes", async () => {
  await inSandbox(async directory => {
    const c = CASES.find(c => c.implementation)!
    for (const [name, contents] of Object.entries(c.files)) await writeFile(join(directory, name), contents)
    const result = await assessPrepared(c, directory, "task", ["unused"], {
      execute: async () => {
        await writeFile(join(directory, "worker.mjs"), "export const repaired = true;\n")
        await symlink("missing-target", join(directory, "test-broken.mjs"))
        return { stdout: "partial trace", stderr: "failed", exitCode: 1 }
      },
      rollout: async () => { throw Error("unreachable") },
    })
    expect(result.status).toBe("runner-error")
    expect(result.artifacts?.["worker.mjs"]).toBe("export const repaired = true;\n")
    expect(result.initial_hashes?.["worker.mjs"]).toHaveLength(64)
    expect(result.artifact_errors?.["test-broken.mjs"]).toContain("ENOENT")
  })
})
