#!/usr/bin/env bash
# Remove the agent-owned workspace and local branch of merged work.
# Usage: cleanup-merged.sh [--dry-run] <branch>
# Run inside any checkout of the repository. Refuses (exit 1) unless the branch
# is merged and is either checked out nowhere or in a clean Worktrunk-owned
# worktree (a `wt list` entry at the worktree-path template), and no worktree
# is mid-rebase or mid-bisect on it. The merge proof looks up only PRs whose
# head branch belongs to this repository's owner, so work merged from a fork is
# refused until its tip is in the default branch. Needs wt, jq, gh.
set -euo pipefail

dry_run=0
branch=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    -h | --help) sed -n '2,9s/^# \{0,1\}//p' "$0"; exit 0 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *) [[ -z "$branch" ]] || { echo "usage: cleanup-merged.sh [--dry-run] <branch>" >&2; exit 2; }; branch="$arg" ;;
  esac
done
[[ -n "$branch" ]] || { echo "usage: cleanup-merged.sh [--dry-run] <branch>" >&2; exit 2; }

refuse() { echo "refuse: $*" >&2; exit 1; }
note() { echo "check: $*"; }
act() {
  if ((dry_run)); then echo "would run: $*"; else echo "run: $*"; "$@"; fi
}

git rev-parse --git-dir >/dev/null 2>&1 || refuse "not inside a git repository"
tip="$(git rev-parse --verify --quiet "refs/heads/$branch^{commit}")" || refuse "no local branch $branch"

main_wt="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
git_main() { git -C "$main_wt" "$@"; }

default_ref="$(git_main symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)"
default_branch="${default_ref#origin/}"
[[ "$branch" != "$default_branch" ]] || refuse "$branch is the default branch"

