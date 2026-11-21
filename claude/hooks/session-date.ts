#!/usr/bin/env bun
// SessionStart hook for Claude Code, Codex, and Antigravity.
// Injects today's date and time in Australia/Sydney (AEST/AEDT) at session startup.

type Format = "standard" | "antigravity"

const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
})

export function formatSydneyDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(sydneyFormatter.formatToParts(now).map(part => [part.type, part.value]))
  return `Today's date (Australia/Sydney): ${parts.weekday}, ${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`
}

function parseFormatValue(value: string | undefined): Format {
  if (value === "standard" || value === "antigravity") return value
  throw new Error(`unknown --format value: ${value ?? "(missing)"}`)
}

function parseFormat(args: string[]): Format | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--format") return parseFormatValue(args[i + 1])
    if (arg?.startsWith("--format=")) return parseFormatValue(arg.slice("--format=".length))
  }
  return undefined
}

export function handle(input: Record<string, unknown>, args: string[] = [], now: Date = new Date()): string {
  const message = formatSydneyDate(now)
  const format = parseFormat(args) ?? (typeof input.hookEventName === "string" ? "antigravity" : "standard")
  if (format === "antigravity") {
    return JSON.stringify({
      injectSteps: [
        {
          systemMessage: {
            systemMessage: message,
          },
        },
      ],
    })
  }
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: message,
    },
  })
}

if (import.meta.main) {
  try {
    const raw = (await Bun.stdin.text()).trim()
    let input: Record<string, unknown> = {}
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("stdin must be a JSON object")
      }
      input = parsed as Record<string, unknown>
    }
    console.log(handle(input, process.argv.slice(2)))
  } catch (error) {
    console.error(`session-date: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
