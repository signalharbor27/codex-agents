import { afterAll, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
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
  test("derived reports redact observed credential shapes and use private files", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.synthetic_signature"
    const key = "synthetic_api_key_0123456789"
    const cookie = "synthetic_session_cookie_0123456789"
    const proxy = "https://synthetic-user:synthetic-password@proxy.example:443"
    const say = (minute: number, text: string) => ({ type: "user", timestamp: ts(minute), message: { content: text } })
    const sessions = extractOnly([
      { type: "ai-title", aiTitle: `Updated token: ${jwt}` },
      say(1, `Updated J7 token: ${jwt}`),
      say(2, `1. use this api key ${key}`),
      say(3, `__Secure-session_token\t${cookie}\t.example.com\t/\t2027-01-01\ttrue`),
      say(4, `Cookie: session=${cookie}; other=private\nAuthorization: Bearer ${key}`),
      say(5, `Use ${proxy} for the probe.`),
      say(6, "Compare delivery in milliseconds; API key usage is unchanged."),
      // Redacting this key leaves the line at exactly 300 characters; clipping first would cut the key to 10 characters, too short to redact.
      toolResult("failure", `Exit code 1\n${"x".repeat(260)} use this api key ${key}`, true, 7),
      toolResult("failure", `Exit code 1\nAuthorization: Bearer ${key}`, true, 8),
    ], [])
    const result = sessions.claude!
    const digest = result.digest
    for (const secret of [jwt, key, cookie, "synthetic-password", "other=private", "eyJhbGciOiJIUzI1NiJ9", "synthetic_"]) expect(JSON.stringify(result)).not.toContain(secret)
    expect(result.title).toBe("Updated token: [REDACTED]")
    expect(digest).toContain("Updated J7 token: [REDACTED]")
    expect(digest).toContain("1. use this api key [REDACTED]")
    expect(digest).toContain("__Secure-session_token\t[REDACTED]\t.example.com\t/")
    expect(digest).toContain("https://[REDACTED]@proxy.example:443")
    expect(digest).toContain("Compare delivery in milliseconds; API key usage is unchanged.")
    expect(digest).toContain(`## Tool errors (first 2 of 2)
- 2026-09-27T10:07:00.000Z L8 ?: Exit code 1 ${"x".repeat(260)} use this api key [REDACTED]
- 2026-09-27T10:08:00.000Z L9 ?: Exit code 1 Authorization: [REDACTED]
`)
    const { out } = run()
    expect(statSync(out).mode & 0o777).toBe(0o700)
    for (const file of ["index.tsv", "skipped.tsv", "s000.md"]) expect(statSync(join(out, file)).mode & 0o777).toBe(0o600)
  })

  test("Codex JSON credentials and serialized cookie errors are redacted without losing diagnostics", () => {
    const secret = "synthetic_credential_0123456789"
    const sessions = extractOnly([], [
      meta("codex-tui", "cli"),
      { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: JSON.stringify({ api_key: secret, Authorization: `Bearer ${secret}`, status: "failed" }) } },
      { type: "event_msg", timestamp: ts(2), payload: { type: "user_message", message: `OPENAI_API_KEY=${secret}\nDB_PASSWORD="correct horse battery"\nFix API key authentication before retrying.\ntoken: expired; password: missing` } },
      call("cookie", "await tools.exec_command({cmd:'probe'})", 3),
      scriptOut("cookie", ["Script completed\nOutput:\n", JSON.stringify({ chunk_id: "cookie", wall_time_seconds: 0.1, exit_code: 1, output: `__Secure-session_token\t${secret}\t.example.com\t/\t2027-01-01\ttrue` })], 4),
    ])
    const result = sessions["codex:codex-tui"]!
    expect(result).toMatchObject({ user_msgs: "2", tool_errors: "1" })
    expect(result.digest).not.toContain("synthetic_credential")
    expect(result.digest).not.toContain("correct horse battery")
    expect(result.digest).toContain('"api_key": "[REDACTED]", "Authorization": "[REDACTED]", "status": "failed"')
    expect(result.digest).toContain("OPENAI_API_KEY=[REDACTED]")
    expect(result.digest).toContain("DB_PASSWORD=[REDACTED]")
    expect(result.digest).toContain("Fix API key authentication before retrying.\ntoken: expired; password: missing")
    expect(result.digest).toContain('L5 exec_command exit 1: {"chunk_id": "cookie", "wall_time_seconds": 0.1, "exit_code": 1, "output": "__Secure-session_token\\t[REDACTED]\\t.example.com\\t/')
  })

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

  test("distinct original Codex prompts retain their pointers after redaction", () => {
    const first = "api_key=synthetic_key_111111111111"
    const second = "api_key=synthetic_key_222222222222"
    const user = (text: string) => ({ type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: text, turn_id: "same-turn" } })
    const item = (text: string) => ({ type: "event_msg", timestamp: ts(1), payload: { type: "item_completed", turn_id: "same-turn", item: { type: "UserMessage", content: [{ type: "input_text", text }] } } })
    const sessions = extractOnly([], [meta("codex-tui", "cli"), user(first), item(second), user(second)])
    const result = sessions["codex:codex-tui"]!
    expect(result.user_msgs).toBe("2")
    expect(result.digest).toContain("L2\napi_key=[REDACTED]")
    expect(result.digest).toContain("L3\napi_key=[REDACTED]")
    expect(result.digest).not.toContain("L4\n")
    expect(result.digest).not.toContain(first)
    expect(result.digest).not.toContain(second)
  })

  test("delegated children are skipped and listed by default, and kept with --include-automated", () => {
    const dir = mkdtempSync(join(root, "child-"))
    const say = (minute: number, text: string) => ({ type: "user", timestamp: ts(minute), cwd: "/w", message: { content: text } })
    jsonl(join(dir, "claude", "-p", "child.jsonl"), [
      { type: "user", timestamp: "2026-09-25T10:00:00.000Z", message: { content: "Act as the review sub-agent for this task.\n\nYou are the `reviewer` subagent.\nReview the diff." } },
      say(1, "round 2: recheck the fix"),
    ])
    jsonl(join(dir, "claude", "-p", "human.jsonl"), [say(1, "please fix it"), say(2, "You are the `reviewer` subagent. quoted later")])
    jsonl(join(dir, "codex", "2026", "09", "27", "rollout-child.jsonl"), [
      meta("codex-tui", "vscode"),
      { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "# AGENTS.md instructions for /w" } },
      { type: "event_msg", timestamp: ts(1), payload: { type: "item_completed", item: { type: "UserMessage", content: [{ type: "text", text: "Act as the implementation sub-agent for this task.\n\nShip it." }] } } },
    ])
    const extract = (...extra: string[]) => {
      const out = join(dir, `out${extra.join("")}`)
      const proc = Bun.spawnSync(["python3", "-B", script, "--since", "2026-09-26", "--out", out, "--claude-root", join(dir, "claude"), "--codex-root", join(dir, "codex"), ...extra])
      expect(proc.stderr.toString()).toBe("")
      const table = (name: string) => readFileSync(join(out, name), "utf8").trimEnd().split("\n").slice(1).map(line => line.split("\t"))
      return { stdout: proc.stdout.toString(), index: table("index.tsv"), skipped: table("skipped.tsv") }
    }
    const byDefault = extract()
    expect(byDefault.stdout).toContain("sessions=1 automated_skipped=0 delegated_skipped=2")
    expect(byDefault.index.map(row => [row[1], row[2]])).toEqual([["claude", ""]])
    expect(byDefault.skipped.map(row => row[0]).sort()).toEqual(["delegated:implementation", "delegated:reviewer"])
    const included = extract("--include-automated")
    expect(included.stdout).toContain("sessions=3 automated_skipped=0 delegated_skipped=0")
    expect(included.index.map(row => row[2]).sort()).toEqual(["", "implementation", "reviewer"])
    expect(included.skipped).toEqual([])
  })

  test("a Codex child whose brief predates the window is still a delegated child", () => {
    const sessions = extractOnly(
      [{ type: "user", timestamp: ts(1), cwd: "/w", message: { content: "human work" } }],
      [
        meta("codex-tui", "vscode"),
        { type: "event_msg", timestamp: "2026-09-25T10:00:00.000Z", payload: { type: "user_message", message: "You are the `verifier` subagent.\nRun the checks." } },
        { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "round 2: rerun" } },
      ],
      "--include-automated",
    )
    expect(sessions["codex:codex-tui"]!.role).toBe("verifier")
  })

  test("either brief line alone marks a delegated child", () => {
    const sessions = extractOnly(
      [{ type: "user", timestamp: ts(1), cwd: "/w", message: { content: "Act as the review sub-agent for this task." } }],
      [meta("codex-tui", "vscode"), { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "You are the `reviewer` subagent." } }],
      "--include-automated",
    )
    expect(sessions.claude!.role).toBe("review")
    expect(sessions["codex:codex-tui"]!.role).toBe("reviewer")
  })

  test("bare role briefs mark children and skip them unless explicitly included", () => {
    const say = { type: "user", timestamp: ts(1), message: { content: "You are the implementer subagent.\nShip it." } }
    const user = { type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message: "You are the implementer subagent.\nShip it." } }
    expect(Object.keys(extractOnly([say], [meta("codex-tui", "cli"), user]))).toEqual([])
    const included = extractOnly([say], [meta("codex-tui", "cli"), user], "--include-automated")
    expect(included.claude!.role).toBe("implementer")
    expect(included["codex:codex-tui"]!.role).toBe("implementer")
  })

  test("T3 terminal notices are excluded while genuine steering remains", () => {
    const id = "node:delegated-task:command%3Amcp%3Asynthetic%3Adelegate-task%3Areview"
    const notice = `Delegated task ${id} reached a terminal state. Use task_status with taskId ${id} to read the result.`
    const batch = `${notice}\n${notice.replaceAll("%3Areview", "%3Adesign")}`
    const steering = `${notice} Please fix the findings.`
    const batchSteering = `${batch} Please fix these too.`
    const say = (message: string) => ({ type: "user", timestamp: ts(1), message: { content: message } })
    const user = (message: string) => ({ type: "event_msg", timestamp: ts(1), payload: { type: "user_message", message } })
    const sessions = extractOnly([say(notice), say(batch), say(steering), say(batchSteering)], [meta("codex-tui", "cli"), user(notice), user(batch), user(steering), user(batchSteering)])
    expect(sessions.claude!.user_msgs).toBe("2")
    expect(sessions["codex:codex-tui"]!.user_msgs).toBe("2")
    expect(sessions.claude!.digest).toContain("L3\n" + steering)
    expect(sessions["codex:codex-tui"]!.digest).toContain("L4\n" + steering)
    expect(sessions.claude!.digest).toContain("L4\n" + batchSteering)
    expect(sessions["codex:codex-tui"]!.digest).toContain("L5\n" + batchSteering)
  })

  test("mixed exec failures retain counts without blaming the first successful tool", () => {
    const sessions = extractOnly([], [
      meta("codex-tui", "cli"),
      call("mixed", "await tools.apply_patch('patch'); await tools.exec_command({cmd:'false'})", 1),
      scriptOut("mixed", ["Script completed\nOutput:\n", "Successfully updated file", JSON.stringify({ chunk_id: "failed", wall_time_seconds: 0.1, exit_code: 1, output: "command failed" })], 2),
      call("same", "await tools.exec_command({cmd:'true'}); await tools.exec_command({cmd:'false'})", 3),
      scriptOut("same", ["Script completed\nOutput:\n", JSON.stringify({ chunk_id: "failed", wall_time_seconds: 0.1, exit_code: 2, output: "second failed" })], 4),
    ])
    const result = sessions["codex:codex-tui"]!
    expect(result.tool_errors).toBe("2")
    expect(result.tool_calls).toBe("4")
    expect(result.digest).toContain("L3 exec exit 1:")
    expect(result.digest).toContain("L5 exec_command exit 2:")
    expect(result.digest).not.toContain("apply_patch exit")
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
