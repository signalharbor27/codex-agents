import { expect, test } from "bun:test"
import { blindPackets, comparisonOrder } from "./blind-comparisons.ts"

test("paired order counterbalances on repetitions without mutating input", () => {
  const sources = ["previous", "candidate"]
  expect(comparisonOrder(sources, "task", 1)).toEqual(comparisonOrder(sources, "task", 2).reverse())
  expect(sources).toEqual(["previous", "candidate"])
})
test("blind packets omit source identity and instruction reads but retain evidence and private provenance", () => {
  const rows = ["previous", "candidate"].map(source => ({ source, source_root: `/private/${source}`, source_hash: source + "hash", case: "task", repetition: 1,
    evidence: {trace: {messages: ["Found defect in /private/" + source + "/app.mjs"], commands: [{command: "cat .agents/skills/foo/SKILL.md", output: source + " secret instructions", exitCode: 0}, {command: "bun app.mjs", output: "FAIL boundary", exitCode: 1}]}}, artifacts: {".agents/skills/foo/SKILL.md": source + "instructions", "app.mjs": "code"}, verdict: {rubric: ["Check behavior"], failures: []} }))
  const result = blindPackets(rows, "fixed-seed"), text = JSON.stringify(result.packets)
  expect(text).not.toContain("previous")
  expect(text).not.toContain("candidate")
  expect(text).not.toContain("secret instructions")
  expect(text).toContain("FAIL boundary")
  expect(text).toContain("<PROJECT>/app.mjs")
  expect(result.provenance.map((p: any) => p.original)).toContainEqual(rows[0])
  expect(result.provenance.map((p: any) => p.original)).toContainEqual(rows[1])
})
test("incomplete or duplicate source pairs cannot masquerade as comparisons", () => {
  expect(() => blindPackets([{case:"x",source:"candidate"}])).toThrow("pair")
  expect(() => blindPackets([{case:"x",source:"candidate"},{case:"x",source:"candidate"}])).toThrow("pair")
})

test("failed cold replay retains partial command evidence and failure details in blinded packet", () => {
  const rows = ["previous", "candidate"].map(source => ({source,case:"cold",status:"runner-error",stage:"cold-agent",error:"cold timeout",cold_raw:{exitCode:143,error:"timeout",stderr:"process terminated",stdout:[{type:"item.completed",item:{type:"command_execution",command:"bun export-cli.mjs export own me",aggregated_output:"unavailable",exit_code:1}},{type:"item.completed",item:{type:"command_execution",command:"cat .agents/skills/project-verification/SKILL.md",aggregated_output:source + " secret",exit_code:0}}].map(e=>JSON.stringify(e)).join("\n")}}))
  const packet = JSON.stringify(blindPackets(rows,"seed").packets)
  expect(packet).toContain("unavailable")
  expect(packet).toContain("process terminated")
  expect(packet).toContain("143")
  expect(packet).not.toContain("candidate secret")
  expect(packet).not.toContain("previous secret")
})
