#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CHECK_INSTALLED=0
ROOT=""
for arg in "$@"; do
  if [[ "$arg" == "--installed" ]]; then
    CHECK_INSTALLED=1
  elif [[ -z "$ROOT" ]]; then
    ROOT="$arg"
  fi
done
ROOT="${ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "Install bun before validating the skill surface" >&2
  exit 1
fi

# The Bun validator checks inventory, frontmatter, description and line limits,
# local links, one-level references, fixture structure, and cross-field rules.
bun "$SCRIPT_DIR/run-routing-evals.ts" validate --skills-root "$ROOT" --quiet

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

stale_prompt_pattern='GPT-5\.5|gpt-5\.5|currently means GPT-5\.6|For GPT-5\.6, start|Amp GPT|Context7|140-320|software-engineering-flow|writing-software|testing-software|systematic-debugging|verification-before-completion'
reject_matches "$stale_prompt_pattern" "found stale model, tool, path, or retired skill vocabulary in active guidance" \
  "$ROOT" "$REPO_ROOT/AGENTS.md" "$REPO_ROOT/README.md" --glob '*.md' --glob '!evals/**'

legacy_host_pattern='Claude|Anthropic|CLAUDE\.md|superpowers:|TodoWrite|Task tool|Task\('
reject_matches "$legacy_host_pattern" "found legacy host vocabulary in active skills" \
  "$ROOT" --glob '*.md' --glob '!evals/**'

stacked_eval_pattern='mandatory_router|secondary_skills|expected_sequence'
reject_matches "$stacked_eval_pattern" "found retired stacked-routing vocabulary in eval contracts" \
  "$SCRIPT_DIR" --glob '*.json' --glob '*.ts' --glob '*.md'

# Generated host artifacts (AGENTS.md, claude/) must match instructions/ and agents/.
bun "$REPO_ROOT/scripts/generate-hosts.ts" --check
if ((CHECK_INSTALLED)); then
  bun "$REPO_ROOT/scripts/generate-hosts.ts" --check-installed
fi

echo "skill surface checks passed"
