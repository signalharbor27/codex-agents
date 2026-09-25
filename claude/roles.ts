// Claude Code settings for each Codex role in agents/*.toml. Instructions come from the TOML;
// scripts/generate-hosts.ts fails when a TOML has no role here or a role has no TOML.

// Claude-side notes appended to the agents that list them in `toolNotes`.
export const toolNotes = {
  grep_app:
    "grep_app search ignores case by default. Set `matchCase: true` for identifiers and API names; add `matchWholeWords: true` or `useRegexp: true` when the pattern must match exactly.",
}
export type ToolNote = keyof typeof toolNotes
export type ClaudeRole = { model: string; effort: string; color: string; disallowedTools: string; skills: string[]; toolNotes: ToolNote[] }

const readOnly = "Edit, Write, NotebookEdit, Agent"
const opus = "claude-opus-5-5"

export const roles: Record<string, ClaudeRole> = {
  explorer: { model: opus, effort: "low", color: "cyan", disallowedTools: readOnly, skills: [], toolNotes: [] },
  fast_reviewer: { model: opus, effort: "low", color: "yellow", disallowedTools: readOnly, skills: [], toolNotes: ["grep_app"] },
  implementer: { model: opus, effort: "medium", color: "green", disallowedTools: "Agent", skills: ["engineering"], toolNotes: [] },
  librarian: { model: opus, effort: "low", color: "blue", disallowedTools: readOnly, skills: [], toolNotes: ["grep_app"] },
  oracle: { model: "claude-fable-5-1", effort: "xhigh", color: "purple", disallowedTools: readOnly, skills: ["review-agent"], toolNotes: ["grep_app"] },
  reviewer: { model: opus, effort: "high", color: "red", disallowedTools: readOnly, skills: ["review-agent"], toolNotes: [] },
  // The verifier runs commands but must not edit sources.
  verifier: { model: opus, effort: "medium", color: "orange", disallowedTools: readOnly, skills: [], toolNotes: [] },
}

