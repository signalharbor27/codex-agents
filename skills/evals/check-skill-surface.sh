#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/me/.agents/skills}"

engineering_expected=(
  describe-pr
  designing-data-intensive-systems
  effect-ts
  finishing-a-development-branch
  grill-me
  improve-codebase-architecture
  improve-test-suite
  receiving-code-review
  review-and-simplify-changes
  software-engineering-flow
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
  "$ROOT/improve-codebase-architecture"
  "$ROOT/improve-test-suite"
  "$ROOT/effect-ts"
  "$ROOT/finishing-a-development-branch"
  "$ROOT/grill-me"
  "$ROOT/receiving-code-review"
  "$ROOT/review-and-simplify-changes"
  "$ROOT/software-engineering-flow"
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

if ! rg -q "Bug flow:.*testing-software.*writing-software.*verification-before-completion" "$ROOT/software-engineering-flow/SKILL.md"; then
  echo "software-engineering-flow missing explicit bug handoff sequence" >&2
  exit 1
fi

if ! rg -q "outcome-first" "$ROOT/software-engineering-flow/SKILL.md"; then
  echo "software-engineering-flow missing GPT-5.5 outcome-first routing guidance" >&2
  exit 1
fi

if ! rg -q "Implementation stops only after focused proof passes" "$ROOT/writing-software/SKILL.md"; then
  echo "writing-software missing implementation stop rule" >&2
  exit 1
fi

if ! rg -q "architecture no-regression" "$ROOT/writing-software/SKILL.md"; then
  echo "writing-software missing architecture no-regression gate" >&2
  exit 1
fi

if ! rg -q "test no-regression" "$ROOT/testing-software/SKILL.md"; then
  echo "testing-software missing test no-regression gate" >&2
  exit 1
fi

if ! rg -q "Classify findings as pre-existing debt, regression from the current change" "$ROOT/improve-codebase-architecture/SKILL.md"; then
  echo "improve-codebase-architecture missing producer feedback classification" >&2
  exit 1
fi

if ! rg -q "Classify findings as pre-existing test debt, regression from the current change" "$ROOT/improve-test-suite/SKILL.md"; then
  echo "improve-test-suite missing producer feedback classification" >&2
  exit 1
fi

if ! rg -q "ownership, callers, entrypoints, or verification commands are unknown" "$ROOT/writing-software/WORKFLOW-MODES.md"; then
  echo "writing-software workflow modes missing zoom-out rule" >&2
  exit 1
fi

if ! rg -q "Local Agent Brief" "$ROOT/writing-software/EXEC-PLAN-FILES.md"; then
  echo "exec plan docs missing local agent brief" >&2
  exit 1
fi

if ! rg -q "hard to reverse, surprising without context, and based on a real tradeoff" "$ROOT/writing-software/EXEC-PLAN-FILES.md"; then
  echo "exec plan docs missing ADR promotion filter" >&2
  exit 1
fi

if ! rg -q "CONTEXT-MAP.md" "$ROOT/writing-software/DOMAIN-MODELING.md"; then
  echo "domain modeling docs missing context map guidance" >&2
  exit 1
fi

if [[ ! -f "$ROOT/writing-software/TRACER-BULLETS.md" ]]; then
  echo "writing-software missing compact tracer bullets reference" >&2
  exit 1
fi

if ! rg -q "Every review pass must use brand-new subagents" "$ROOT/review-and-simplify-changes/SKILL.md"; then
  echo "review-and-simplify-changes missing fresh subagent review rule" >&2
  exit 1
fi

if ! rg -q "Architecture Alignment" "$ROOT/review-and-simplify-changes/SKILL.md"; then
  echo "review-and-simplify-changes missing architecture alignment section" >&2
  exit 1
fi

if ! rg -q "Upstream Prevention" "$ROOT/review-and-simplify-changes/SKILL.md"; then
  echo "review-and-simplify-changes missing upstream prevention section" >&2
  exit 1
fi

if ! rg -q "writing-software/COMPLEXITY.md" "$ROOT/review-and-simplify-changes/SKILL.md"; then
  echo "review-and-simplify-changes missing complexity reference" >&2
  exit 1
fi

if ! rg -q "improve-codebase-architecture/AGENT_FRIENDLY_REVIEW.md" "$ROOT/review-and-simplify-changes/SKILL.md"; then
  echo "review-and-simplify-changes missing architecture-review reference" >&2
  exit 1
fi

for skill in designing-data-intensive-systems effect-ts writing-rust; do
  if ! rg -q "hand back to .*\`writing-software\`.*\`testing-software\`.*\`verification-before-completion\`" "$ROOT/$skill/SKILL.md"; then
    echo "$skill missing implementation/proof handback" >&2
    exit 1
  fi
done

if ! rg -q "\"forbidden_initial_skills\"" "$ROOT/evals/routing-cases.json"; then
  echo "routing cases must use forbidden_initial_skills" >&2
  exit 1
fi

if rg -q "designing-with-patterns|\"forbidden_skills\"" "${engineering_paths[@]}" "$ROOT/evals/routing-cases.json"; then
  echo "found stale designing-with-patterns or forbidden_skills in active routing surface" >&2
  rg -n "designing-with-patterns|\"forbidden_skills\"" "${engineering_paths[@]}" "$ROOT/evals/routing-cases.json" >&2
  exit 1
fi

echo "skill surface checks passed"