# A rebase or bisect detaches HEAD, so `git worktree list` stops naming the
# branch while that worktree still needs it. Refuse when any worktree records the
# branch as its rebase or bisect start, or as a stacked branch its rebase will
# update. Each worktree's admin dir answers this
# even when the worktree directory itself is missing.
refuse_if_in_progress() {
  local common admin wt path state
  common="$(git_main rev-parse --path-format=absolute --git-common-dir)"
  for admin in "$common" "$common"/worktrees/*; do
    [[ -d "$admin" ]] || continue
    wt="$main_wt"
    if [[ "$admin" != "$common" ]]; then
      wt="$admin"
      [[ ! -f "$admin/gitdir" ]] || wt="$(dirname "$(<"$admin/gitdir")")"
    fi
    for state in rebase-merge/head-name rebase-apply/head-name BISECT_START; do
      path="$(git --git-dir="$admin" rev-parse --path-format=absolute --git-path "$state")" ||
        refuse "cannot check worktree $wt for an in-progress rebase or bisect"
      [[ -f "$path" ]] || continue
      case "$(<"$path")" in
        "refs/heads/$branch" | "$branch") refuse "worktree $wt has a ${state%%/*} in progress on $branch; finish or abort it first" ;;
      esac
    done
    # `rebase --update-refs` lists every stacked branch it will move, one ref per line.
    path="$(git --git-dir="$admin" rev-parse --path-format=absolute --git-path rebase-merge/update-refs)" ||
      refuse "cannot check worktree $wt for an in-progress rebase"
    if [[ -f "$path" ]] && grep -qFx "refs/heads/$branch" "$path"; then
      refuse "worktree $wt has a stacked rebase in progress that will update $branch; finish or abort it first"
    fi
  done
}
refuse_if_in_progress

# A branch checked out nowhere has no worktree to own or clean, so only the
# merge proof and the pinned-tip branch deletion below apply.
branch_wt=""
worktrees="$(git_main worktree list --porcelain)"
if ! grep -qFx "branch refs/heads/$branch" <<<"$worktrees"; then
  note "$branch is not checked out in any worktree; skipping the ownership and clean checks"
else
  # Worktrunk owns a worktree only when `wt list` reports it at the path its
  # worktree-path template gives the branch; anything else belongs to a host,
  # app, or person.
  listing="$(wt -C "$main_wt" list --format=json)" || refuse "wt list failed; cannot prove $branch is agent-owned"
  item="$(jq -c --arg b "$branch" '[.items[] | select(.branch == $b and .worktree != null)]' <<<"$listing")" ||
    refuse "cannot parse wt list output"
  case "$(jq length <<<"$item")" in
    0) refuse "git lists a worktree for $branch but wt list does not; cannot prove it is agent-owned" ;;
    1) ;;
    *) refuse "$branch is checked out in more than one worktree" ;;
  esac
  branch_wt="$(jq -r '.[0].worktree.path // ""' <<<"$item")"
  [[ -n "$branch_wt" ]] || refuse "wt list gives no worktree path for $branch"
  [[ "$(jq -r '.[0].worktree.main' <<<"$item")" != true ]] || refuse "$branch is checked out in the main worktree $branch_wt"
  [[ "$(jq -r '.[0].worktree.duplicate_branch' <<<"$item")" == false ]] ||
    refuse "$branch is checked out in more than one worktree"
  [[ "$(jq -r '.[0].worktree.branch_mismatch' <<<"$item")" == false ]] ||
    refuse "$branch_wt is not at the Worktrunk worktree-path for $branch (host-, app-, or person-owned)"
  [[ -d "$branch_wt" ]] ||
    refuse "worktree directory $branch_wt is missing; inspect it and run git worktree prune yourself if the work is safe to drop"
  dirty="$(git -C "$branch_wt" status --porcelain --untracked-files=all)"
  [[ -z "$dirty" ]] || refuse "$branch_wt has uncommitted or untracked files:"$'\n'"$dirty"
  note "worktree $branch_wt is clean and Worktrunk-owned"
fi

git_main fetch --quiet origin || refuse "git fetch origin failed; cannot verify merge state"

# Merged means a merged PR whose head contains the local tip, or the tip is
# already in the default branch. Later local commits block cleanup.
# gh encodes the query fields; -F (not -f) fills the {owner} placeholder.
merged=""
if pr_heads="$(cd "$main_wt" && gh api -X GET "repos/{owner}/{repo}/pulls" -F "head={owner}:$branch" \
  -f state=closed -f per_page=100 --jq '.[] | select(.merged_at != null) | "\(.number) \(.head.sha)"' 2>/dev/null)"; then
  while read -r number sha; do
    [[ -n "$sha" ]] || continue
    if ! git_main cat-file -e "$sha^{commit}" 2>/dev/null; then
      git_main fetch --quiet origin "refs/pull/$number/head" 2>/dev/null || note "cannot fetch PR #$number head $sha"
    fi
    if git_main merge-base --is-ancestor "$tip" "$sha" 2>/dev/null; then
      merged="PR #$number merged"
      break
    fi
  done <<<"$pr_heads"
else
  note "gh api lookup failed; using ancestry only"
fi
if [[ -z "$merged" ]] && git_main merge-base --is-ancestor "$tip" "$default_ref" 2>/dev/null; then
  merged="$branch is an ancestor of $default_ref"
fi
[[ -n "$merged" ]] || refuse "$branch is not merged: no merged PR contains its tip and it is not in $default_ref"
note "$merged"

# Every check above judged $tip; refuse if the branch moved since. $kept says
# what that refusal leaves behind.
kept="nothing was removed"
recheck_tip() {
  local now
  now="$(git_main rev-parse --verify --quiet "refs/heads/$branch" || echo deleted)"
  [[ "$now" == "$tip" ]] || refuse "$branch moved after its checks (was $tip, now $now); $kept"
}

# Removes the worktree through wt, relying on persisted hook approvals.
remove_worktree() {
  local cmd=(wt -C "$main_wt" remove "$branch" --no-delete-branch --foreground) out
  if ((dry_run)); then echo "would run: ${cmd[*]}"; return; fi
  echo "run: ${cmd[*]}"
  if ! out="$("${cmd[@]}" </dev/null 2>&1)"; then
    if grep -qe 'needs approval' -e 'Cannot prompt for approval' <<<"$out"; then
      refuse "wt remove stopped on an unapproved project hook, so nothing was removed. List the hooks with \`wt -C $main_wt config approvals list\`, approve the ones you trust with \`wt -C $main_wt config approvals add\`, then run cleanup again"
    fi
    refuse "wt remove failed:"$'\n'"$out"
  fi
  [[ -z "$out" ]] || printf '%s\n' "$out"
}

recheck_tip
refuse_if_in_progress
if [[ -n "$branch_wt" ]]; then
  remove_worktree
  kept="its worktree $branch_wt is gone, and the branch kept its new commits"
  ((dry_run)) || recheck_tip
fi
[[ -n "$branch_wt" ]] || kept="the branch kept its new commits"
act git -C "$main_wt" update-ref -d "refs/heads/$branch" "$tip" ||
  refuse "$branch moved during cleanup (was $tip); $kept"
if git_main config --get "branch.$branch.remote" >/dev/null || git_main config --get "branch.$branch.merge" >/dev/null; then
  act git -C "$main_wt" config --remove-section "branch.$branch"
fi
# Drop the remote-tracking ref only when origin answers that the branch is gone
# (ls-remote exit 2); a network or auth failure keeps it.
if git_main show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  rc=0
  git_main ls-remote --exit-code origin "refs/heads/$branch" >/dev/null 2>&1 || rc=$?
  if ((rc == 2)); then
    act git -C "$main_wt" update-ref -d "refs/remotes/origin/$branch"
  elif ((rc != 0)); then
    echo "skip: git ls-remote origin failed (exit $rc); kept refs/remotes/origin/$branch"
  fi
fi

main_branch="$(git_main symbolic-ref --quiet --short HEAD || true)"
if [[ "$main_branch" != "$default_branch" ]]; then
  echo "skip: main checkout $main_wt is on ${main_branch:-detached HEAD}, not $default_branch"
elif [[ -n "$(git_main status --porcelain --untracked-files=no)" ]]; then
  echo "skip: main checkout $main_wt has uncommitted changes"
elif ((dry_run)); then
  echo "would run: git -C $main_wt pull --ff-only --quiet"
else
  echo "run: git -C $main_wt pull --ff-only --quiet"
  if ! ff_err="$(git_main pull --ff-only --quiet 2>&1)"; then
    echo "skip: fast-forward failed: ${ff_err//$'\n'/ }"
  fi
fi
echo "done: $branch"
