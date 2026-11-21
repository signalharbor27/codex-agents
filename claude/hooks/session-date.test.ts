import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { formatSydneyDate, handle } from "./session-date.ts"

describe("formatSydneyDate", () => {
  test("formats AEDT (UTC+11) dates in Sydney time", () => {
    expect(formatSydneyDate(new Date("2026-11-21T05:45:00Z"))).toBe(
      "Today's date (Australia/Sydney): Saturday, 2026-11-21 16:45 AEDT",
    )
  })

  test("formats AEST (UTC+10) dates in Sydney time", () => {
    expect(formatSydneyDate(new Date("2026-07-15T05:45:00Z"))).toBe(
      "Today's date (Australia/Sydney): Wednesday, 2026-07-15 15:45 AEST",
    )
  })

  test("rolls date forward across Sydney midnight with 00 hour", () => {
    expect(formatSydneyDate(new Date("2026-11-20T13:05:00Z"))).toBe(
      "Today's date (Australia/Sydney): Saturday, 2026-11-21 00:05 AEDT",
    )
  })
})

describe("handle", () => {
  const fixed = new Date("2026-11-21T05:45:00Z")
  const expectedMessage = "Today's date (Australia/Sydney): Saturday, 2026-11-21 16:45 AEDT"

  test("emits Claude Code and Codex SessionStart hookSpecificOutput by default", () => {
    expect(JSON.parse(handle({ hook_event_name: "SessionStart" }, [], fixed))).toEqual({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: expectedMessage,
      },
    })
    expect(JSON.parse(handle({}, [], fixed))).toEqual({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: expectedMessage,
      },
    })
  })

  test("emits Antigravity injectSteps for published payload via --format antigravity or camelCase hookEventName", () => {
    const expected = {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: expectedMessage,
          },
        },
      ],
    }
    const publishedAntigravityPayload = {
      conversationId: "ec33ebf9-0cba-4100-8142-c61503f6c587",
      workspacePaths: ["/path/to/workspace"],
      transcriptPath: "/path/to/transcript.jsonl",
      artifactDirectoryPath: "/path/to/artifacts",
      modelName: "auto",
    }
    expect(JSON.parse(handle(publishedAntigravityPayload, ["--format", "antigravity"], fixed))).toEqual(expected)
    expect(JSON.parse(handle(publishedAntigravityPayload, ["--format=antigravity"], fixed))).toEqual(expected)
    expect(JSON.parse(handle({ ...publishedAntigravityPayload, hookEventName: "SessionStart" }, [], fixed))).toEqual(expected)
  })

  test("rejects unknown --format values", () => {
    expect(() => handle({}, ["--format", "bogus"], fixed)).toThrow("unknown --format value: bogus")
    expect(() => handle({}, ["--format=bogus"], fixed)).toThrow("unknown --format value: bogus")
    expect(() => handle({}, ["--format"], fixed)).toThrow("unknown --format value: (missing)")
  })
})

describe("hook subprocess", () => {
  const run = async (stdin: string, args: string[] = []) => {
    const child = Bun.spawn({
      cmd: ["bun", join(import.meta.dir, "session-date.ts"), ...args],
      stdin: new TextEncoder().encode(stdin),
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    return { stdout, stderr, exitCode }
  }

  test("round trips Claude/Codex and Antigravity published payloads", async () => {
    const datePattern = /^Today's date \(Australia\/Sydney\): [A-Z][a-z]+, \d{4}-\d{2}-\d{2} \d{2}:\d{2} AE[DS]T$/
    const standard = await run(JSON.stringify({ hook_event_name: "SessionStart", session_id: "s1" }))
    expect(standard.exitCode).toBe(0)
    expect(standard.stderr).toBe("")
    expect(JSON.parse(standard.stdout)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: expect.stringMatching(datePattern),
      },
    })

    const publishedAgyPayload = JSON.stringify({
      conversationId: "ec33ebf9-0cba-4100-8142-c61503f6c587",
      workspacePaths: ["/path/to/workspace"],
      transcriptPath: "/path/to/transcript.jsonl",
      artifactDirectoryPath: "/path/to/artifacts",
      modelName: "auto",
    })
    const agyExplicit = await run(publishedAgyPayload, ["--format", "antigravity"])
    expect(agyExplicit.exitCode).toBe(0)
    expect(agyExplicit.stderr).toBe("")
    expect(JSON.parse(agyExplicit.stdout)).toMatchObject({
      injectSteps: [
        {
          systemMessage: {
            systemMessage: expect.stringMatching(datePattern),
          },
        },
      ],
    })

    const agyEvent = await run(JSON.stringify({ hookEventName: "SessionStart", conversationId: "c1" }))
    expect(agyEvent.exitCode).toBe(0)
    expect(agyEvent.stderr).toBe("")
    expect(JSON.parse(agyEvent.stdout).injectSteps).toHaveLength(1)
  })

  test("malformed stdin and invalid --format exit 1 with one stderr line", async () => {
    for (const [input, args] of [
      ["not json", []],
      ["null", []],
      ["[]", []],
      ["", ["--format", "bogus"]],
      ["", ["--format=bogus"]],
    ] as const) {
      const result = await run(input, [...args])
      expect(result).toMatchObject({ exitCode: 1, stdout: "" })
      expect(result.stderr.trim().split("\n")).toHaveLength(1)
    }
  })
})
