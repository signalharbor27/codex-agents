import { afterAll, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const script = join(import.meta.dir, "extract.py")
const root = mkdtempSync(join(tmpdir(), "retro-extract-"))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const jsonl = (path: string, records: unknown[]) => {
  mkdirSync(join(path, ".."), { recursive: true })
  writeFileSync(path, records.map(record => JSON.stringify(record)).join("\n") + "\n")
}
const ts = (minute: number) => `2026-09-27T10:${String(minute).padStart(2, "0")}:00.000Z`
const toolResult = (id: string, content: string, isError: boolean, minute: number) => ({
  type: "user",
  timestamp: ts(minute),
  message: { content: [{ type: "tool_result", tool_use_id: id, content, is_error: isError }] },
})

const claudeRoot = join(root, "claude")
jsonl(join(claudeRoot, "-proj", "a.jsonl"), [
  { type: "ai-title", aiTitle: "Fix the widget" },
  { type: "user", timestamp: "2026-09-20T09:00:00.000Z", cwd: "/w", message: { content: "before the window" } },
  { type: "user", timestamp: ts(1), cwd: "/w", message: { content: "please fix the widget" } },
  { type: "assistant", timestamp: ts(2), message: { content: [
    { type: "tool_use", id: "t1", name: "mcp__way_gossip__ozone_Bash", input: {} },
    { type: "tool_use", id: "t2", name: "Bash", input: {} },
    { type: "tool_use", id: "t3", name: "Bash", input: {} },
    { type: "tool_use", id: "t4", name: "Skill", input: { skill: "engineering" } },
    { type: "tool_use", id: "t5", name: "Agent", input: { subagent_type: "reviewer" } },
  ] } },
  toolResult("t1", "Exit code 1\nssh: Permission denied (publickey). hook blocked guard", true, 3),
  toolResult("t2", "PreToolUse:Bash hook error: prod SETs leak to production traffic", true, 4),
  toolResult("t3", "Error: this is ordinary successful output", false, 5),
  { type: "attachment", timestamp: ts(6), attachment: { type: "hook_blocking_error", hookEvent: "Stop", blockingError: { blockingError: "Reply ended with an offer" } } },
  { type: "attachment", timestamp: ts(7), attachment: { type: "hook_additional_context", content: ["over budget"] } },
  { type: "system", subtype: "compact_boundary", timestamp: ts(9) },
  { type: "user", timestamp: ts(9), isCompactSummary: true, isVisibleInTranscriptOnly: true, message: { content: "This session is being continued from a previous conversation" } },
  { type: "user", timestamp: ts(10), isVisibleInTranscriptOnly: true, message: { content: "transcript-only note" } },
])
jsonl(join(claudeRoot, "-proj", "a", "subagents", "agent-1.jsonl"), [
  { type: "user", timestamp: ts(8), message: { content: "subagent prompt" } },
])

const codexRoot = join(root, "codex")
const meta = (originator: string, source: unknown) => ({ type: "session_meta", timestamp: ts(0), payload: { originator, source, cwd: "/c" } })
const call = (id: string, input: string, minute: number) => ({ type: "response_item", timestamp: ts(minute), payload: { type: "custom_tool_call", name: "exec", call_id: id, input } })
const scriptOut = (id: string, parts: string[], minute: number) => ({
  type: "response_item",
  timestamp: ts(minute),
  payload: { type: "custom_tool_call_output", call_id: id, output: parts.map(text => ({ type: "input_text", text })) },
})
jsonl(join(codexRoot, "2026", "09", "27", "rollout-human.jsonl"), [
  meta("codex-tui", "cli"),
  { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "ship the thing" } },
  { type: "event_msg", timestamp: ts(1), payload: { type: "item_completed", item: { type: "UserMessage", content: [{ type: "input_text", text: "ship the thing" }] } } },
  call("c1", "await tools.exec_command({cmd:'cat log'})", 2),
  scriptOut("c1", ["Script completed\nWall time 0.1 seconds\nOutput:\n", "Error: in a log line\nProcess exited with code 1\nExited with code 3\n"], 3),
  call("c2", "await tools.exec_command({cmd:'false'})", 4),
  scriptOut("c2", ["Script completed\nWall time 0.1 seconds\nOutput:\n", JSON.stringify({ chunk_id: "x", wall_time_seconds: 0.1, exit_code: 2, output: "boom" })], 5),
  call("c3", "await tools.exec_command({cmd:'rm -f x'})", 6),
  scriptOut("c3", ["Script failed\nWall time 0.0 seconds\nOutput:\n\nScript error:\nexec_command failed: CreateProcess { message: \"Rejected(\\\"`rm -f x` rejected: rm -f style commands are not permitted\\\")\" }"], 7),
  call("c4", "await tools.wait()", 8),
  scriptOut("c4", ["Script failed\nWall time 0.0 seconds\nOutput:\n\nScript error:\nTypeError: tools.wait is not a function"], 9),
  { type: "response_item", timestamp: ts(10), payload: { type: "function_call", name: "exec_command", call_id: "f1", arguments: "{\"cmd\":\"cat skills/engineering/SKILL.md\"}" } },
  { type: "response_item", timestamp: ts(11), payload: { type: "function_call_output", call_id: "f1", output: "Chunk ID: a\nWall time: 0.1 seconds\nProcess exited with code 0\nOutput:\nError and exit code: 1 in the file body\n" } },
  { type: "response_item", timestamp: ts(12), payload: { type: "function_call", name: "exec_command", call_id: "f2", arguments: "{\"cmd\":\"nope\"}" } },
  { type: "response_item", timestamp: ts(13), payload: { type: "function_call_output", call_id: "f2", output: "Chunk ID: b\nWall time: 0.1 seconds\nProcess exited with code 127\nOutput:\nnope: not found\n" } },
  { type: "event_msg", timestamp: ts(14), payload: { type: "turn_aborted" } },
  call("c5", "await Promise.allSettled([tools.exec_command({cmd:'a'})])", 15),
  scriptOut("c5", ["Script completed\nOutput:\n", JSON.stringify({ i: 0, result: { status: "fulfilled", value: { chunk_id: "y", wall_time_seconds: 0.1, exit_code: 4, output: "wrapped" } } })], 16),
  call("c6", "await tools.exec_command({cmd:'curl api'})", 17),
  scriptOut("c6", ["Script completed\nOutput:\n", JSON.stringify({ exit_code: 5, error: "payload says error", metadata: { exit_code: 6 } })], 18),
  { type: "response_item", timestamp: ts(19), payload: { type: "function_call_output", call_id: "f2", output: JSON.stringify({ status: "rejected", error: "api body", exit_code: 7 }) } },
])
jsonl(join(codexRoot, "2026", "09", "27", "rollout-exec.jsonl"), [meta("codex_exec", "exec"), { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "automated" } }])
jsonl(join(codexRoot, "2026", "09", "27", "rollout-sub.jsonl"), [meta("codex-tui", { subagent: "review" }), { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "subagent" } }])

