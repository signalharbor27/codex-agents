type RecordValue = Record<string, unknown>

type Review = { taskName: string; role: string; result: string }

function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}
}

function jsonRecord(value: unknown): RecordValue {
  if (typeof value !== "string") return {}
  try { return record(JSON.parse(value)) } catch { return {} }
}

function contentText(value: unknown): string {
  if (!Array.isArray(value)) return ""
  return value.map(record).filter(part => part.type === "input_text" || part.type === "output_text")
    .map(part => typeof part.text === "string" ? part.text : "").join("\n")
}

// Evidence for one saved parent turn. This proves dispatch/result ordering, not
// review quality or that a reviewer inspected the final implementation snapshot.
export function parseReviewLifecycle(rollout: string): { reviews: Review[]; failures: string[] } {
  const failures: string[] = []
  const reviews: Review[] = []
  const events: { type: unknown; payload: RecordValue }[] = []
  for (const [index, line] of rollout.split("\n").entries()) {
    if (!line.trim()) continue
    try {
      const event = record(JSON.parse(line))
      events.push({ type: event.type, payload: record(event.payload) })
    } catch {
      failures.push(`invalid rollout JSON at line ${index + 1}`)
    }
  }
  const starts = events.filter(event => event.type === "event_msg" && event.payload.type === "task_started")
  const turnId = starts[0]?.payload.turn_id
  if (starts.length !== 1 || typeof turnId !== "string" || !turnId) failures.push("expected one parent task_started event")
  let started = false
  let final = false
  let completed = false
  const calls = new Map<string, { taskName: string; role: string }>()
  const spawned = new Map<string, { role: string; received: boolean }>()
  for (const event of events) {
    const payload = event.payload
    if (event.type === "event_msg") {
      if (payload.type === "task_started") started = true
      if (payload.type === "turn_aborted" || payload.type === "task_failed" || payload.type === "error") failures.push("parent task failed or aborted")
      if (payload.type === "task_complete") {
        if (!started || !final || payload.turn_id !== turnId) failures.push("parent task completion lacks matching final response")
        else completed = true
      }
      continue
    }
    if (event.type !== "response_item") continue
    if (payload.type === "message" && payload.role === "assistant" && (payload.phase === "final_answer" || payload.channel === "final")) {
      if (!started || completed || !contentText(payload.content).trim()) failures.push("invalid parent final response")
      final = true
      continue
    }
    if (payload.type === "function_call" && payload.namespace === "collaboration" && payload.name === "spawn_agent") {
      const args = jsonRecord(payload.arguments)
      if (args.agent_type !== "reviewer" && args.agent_type !== "oracle") continue
      const role = args.agent_type
      if (!started || final || completed) { failures.push(`${role} dispatch outside active parent task`); continue }
      if (args.fork_turns !== "none" && !(typeof args.fork_turns === "string" && /^[1-9]\d*$/.test(args.fork_turns) && Number.isSafeInteger(Number(args.fork_turns)))) {
        failures.push(`${role} dispatch requires none or bounded fork_turns`)
        continue
      }
      if (typeof payload.call_id !== "string" || !payload.call_id || typeof args.task_name !== "string" || !/^[a-z0-9_]+$/.test(args.task_name) || calls.has(payload.call_id)) {
        failures.push(`invalid ${role} spawn call`)
        continue
      }
      calls.set(payload.call_id, { taskName: `/root/${args.task_name}`, role })
    }
    if (payload.type === "function_call_output" && typeof payload.call_id === "string" && calls.has(payload.call_id)) {
      const call = calls.get(payload.call_id)!
      calls.delete(payload.call_id)
      const output = jsonRecord(payload.output)
      if (final || completed || output.task_name !== call.taskName || output.error || output.isError || spawned.has(call.taskName)) {
        failures.push(`unsuccessful ${call.role} spawn: ${call.taskName}`)
        continue
      }
      spawned.set(call.taskName, { role: call.role, received: false })
    }
    if (payload.type === "agent_message" && payload.recipient === "/root" && typeof payload.author === "string") {
      const spawn = spawned.get(payload.author)
      if (!spawn) continue
      const match = /^Message Type: FINAL_ANSWER\r?\nTask name: \/root\r?\nSender: ([^\r\n]+)\r?\nPayload:\r?\n([\s\S]*)$/.exec(contentText(payload.content))
      if (!match || match[1] !== payload.author || !match[2]!.trim()) continue
      if (final || completed) { failures.push(`review result arrived after parent final: ${payload.author}`); continue }
      if (!spawn.received) reviews.push({ taskName: payload.author, role: spawn.role, result: match[2]! })
      spawn.received = true
    }
  }
  for (const call of calls.values()) failures.push(`missing ${call.role} spawn output: ${call.taskName}`)
  for (const [taskName, spawn] of spawned) if (!spawn.received) failures.push(`missing ${spawn.role} final result: ${taskName}`)
  if (!reviews.length) failures.push("missing independent reviewer result")
  if (!final) failures.push("missing parent final response")
  if (!completed) failures.push("missing normal parent task completion")
  return { reviews, failures }
}
