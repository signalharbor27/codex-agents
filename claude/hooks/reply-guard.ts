#!/usr/bin/env bun
// Claude Code Stop and UserPromptSubmit hook. Stop blocks replies that end by offering to
// continue and records replies over the length limit; UserPromptSubmit reminds Q's budget once.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Word count that triggers a reminder: a tolerance above the output style's reply budgets.
const longReply = 300
const blockReason = "Your reply ended with an offer to continue. If work Q asked for remains and nothing blocks it, do it now. If you need Q, end with `Needs Q:` lines per the reply rules."

const offers = [
  /^(?:so,?\s+)?(?:do you\s+)?want me to\b.*\?$/i,
  /^would you like(?: me)? to\b.*\?$/i,
  /^(?:shall|should) i\s+(?:go ahead|continue|proceed|keep going|carry on|move on)\b.*\?$/i,
  /^let me know if you(?:['’]d| would)? (?:like|want)\b/i,
  /^if you(?:['’]d| would) like,? i can\b/i,
]

type Block = { code: boolean; lines: string[] }

/** Splits text into fenced code blocks and prose paragraphs, in order. */
function blocks(text: string): Block[] {
  const out: Block[] = []
  let fence: string | null = null
  let prose: string[] = []
  const flush = () => {
    if (prose.some(line => line.trim())) out.push({ code: false, lines: prose })
    prose = []
  }
  for (const line of text.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
    if (fence) {
      out.at(-1)!.lines.push(line)
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null
    } else if (marker) {
      flush()
      fence = marker
      out.push({ code: true, lines: [line] })
    } else if (line.trim()) prose.push(line)
    else flush()
  }
  flush()
  return out
}

export function stripCodeBlocks(text: string): string {
  return blocks(text).filter(block => !block.code).map(block => block.lines.join("\n")).join("\n\n")
}

export function countWords(text: string): number {
  return stripCodeBlocks(text).split(/\s+/).filter(Boolean).length
}

const plain = (line: string) => line.replace(/^\s*(?:[-*+>]|\d+[.)])\s+/, "").replace(/[*_]/g, "").trim()

export function endsWithOffer(text: string): boolean {
  const last = blocks(text).at(-1)
  if (!last || last.code) return false
  const lines = last.lines.map(plain)
  if (lines.some(line => /^needs q:/i.test(line))) return false
  const sentence = lines.at(-1)!.split(/(?<=[.!?])\s+/).at(-1) ?? ""
  // A question that offers a choice asks Q to decide; it is not an offer to continue.
  if (sentence.endsWith("?") && /\sor\s/i.test(sentence)) return false
  return offers.some(offer => offer.test(sentence))
}

const stateFile = (dir: string, sessionId: string) => join(dir, `${sessionId.replace(/[^\w-]/g, "_")}.json`)

type HookInput = { hook_event_name?: string; session_id?: string; stop_hook_active?: boolean; last_assistant_message?: string; prompt?: string }

/** Returns the JSON line to print, if any. Stop and UserPromptSubmit share one length state file per session. */
export function handle(input: HookInput, stateDir: string): string | undefined {
  const sessionId = input.session_id ?? "unknown"
  if (input.hook_event_name === "Stop") {
    const message = input.last_assistant_message ?? ""
    const words = countWords(message)
    if (words > longReply) {
      mkdirSync(stateDir, { recursive: true })
      writeFileSync(stateFile(stateDir, sessionId), JSON.stringify({ words }))
    }
    if (!input.stop_hook_active && endsWithOffer(message)) return JSON.stringify({ decision: "block", reason: blockReason })
    return
  }
  if (input.hook_event_name === "UserPromptSubmit") {
    const file = stateFile(stateDir, sessionId)
    if (!existsSync(file)) return
    const { words } = JSON.parse(readFileSync(file, "utf8")) as { words: number }
    rmSync(file, { force: true })
    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: `Your previous reply ran ${words} words, over the reply budget in Q's output style. Keep this reply inside it.`,
      },
    })
  }
}

if (import.meta.main) {
  try {
    const input = JSON.parse(await Bun.stdin.text()) as HookInput
    const output = handle(input, join(process.env.TMPDIR || "/tmp", "claude-reply-guard"))
    if (output) console.log(output)
  } catch (error) {
    console.error(`reply-guard: ${error instanceof Error ? error.message : String(error)}`)
  }
  process.exit(0)
}