const run = (...extra: string[]) => {
  const out = join(root, `out-${extra.join("-") || "default"}`)
  const since = extra.includes("--since") ? [] : ["--since", "2026-09-26"]
  const proc = Bun.spawnSync(["python3", "-B", script, ...since, "--out", out, "--claude-root", claudeRoot, "--codex-root", codexRoot, ...extra])
  expect(proc.stderr.toString()).toBe("")
  expect(proc.exitCode).toBe(0)
  const [header, ...rows] = readFileSync(join(out, "index.tsv"), "utf8").trimEnd().split("\n").map(line => line.split("\t"))
  const bySrc = Object.fromEntries(rows.map(row => [row[1], Object.fromEntries(header!.map((key, i) => [key, row[i]]))]))
  return { out, stdout: proc.stdout.toString(), rows, bySrc }
}

// Runs extract.py over a fresh pair of roots holding one Claude and one Codex session.
const extractOnly = (claude: unknown[], codex: unknown[], ...extra: string[]) => {
  const dir = mkdtempSync(join(root, "case-"))
  jsonl(join(dir, "claude", "-p", "s.jsonl"), claude)
  jsonl(join(dir, "codex", "2026", "09", "27", "rollout-x.jsonl"), codex)
  const out = join(dir, "out")
  const proc = Bun.spawnSync(["python3", "-B", script, "--since", "2026-09-26", "--out", out, "--claude-root", join(dir, "claude"), "--codex-root", join(dir, "codex"), ...extra])
  expect(proc.stderr.toString()).toBe("")
  const [header, ...rows] = readFileSync(join(out, "index.tsv"), "utf8").trimEnd().split("\n").map(line => line.split("\t"))
  return Object.fromEntries(rows.map(row => [row[1], { ...Object.fromEntries(header!.map((key, i) => [key, row[i]])), digest: readFileSync(join(out, `${row[0]}.md`), "utf8") }]))
}

