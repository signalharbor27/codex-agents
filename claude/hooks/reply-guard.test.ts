import { describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { countWords, endsWithOffer, handle } from "./reply-guard.ts"

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ")
const stop = (message: string, stop_hook_active = false) => ({ hook_event_name: "Stop", session_id: "s1", stop_hook_active, last_assistant_message: message })
const prompt = { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "next" }
const withDir = (run: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "reply-guard-"))
  try {
    run(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("offer detection", () => {
  const offers = [
    "Done: tests pass.\n\nWant me to wire the hook too?",
    "Done.\n\nDo you want me to open the PR?",
    "Done. Would you like me to add a test?",
    "Would you like to see the diff?",
    "Shall I go ahead with the migration?",
    "Shall I continue?",
    "Should I proceed with slice two?",
    "Should I go ahead and push?",
    "Let me know if you'd like me to refactor it.",
    "Let me know if you want more detail.",
    "Want me to continue?",
    "Shall I proceed?",
    "Would you like me to add tests?",
    "Let me know if you'd like me to tighten the wording.",
    "- **Want me to** run the full gate?",
  ]
  for (const message of offers) test(`blocks: ${message.split("\n").at(-1)}`, () => {
    expect(endsWithOffer(message)).toBe(true)
  })

  const decisions = [
    "Should we use X or Y?",
    "Needs Q: push to main now?",
    "Needs Q: want me to delete the backups?",
    "Say go and I'll start.",
    "Should I start with the migration or the API?",
    "Want me to push, or keep it local?",
    "Want me to use approach A or B?",
    "Should I start the migration?",
    "Blocked on credentials.\nNeeds Q: rotate the key?\nWant me to continue?",
    "Would you like me to continue?\n\nDone: all slices landed.",
    "Done: all checks pass.",
  ]
  for (const message of decisions) test(`passes: ${message.split("\n").at(-1)}`, () => {
    expect(endsWithOffer(message)).toBe(false)
  })

  test("passes when the final block is fenced code, even with blank lines inside", () => {
    expect(endsWithOffer("Result below.\n\n```\nWant me to run it?\n```")).toBe(false)
    expect(endsWithOffer("Want me to continue?\n\n```\na\n\nb\n```")).toBe(false)
  })

  test("judges the prose after a code block", () => {
    expect(endsWithOffer("```\nx\n```\n\nWant me to continue?")).toBe(true)
    expect(endsWithOffer("Done.\n```\nx\n```\nShall I proceed?")).toBe(true)
  })
})

describe("Stop and UserPromptSubmit", () => {
  test("blocks an offer unless stop_hook_active", () => withDir(dir => {
    expect(JSON.parse(handle(stop("Want me to continue?"), dir)!)).toEqual({ decision: "block", reason: "Your reply ended with an offer to continue. If work Q asked for remains and nothing blocks it, do it now. If you need Q, end with `Needs Q:` lines per the reply rules." })
    expect(handle(stop("Want me to continue?", true), dir)).toBeUndefined()
  }))

  test("excludes fenced code from word counts", () => {
    expect(countWords(`one two\n\n\`\`\`ts\n${words(500)}\n\`\`\`\nthree`)).toBe(3)
    expect(countWords(`one\n~~~~\n${words(50)}\n\`\`\`\nstill code\n~~~~`)).toBe(1)
  })

  test("long reply state round trips once", () => withDir(dir => {
    expect(handle(stop(words(300)), dir)).toBeUndefined()
    expect(handle(prompt, dir)).toBeUndefined()
    handle(stop(`${words(301)}\n\n\`\`\`\n${words(400)}\n\`\`\``), dir)
    expect(JSON.parse(handle(prompt, dir)!)).toEqual({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: "Your previous reply ran 301 words, over the reply budget in Q's output style. Keep this reply inside it.",
      },
    })
    expect(existsSync(join(dir, "s1.json"))).toBe(false)
    expect(handle(prompt, dir)).toBeUndefined()
  }))

  test("confines state files to the state directory", () => withDir(dir => {
    handle({ ...stop(words(301)), session_id: "../../escape" }, dir)
    expect(readdirSync(dir)).toEqual(["______escape.json"])
  }))
})

describe("hook subprocess", () => {
  const run = async (stdin: string, tmp: string) => {
    const child = Bun.spawn({ cmd: ["bun", join(import.meta.dir, "reply-guard.ts")], env: { ...process.env, TMPDIR: tmp }, stdin: new TextEncoder().encode(stdin), stdout: "pipe", stderr: "pipe" })
    const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    return { stdout, stderr, exitCode }
  }

  test("round trips stdin JSON through both events", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "reply-guard-proc-"))
    try {
      const blocked = await run(JSON.stringify(stop(`${words(320)}\n\nShall I proceed?`)), tmp)
      expect(blocked.exitCode).toBe(0)
      expect(JSON.parse(blocked.stdout).decision).toBe("block")
      expect(existsSync(join(tmp, "claude-reply-guard", "s1.json"))).toBe(true)
      const reminded = await run(JSON.stringify(prompt), tmp)
      expect(JSON.parse(reminded.stdout).hookSpecificOutput.additionalContext).toContain("323 words")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("malformed input exits 0 with one stderr line", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "reply-guard-proc-"))
    try {
      for (const input of ["not json", "null", ""]) {
        const result = await run(input, tmp)
        expect(result).toMatchObject({ exitCode: 0, stdout: "" })
        expect(result.stderr.trim().split("\n")).toHaveLength(1)
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
