#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
README_FILE="$REPO_ROOT/README.md"

require_pattern() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if ! rg -q "$pattern" "$file"; then
    echo "$message" >&2
    exit 1
  fi
}

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

require_pattern "$ROOT/software-engineering-flow/SKILL.md" "Bug flow:.*testing-software.*writing-software.*verification-before-completion" "software-engineering-flow missing explicit bug handoff sequence"
require_pattern "$ROOT/software-engineering-flow/SKILL.md" "outcome-first" "software-engineering-flow missing GPT-5.5 outcome-first routing guidance"
require_pattern "$ROOT/software-engineering-flow/SKILL.md" "Before any intended commit.*review-and-simplify-changes" "software-engineering-flow missing pre-commit review-and-simplify gate"
require_pattern "$ROOT/writing-software/SKILL.md" "Implementation stops only after focused proof passes" "writing-software missing implementation stop rule"
require_pattern "$ROOT/writing-software/SKILL.md" "architecture no-regression" "writing-software missing architecture no-regression gate"
require_pattern "$ROOT/testing-software/SKILL.md" "test no-regression" "testing-software missing test no-regression gate"
require_pattern "$ROOT/improve-codebase-architecture/SKILL.md" "Classify findings as pre-existing debt, regression from the current change" "improve-codebase-architecture missing producer feedback classification"
require_pattern "$ROOT/improve-test-suite/SKILL.md" "Classify findings as pre-existing test debt, regression from the current change" "improve-test-suite missing producer feedback classification"
require_pattern "$ROOT/writing-software/WORKFLOW-MODES.md" "ownership, callers, entrypoints, or verification commands are unknown" "writing-software workflow modes missing zoom-out rule"
require_pattern "$ROOT/writing-software/EXEC-PLAN-FILES.md" "Local Agent Brief" "exec plan docs missing local agent brief"
require_pattern "$ROOT/writing-software/EXEC-PLAN-FILES.md" "hard to reverse, surprising without context, and based on a real tradeoff" "exec plan docs missing ADR promotion filter"
require_pattern "$ROOT/writing-software/DOMAIN-MODELING.md" "CONTEXT-MAP.md" "domain modeling docs missing context map guidance"

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

stale_paths=("${engineering_paths[@]}" "$ROOT/evals/routing-cases.json")
if [[ -f "$README_FILE" ]]; then
  stale_paths+=("$README_FILE")
fi

if rg -q "designing-with-patterns|\"forbidden_skills\"" "${stale_paths[@]}"; then
  echo "found stale designing-with-patterns or forbidden_skills in active routing surface" >&2
  rg -n "designing-with-patterns|\"forbidden_skills\"" "${stale_paths[@]}" >&2
  exit 1
fi

require_pattern "$ROOT/writing-skills/DESCRIPTIONS.md" "context load" "writing-skills descriptions missing context load vocabulary"
require_pattern "$ROOT/writing-skills/DESCRIPTIONS.md" "cognitive load" "writing-skills descriptions missing cognitive load vocabulary"
require_pattern "$ROOT/writing-skills/EVALUATING-SKILLS.md" "information hierarchy" "writing-skills eval guidance missing information hierarchy vocabulary"
require_pattern "$ROOT/writing-skills/EVALUATING-SKILLS.md" "completion criterion" "writing-skills eval guidance missing completion criterion vocabulary"
require_pattern "$ROOT/writing-software/INTERFACE-DESIGN.md" "One adapter means.*hypothetical seam" "interface design missing seam reality rule"
require_pattern "$ROOT/writing-software/INTERFACE-DESIGN.md" "remote-owned" "interface design missing dependency taxonomy"
require_pattern "$ROOT/writing-software/DOMAIN-MODELING.md" "Active domain modeling" "domain modeling missing active modeling guidance"
require_pattern "$ROOT/writing-software/DOMAIN-MODELING.md" "ADR format" "domain modeling missing ADR format guidance"
require_pattern "$ROOT/systematic-debugging/SKILL.md" "red-capable" "systematic-debugging missing red-capable loop guidance"
require_pattern "$ROOT/systematic-debugging/SKILL.md" "tagged debug" "systematic-debugging missing tagged debug instrumentation guidance"
require_pattern "$ROOT/review-and-simplify-changes/SKILL.md" "Standards" "review-and-simplify-changes missing Standards axis"
require_pattern "$ROOT/review-and-simplify-changes/SKILL.md" "Intent" "review-and-simplify-changes missing Intent axis"
require_pattern "$ROOT/writing-software/PLANNING-LARGE-CHANGES.md" "decision map" "large-change planning missing decision map guidance"
require_pattern "$ROOT/writing-software/TRACER-BULLETS.md" "Use a throwaway prototype before a tracer bullet" "tracer bullets missing prototype contrast"

echo "skill surface checks passed"