describe("retro extract.py", () => {
  test("Claude digests count explicit errors and hook blocks only", () => {
    const { out, bySrc } = run()
    const claude = bySrc.claude!
    expect(claude).toMatchObject({ user_msgs: "1", tool_calls: "5", tool_errors: "1", hook_hits: "2", compactions: "1", title: "Fix the widget" })
    const digest = readFileSync(join(out, `${claude.id}.md`), "utf8")
    expect(digest).toContain("skills: {'engineering': 1}")
    expect(digest).toContain("agents: {'reviewer': 1}")
    expect(digest).toContain("hook_nudges: 1")
    expect(digest).toMatch(/L\d+ Bash: PreToolUse:Bash hook error/)
    expect(digest).toMatch(/L\d+ Stop hook: Reply ended with an offer/)
    expect(digest).toMatch(/L\d+ Bash: Exit code 1/)
    expect(digest).not.toContain("before the window")
    expect(digest).not.toContain("subagent prompt")
    expect(digest).not.toContain("continued from a previous conversation")
    expect(digest).not.toContain("transcript-only note")
  })

  test("Codex digests key errors on exit codes and explicit failures", () => {
    const { out, bySrc, stdout } = run()
    const codex = bySrc["codex:codex-tui"]!
    expect(codex).toMatchObject({ user_msgs: "1", tool_errors: "4", hook_hits: "1", interrupts: "1" })
    const digest = readFileSync(join(out, `${codex.id}.md`), "utf8")
    expect(digest).toContain("exec_command exit 2")
    expect(digest).toContain("exec_command exit 4")
    expect(digest).not.toMatch(/exit [567]\b|payload says error|api body/)
    expect(digest).toContain("exec_command exit 127")
    expect(digest).toContain("TypeError: tools.wait is not a function")
    expect(digest).toContain("rejected: rm -f style commands are not permitted")
    expect(digest).toContain("skills: {'engineering': 1}")
    expect(digest).not.toContain("in a log line")
    expect(stdout).toContain("sessions=2 automated_skipped=2")
  })

  test("automated rollouts are opt-in and the window end is exclusive", () => {
    expect(run("--include-automated").rows).toHaveLength(4)
    const { stdout } = run("--until", "2026-09-27")
    expect(stdout).toContain("sessions=0")
  })

  test("unpadded window dates are normalised before comparing with timestamps", () => {
    expect(run("--since", "2026-9-26").stdout).toContain("sessions=2")
    expect(run("--since", "2026-9-26", "--until", "2026-9-27").stdout).toContain("sessions=0")
  })

  test("a rerun replaces earlier digests and leaves other files", () => {
    const out = join(root, "out-default")
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, "s099.md"), "stale digest")
    writeFileSync(join(out, "RETRO.md"), "analysis")
    const { rows } = run()
    expect(existsSync(join(out, "s099.md"))).toBe(false)
    expect(readFileSync(join(out, "RETRO.md"), "utf8")).toBe("analysis")
    expect(rows.map(row => existsSync(join(out, `${row[0]}.md`)))).toEqual([true, true])
  })

  test("only the paired Codex representations of one prompt collapse; repeated corrections stay", () => {
    const user = (minute: number, text: string, turn?: string) => ({ type: "event_msg", timestamp: ts(minute), payload: { type: "user_message", message: text, ...(turn && { turn_id: turn }) } })
    const item = (minute: number, text: string, turn?: string) => ({ type: "event_msg", timestamp: ts(minute), payload: { type: "item_completed", ...(turn && { turn_id: turn }), item: { type: "UserMessage", content: [{ type: "input_text", text }] } } })
    const claudeSay = (minute: number, text: string) => ({ type: "user", timestamp: ts(minute), cwd: "/w", message: { content: text } })
    const sessions = extractOnly(
      [claudeSay(1, "no, revert that"), claudeSay(2, "no, revert that"), claudeSay(3, "no, revert that")],
      [meta("codex-tui", "cli"), user(1, "no, revert that"), item(1, "no, revert that"), user(2, "no, revert that"), user(3, "no, revert that", "t3"), item(4, "no, revert that", "t3"), item(5, "no, revert that", "t5")],
    )
    expect(sessions.claude!.user_msgs).toBe("3")
    expect(sessions["codex:codex-tui"]!.user_msgs).toBe("4")
  })

  test("the session cwd comes only from events inside the window", () => {
    const sessions = extractOnly(
      [
        { type: "user", timestamp: "2026-09-25T10:00:00.000Z", cwd: "/before", message: { content: "earlier" } },
        { type: "user", timestamp: ts(1), cwd: "/inside", message: { content: "work here" } },
        { type: "user", timestamp: "2026-09-28T10:00:00.000Z", cwd: "/after", message: { content: "later" } },
      ],
      [
        meta("codex-tui", "cli"),
        { type: "turn_context", timestamp: "2026-09-25T10:00:00.000Z", payload: { cwd: "/codex-before" } },
        { type: "turn_context", timestamp: ts(1), payload: { cwd: "/codex-inside" } },
        { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "go" } },
        { type: "turn_context", timestamp: "2026-09-28T10:00:00.000Z", payload: { cwd: "/codex-after" } },
      ],
      "--until", "2026-09-28",
    )
    expect(sessions.claude!.cwd).toBe("/inside")
    expect(sessions["codex:codex-tui"]!.cwd).toBe("/codex-inside")
    const fallback = extractOnly([{ type: "user", timestamp: ts(1), message: { content: "no cwd" } }], [meta("codex-tui", "cli"), { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "go" } }])
    expect(fallback["codex:codex-tui"]!.cwd).toBe("/c")
  })
})
