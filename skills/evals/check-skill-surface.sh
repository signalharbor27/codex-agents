#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "Install bun before validating the skill surface" >&2
  exit 1
fi

# The Bun validator checks inventory, frontmatter, description and line limits,
# local links, one-level references, fixture structure, and cross-field rules.
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
    echo "rg could not scan for outdated guidance" >&2
    exit "$rc"
  fi
}

# Base review delegation on the pinned diff. Keep coupled work in one context.
# Use a bounded set of independent reviewers only when separate context improves
# coverage. Treat the eight substantive topics as a checklist, not an agent quota.
review_skill="$ROOT/review-and-simplify-changes/SKILL.md"
require_match "Adaptive Reviewer Selection" "$review_skill" "review must select reviewers from the pinned diff"
require_match "small or tightly coupled diff with the main agent" "$review_skill" "coupled reviews must stay in one context"
require_match "minimum useful bounded set of independent subagents" "$review_skill" "independent review must use bounded delegation"
require_match "coverage checklist, not an assignment quota" "$review_skill" "review topics must not become an agent quota"
require_match "main agent owns checklist accounting" "$review_skill" "main agent must own review synthesis and completion"

engineering_skill="$ROOT/engineering/SKILL.md"
require_match "This skill owns inspection, implementation, proof, and the completion claim" \
  "$engineering_skill" "engineering must own the complete producer loop"
require_match "routine changes need no reference" \
  "$engineering_skill" "engineering must preserve pressure-based progressive disclosure"

stale_prompt_pattern='GPT-5\.5|gpt-5\.5|currently means GPT-5\.6|For GPT-5\.6, start|Amp GPT|Context7|140-320|software-engineering-flow|writing-software|testing-software|systematic-debugging|verification-before-completion'
reject_matches "$stale_prompt_pattern" "found stale model, tool, path, or retired skill vocabulary in active guidance" \
  "$ROOT" "$REPO_ROOT/AGENTS.md" "$REPO_ROOT/README.md" --glob '*.md' --glob '!evals/**'

legacy_host_pattern='Claude|Anthropic|CLAUDE\.md|superpowers:|TodoWrite|Task tool|Task\('
reject_matches "$legacy_host_pattern" "found legacy host vocabulary in active skills" \
  "$ROOT" --glob '*.md' --glob '!evals/**'

stacked_eval_pattern='mandatory_router|secondary_skills|expected_sequence'
reject_matches "$stacked_eval_pattern" "found retired stacked-routing vocabulary in eval contracts" \
  "$SCRIPT_DIR" --glob '*.json' --glob '*.ts' --glob '*.md'

echo "skill surface checks passed"
