// The one source for every subagent role. scripts/generate-hosts.ts renders it into Codex profiles
// (agents/*.toml), Claude agents (claude/agents/*.md), T3 delegation briefs (briefs/*.md), and the role
// table in AGENTS.md and CLAUDE.md. Each role's instructions live in roles/<name>.md.
//
// Model choices are Q's (2026-10-04): Opus writes code and shapes abstractions, Sol reviews carefully,
// Astra and Fable answer the hard calls together, and Opus credits go only to design, code, and one
// review pass per change.

export type Provider = "codex" | "claude"
// Q (2026-10-04): no role runs above high; xhigh costs too much for what it adds.
export type Effort = "low" | "medium" | "high"
/** read-only: never edits or runs mutating commands. run: runs commands that may write caches but never edits sources. write: edits files. */
export type Authority = "read-only" | "run" | "write"
/** One model a role runs on. A role with two seats runs both in parallel and a judge reconciles them. */
export type Seat = { provider: Provider; model: string; effort: Effort }

export const toolNotes = {
  grep_app:
    "grep_app search ignores case by default. Set `matchCase: true` for identifiers and API names; add `matchWholeWords: true` or `useRegexp: true` when the pattern must match exactly.",
}
export type ToolNote = keyof typeof toolNotes

export type Role = {
  description: string
  seats: Seat[]
  authority: Authority
  /** Skills the role loads before work: preloaded for Claude agents, named in profiles and briefs otherwise. */
  skills: string[]
  /** Tool notes appended to the role's instructions on every surface. */
  toolNotes: ToolNote[]
  /** Claude agent color. */
  color: string
}

const opus = (effort: Effort): Seat => ({ provider: "claude", model: "claude-opus-5-5", effort })
const fable = (effort: Effort): Seat => ({ provider: "claude", model: "claude-fable-5-1", effort })
const sol = (effort: Effort): Seat => ({ provider: "codex", model: "gpt-6.1-sol", effort })
const astra = (effort: Effort): Seat => ({ provider: "codex", model: "gpt-6-astra", effort })

export const roles: Record<string, Role> = {
  architect: {
    description: "Use when a one-way or cross-boundary change needs its types, signatures, and module boundaries designed before implementation. Excludes slices whose shape is already settled.",
    // Two model families draft independently.
    seats: [opus("high"), astra("high")],
    authority: "write",
    skills: [],
    toolNotes: [],
    color: "purple",
  },
  design_reviewer: {
    description: "Use on the first full review pass for a second-family review focused on abstractions, boundaries, and simplification. Excludes fix deltas and mechanical checks.",
    seats: [opus("medium")],
    authority: "read-only",
    skills: ["review-agent"],
    toolNotes: [],
    color: "pink",
  },
  explorer: {
    description: "Use when repository ownership, callers, data flow, or existing tests must be located before an implementation or review decision.",
    seats: [sol("medium")],
    authority: "read-only",
    skills: [],
    toolNotes: [],
    color: "cyan",
  },
  fast_reviewer: {
    description: "Use when a review needs a bounded check for unused code, dependency cycles, stale comments, or stubs. Excludes behavioral or architectural judgment.",
    seats: [sol("low")],
    authority: "read-only",
    skills: [],
    toolNotes: ["grep_app"],
    color: "yellow",
  },
  implementer: {
    description: "Use when an agreed implementation slice has settled contracts, assigned write ownership, acceptance criteria, and a known verification path.",
    seats: [opus("medium")],
    authority: "write",
    skills: ["engineering"],
    toolNotes: [],
    color: "green",
  },
  judge: {
    description: "Use when two architect drafts or two oracle answers need reconciling: scores drafts against a rubric, or checks disputed claims against evidence.",
    seats: [sol("high")],
    authority: "read-only",
    skills: [],
    toolNotes: [],
    color: "orange",
  },
  librarian: {
    description: "Use when a task depends on external documentation, public code, or current upstream facts that local repository evidence cannot settle.",
    seats: [sol("medium")],
    authority: "read-only",
    skills: [],
    toolNotes: ["grep_app"],
    color: "blue",
  },
  oracle: {
    description: "Use when the user explicitly requests Oracle, a one-way door needs its review, or investigation or ordinary review has stalled on a concrete technical blocker. Excludes routine review.",
    // Q runs both strongest models anyway; the judge reconciles them.
    seats: [fable("high"), astra("high")],
    authority: "read-only",
    skills: ["review-agent"],
    toolNotes: ["grep_app"],
    color: "purple",
  },
  refiner: {
    description: "Use when independent review reported clear Standards fixes to apply in a separate context before delta review. Excludes judgment calls, new behavior, and review of its own edits.",
    seats: [opus("medium")],
    authority: "write",
    skills: [],
    toolNotes: [],
    color: "pink",
  },
  reviewer: {
    description: "Use when a completed change or subsequent fix needs independent correctness, simplification, or Standards/Intent review. Excludes implementation and command-only verification.",
    seats: [sol("high")],
    authority: "read-only",
    skills: ["review-agent"],
    toolNotes: [],
    color: "red",
  },
  verifier: {
    description: "Use when completed implementation needs command-backed acceptance evidence. Excludes source-only review, test design, and repairs.",
    seats: [sol("high")],
    authority: "run",
    skills: [],
    toolNotes: [],
    color: "orange",
  },
}
