# Retro sources

## Session logs

Two log families exist. Both are append-only JSONL, and some files exceed 100 MB.

- `~/.claude/projects/<project>/<session>.jsonl`: one file per top-level session. Files under `<session>/subagents/` are subagent rollouts of that session.
- `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`: one file per thread, stored under the day the thread started. Long threads keep appending, so filter on modification time and event timestamps, not the directory date. The first line's `session_meta` names the `originator`. `codex_exec` marks automated `codex exec`/`codex review` runs, and a dict-valued `source` marks a subagent.

## Extractor

```bash
nice -n 19 python3 <retro-skill>/scripts/extract.py --since 2026-10-02 --out ~/reports/retro-2026-10-09
```

- `--since` is inclusive and `--until` exclusive, both `YYYY-MM-DD` UTC. Only events inside the window are counted.
- `--claude-root` and `--codex-root` override the log roots. `--include-automated` keeps `codex_exec` rollouts, subagent rollouts, and delegated children, which are skipped by default because they repeat their parent's work.
- A delegated child is a session stored as top-level whose first user message, read regardless of the window, starts with "You are the `<role>` subagent." (backticks optional), or the orchestrator prefix "Act as the <role> sub-agent for this task.". T3 `delegate_task` children appear this way in both log families. Its role (ours when present, else the prefix's) fills the `role` column when included.
- Every skipped rollout gets a row in `skipped.tsv` (reason `codex_exec`, `subagent`, or `delegated:<role>`, then source and path), and the summary line prints `automated_skipped` and `delegated_skipped`, so nothing leaves the window silently.
- `--max-mem-mb` caps the address space (default 2048). The script streams line by line, and a week of logs takes seconds.
- Output: `index.tsv`, with a header and one row per session (id, source, delegated role, span, size, user messages, tool calls, tool errors, hook hits, interrupts, compactions, cwd, title), plus one `sNNN.md` digest per session. A digest holds header stats, tool, skill, and subagent counts, the user's messages with timestamps, hook and guard blocks, and a sample of tool errors.
- Exact T3 terminal completion notices, including batches, are omitted from user steering; messages with added human text stay. Mixed nested executor calls without result identity retain an `exec` error label rather than guessing the failing tool.
- Tool errors are explicit failures only: `is_error` tool results, nonzero exit codes from tool-output headers or JSON `exit_code` fields, failed exec scripts, and error events. Hook hits are explicit deny or block messages: PreToolUse hook errors, Stop-hook blocks, harness `Blocked:` messages, permission denials, and exec-policy rejections. Reply-guard nudges are counted separately as `hook_nudges`.

## Reading raw logs

Each digest entry carries `L<n>`, its line number in the raw log named on the digest's `file:` line. Read the surrounding window with bounded commands:

```bash
sed -n '<n-5>,<n+5>p' <file> | cut -c1-1500
grep -n '<phrase>' <file> | head -20 | cut -c1-300
```

Open a raw log only when a digest hints at a problem: the user correcting, repeating, or overriding the agent, a run of errors, a hook hit, or repeated compactions. Read one file at a time.

## PR reviews

Use GitHub REST through `gh api`; the shared GraphQL quota is often exhausted.

```bash
gh api 'repos/<owner>/<repo>/pulls?state=closed&sort=updated&direction=desc&per_page=50' \
  --jq '.[] | select(.merged_at != null and .merged_at >= "<since>") | [.number, .merged_at, .title, (.body // "" | @json)] | @tsv'
gh api --paginate repos/<owner>/<repo>/pulls/<n>/comments \
  --jq '.[] | [.created_at, .user.login, .path, (.body | .[0:300])] | @tsv'
gh api --paginate repos/<owner>/<repo>/pulls/<n>/reviews --jq '.[] | [.submitted_at, .user.login, .state, (.body | .[0:300])] | @tsv'
gh api --paginate repos/<owner>/<repo>/issues/<n>/comments --jq '.[] | [.created_at, .user.login, (.body | .[0:300])] | @tsv'
```

Signals:

- A bot or human finding fixed after review: could a check or a review standard have caught it before the PR?
- The same comment recurring across PRs: a standard or a check.
- A finding the author rejected: a candidate to prune or clarify in the standards.
- CI failures fixed by follow-up pushes: a check that should run locally first.

Cite PR evidence as `<repo>#<n>`, the comment timestamp, and a short quote.

### GraphQL quota recovery

When a GitHub command reports exhausted GraphQL quota, switch the required reads to REST instead of retrying the same command.

1. Read `gh api rate_limit` once with a 30-second timeout. Check `resources.core.remaining` and `reset`; REST has its own quota. If it is exhausted, report the reset time and the pending read.
2. Set a request and page budget before fetching (for example, five requests total, one page per endpoint, 30 seconds per request). Use explicit owner/repo and PR number. Read `repos/<owner>/<repo>/pulls/<n>` to pin `.head.sha` and current PR state.
3. Fetch only what the task needs: the review/comment endpoints above, `repos/<owner>/<repo>/commits/<sha>/check-runs?per_page=100`, or `repos/<owner>/<repo>/commits/<sha>/status?per_page=100`. Compare returned counts and pagination links with the data read; report incomplete coverage when the budget cannot cover all pages. Check results apply only to the pinned head.
4. Stop on REST quota denial or another API error and report it. Re-read the PR head before using the results for an integration decision; a changed head invalidates the old checks. Reserve that read within the budget. REST recovery supplies evidence; publication and merge still require their existing authority and gates.
