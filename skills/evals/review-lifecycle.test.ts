import { describe, expect, test } from "bun:test"
import { parseReviewLifecycle } from "./review-lifecycle.ts"

const response = (payload: object) => ({ type: "response_item", payload })
const event = (payload: object) => ({ type: "event_msg", payload })
const start = () => event({ type: "task_started", turn_id: "turn-1" })
const spawn = (fork_turns: unknown = "none", agent_type = "reviewer") => response({ type: "function_call", name: "spawn_agent", namespace: "collaboration", call_id: "call-1", arguments: JSON.stringify({ task_name: "review", agent_type, fork_turns, message: "Review the diff." }) })
const output = (value: unknown = { task_name: "/root/review" }, call_id = "call-1") => response({ type: "function_call_output", call_id, output: JSON.stringify(value) })
const result = (author = "/root/review", body = "No findings.", kind = "FINAL_ANSWER", recipient = "/root") => response({ type: "agent_message", author, recipient, content: [{ type: "input_text", text: `Message Type: ${kind}\nTask name: /root\nSender: ${author}\nPayload:\n${body}` }] })
const final = () => response({ type: "message", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text: "Done." }] })
const complete = (turn_id = "turn-1") => event({ type: "task_complete", turn_id, completed_at: 1789811167 })
const parse = (...events: object[]) => parseReviewLifecycle(events.map(value => JSON.stringify(value)).join("\n"))
const valid = () => [start(), spawn(), output(), result(), final(), complete()]
const rejected = (...events: object[]) => expect(parse(...events).failures.length).toBeGreaterThan(0)

describe("saved review lifecycle evidence", () => {
  test("pairs successful dispatch, independent result, parent final and completion", () => {
    expect(parse(...valid())).toEqual({ reviews: [{ taskName: "/root/review", role: "reviewer", result: "No findings." }], failures: [] })
    expect(parse(start(), spawn("3"), output(), result(), final(), complete()).failures).toEqual([])
  })
  test("accepts an independent Oracle escalation through the same lifecycle", () => {
    expect(parse(start(), spawn("none", "oracle"), output(), result(), final(), complete())).toEqual({ reviews: [{ taskName: "/root/review", role: "oracle", result: "No findings." }], failures: [] })
  })
  test("accepts explicit final channel", () => {
    const end = response({ type: "message", role: "assistant", channel: "final", content: [{ type: "output_text", text: "Done" }] })
    expect(parse(start(), spawn(), output(), result(), end, complete()).failures).toEqual([])
  })
  test("rejects prose and command output claiming review", () => {
    rejected(start(), response({ type: "message", role: "assistant", content: [{ type: "output_text", text: "Reviewer passed the review." }] }), final(), complete())
    rejected(start(), response({ type: "function_call_output", call_id: "shell", output: JSON.stringify(result()) }), final(), complete())
  })
  test("requires successful matching spawn output", () => {
    for (const value of [{ error: "failed" }, { task_name: "/root/other" }, { task_name: "/root/review", isError: true }, "failed"]) {
      rejected(start(), spawn(), output(value), result(), final(), complete())
    }
    rejected(start(), spawn(), result(), final(), complete())
    rejected(start(), spawn(), output({ task_name: "/root/review" }, "other-call"), result(), final(), complete())
    rejected(start(), output(), spawn(), result(), final(), complete())
  })
  test("requires independent reviewer role dispatch with bounded history", () => {
    for (const fork of ["all", undefined, "0", "-1", "1.5", 3, "9007199254740992"]) rejected(start(), spawn(fork === undefined ? null : fork), output(), result(), final(), complete())
    rejected(start(), spawn("none", "implementer"), output(), result(), final(), complete())
  })
  test("requires authentic matching final result with nonempty body", () => {
    for (const message of [result("/root/other"), result("/root/review", "  "), result("/root/review", "Done", "MESSAGE"), result("/root/review", "Done", "FINAL_ANSWER", "/root/other")]) {
      rejected(start(), spawn(), output(), message, final(), complete())
    }
  })
  test("requires result between successful spawn and parent final", () => {
    rejected(start(), result(), spawn(), output(), final(), complete())
    rejected(start(), spawn(), result(), output(), final(), complete())
    rejected(start(), spawn(), output(), final(), result(), complete())
    rejected(start(), spawn(), output(), final(), complete(), result())
  })
  test("requires matching normal parent completion after final", () => {
    rejected(start(), spawn(), output(), result(), complete())
    rejected(start(), spawn(), output(), result(), final())
    rejected(start(), spawn(), output(), result(), final(), complete("other-turn"))
    rejected(start(), spawn(), output(), result(), final(), event({ type: "turn_aborted" }), complete())
    rejected(start(), spawn(), output(), result(), complete(), final())
    rejected(...valid(), start())
  })
  test("fails closed on invalid JSON and missing lifecycle", () => {
    expect(parseReviewLifecycle("not JSON").failures).toContain("invalid rollout JSON at line 1")
    rejected()
    rejected(spawn(), output(), result(), final(), complete())
  })
})
