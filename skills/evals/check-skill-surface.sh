#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/me/.agents/skills}"

engineering_expected=(
  describe-pr
  designing-data-intensive-systems
  designing-with-patterns
  effect-ts
  finishing-a-development-branch
  frontend-design
  grill-me
  improve-codebase-architecture
  improve-test-suite
  receiving-code-review
  systematic-debugging
  testing-software
  using-git-worktrees
  verification-before-completion
  writing-rust
  writing-skills
  writing-software
)

actual=()
missing=()

for skill in "${engineering_expected[@]}"; do
  if [[ -f "$ROOT/$skill/SKILL.md" ]]; then
    actual+=("$skill")
  else
    missing+=("$skill")
  fi
done

if [[ "${#missing[@]}" -ne 0 ]]; then
  echo "missing expected engineering skills:" >&2
  printf '%s\n' "${missing[@]}" >&2
  exit 1
fi

engineering_paths=(
  "$ROOT/describe-pr"
  "$ROOT/designing-data-intensive-systems"
  "$ROOT/designing-with-patterns"
  "$ROOT/improve-codebase-architecture"
  "$ROOT/improve-test-suite"
  "$ROOT/effect-ts"
  "$ROOT/finishing-a-development-branch"
  "$ROOT/frontend-design"
  "$ROOT/grill-me"
  "$ROOT/receiving-code-review"
  "$ROOT/systematic-debugging"
  "$ROOT/testing-software"
  "$ROOT/using-git-worktrees"
  "$ROOT/verification-before-completion"
  "$ROOT/writing-rust"
  "$ROOT/writing-skills"
  "$ROOT/writing-software"
  "$ROOT/writing-software/"*.md
  "$ROOT/testing-software/TDD.md"
  "$ROOT/effect-ts/CLIENT_WRAPPERS.md"
  "$ROOT/designing-data-intensive-systems/POSTGRES_TIMESCALE.md"
  "$ROOT/writing-skills/"*.md
)

if rg -n "Claude|Anthropic|CLAUDE\\.md|superpowers:|TodoWrite|Task tool|Task\\(" "${engineering_paths[@]}" >/dev/null; then
  echo "found banned legacy terms in active skill surface" >&2
  rg -n "Claude|Anthropic|CLAUDE\\.md|superpowers:|TodoWrite|Task tool|Task\\(" "${engineering_paths[@]}" >&2
  exit 1
fi

for skill in "${engineering_expected[@]}"; do
  file="$ROOT/$skill/SKILL.md"
  line_count="$(wc -l < "$file" | tr -d ' ')"
  if [[ "$line_count" -gt 120 ]]; then
    echo "SKILL.md too long ($line_count lines) in $file" >&2
    exit 1
  fi
  if ! rg -q "^## Overview$" "$file"; then
    echo "missing '## Overview' in $file" >&2
    exit 1
  fi
  if ! rg -q "^## When to Use$" "$file"; then
    echo "missing '## When to Use' in $file" >&2
    exit 1
  fi
  if ! rg -q "^## When Not to Use$" "$file"; then
    echo "missing '## When Not to Use' in $file" >&2
    exit 1
  fi
  if ! rg -q "^## Minimal Workflow$" "$file"; then
    echo "missing '## Minimal Workflow' in $file" >&2
    exit 1
  fi
  if ! rg -q "^## Reference Routing$" "$file"; then
    echo "missing '## Reference Routing' in $file" >&2
    exit 1
  fi
  desc="$(awk '/^description:/{sub(/^description:[[:space:]]*/, ""); print; exit}' "$file")"
  if [[ "$desc" != *"Use when"* ]]; then
    echo "description missing 'Use when' in $file" >&2
    exit 1
  fi
  desc_len="${#desc}"
  if [[ "$desc_len" -lt 140 || "$desc_len" -gt 320 ]]; then
    echo "description length out of range ($desc_len chars) in $file" >&2
    exit 1
  fi
done

echo "skill surface checks passed"
