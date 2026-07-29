#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required to validate the skill surface" >&2
  exit 1
fi

# The Bun validator owns inventory, frontmatter, description and line budgets,
# local links, one-level references, fixture shape, and cross-field invariants.
bun "$SCRIPT_DIR/run-routing-evals.ts" validate --skills-root "$ROOT" --quiet

require_match() {
  local pattern="$1"
  local file="$2"
  local message="$3"
  local rc
  if rg -q -- "$pattern" "$file"; then
    return
  else
    rc=$?
  fi
  if ((rc == 1)); then
    echo "$message" >&2
    exit 1
  fi
  echo "rg failed while checking $file" >&2
  exit "$rc"
}

reject_matches() {
  local pattern="$1"
  local message="$2"
  shift 2
  local matches rc
  if matches=$(rg -n "$pattern" "$@"); then
    echo "$message" >&2
    printf '%s\n' "$matches" >&2
    exit 1
  else
    rc=$?
  fi
  if ((rc != 1)); then
    echo "rg failed while scanning for stale guidance" >&2
    exit "$rc"
  fi
}

# Q explicitly requires eight distinct subagents for every broad review. Keep
# this invariant visible in the authoritative review skill and test behavior in
# routing-cases.json.
review_skill="$ROOT/review-and-simplify-changes/SKILL.md"
require_match "brand-new subagents" "$review_skill" "broad review must require fresh subagents"
require_match "exactly eight" "$review_skill" "broad review must require exactly eight subagents"
require_match "one assigned to each track" "$review_skill" "broad review must preserve one agent per track"
require_match "waves" "$review_skill" "broad review must preserve capacity-aware waves"
require_match "single-track" "$review_skill" "broad review must preserve the explicit single-track exception"

engineering_skill="$ROOT/engineering/SKILL.md"
require_match "This skill owns inspection, implementation, proof, and the completion claim" \
  "$engineering_skill" "engineering must own the complete producer loop"
require_match "routine changes need no reference" \
  "$engineering_skill" "engineering must preserve pressure-based progressive disclosure"

stale_prompt_pattern='GPT-5\.5|gpt-5\.5|Amp GPT|Context7|140-320|software-engineering-flow|writing-software|testing-software|systematic-debugging|verification-before-completion'
reject_matches "$stale_prompt_pattern" "found stale model, tool, path, or retired skill vocabulary in active guidance" \
  "$ROOT" "$REPO_ROOT/AGENTS.md" "$REPO_ROOT/README.md" --glob '*.md' --glob '!evals/**'

legacy_host_pattern='Claude|Anthropic|CLAUDE\.md|superpowers:|TodoWrite|Task tool|Task\('
reject_matches "$legacy_host_pattern" "found legacy host vocabulary in active skills" \
  "$ROOT" --glob '*.md' --glob '!evals/**'

stacked_eval_pattern='mandatory_router|secondary_skills|expected_sequence'
reject_matches "$stacked_eval_pattern" "found retired stacked-routing vocabulary in eval contracts" \
  "$SCRIPT_DIR" --glob '*.json' --glob '*.ts' --glob '*.md'

echo "skill surface checks passed"
