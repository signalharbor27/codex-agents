#!/usr/bin/env bash
# Records a completed review of the committed HEAD tree and prints the record path.
# Usage: record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n>
#          [--door one-way|two-way --blast-radius localized|service|customers|data] [--copy-humanized]
# Run it from the reviewed checkout; <rev> is the full object id of the commit (or
# tree) the reviewers read, and its tree must equal HEAD's.
set -euo pipefail

usage() {
  echo "usage: record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n> [--door one-way|two-way --blast-radius localized|service|customers|data] [--copy-humanized]" >&2
  exit 2
}
bad() {
  echo "record-review: $1" >&2
  exit 2
}

[[ $# -ge 1 && "$1" != -* ]] || usage
base_ref="$1"
shift
reviewed=""
reviewers=""
open_findings=""
door=""
blast_radius=""
copy_humanized="n/a"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --reviewed) [[ $# -ge 2 ]] || usage; reviewed="$2"; shift 2 ;;
    --reviewers) [[ $# -ge 2 ]] || usage; reviewers="$2"; shift 2 ;;
    --open-findings) [[ $# -ge 2 ]] || usage; open_findings="$2"; shift 2 ;;
    --door) [[ $# -ge 2 ]] || usage; door="$2"; shift 2 ;;
    --blast-radius) [[ $# -ge 2 ]] || usage; blast_radius="$2"; shift 2 ;;
    --copy-humanized) copy_humanized="yes"; shift ;;
    *) usage ;;
  esac
done

case "$(git rev-parse --show-object-format 2>/dev/null)" in
  sha256) sha_len=64 ;;
  *) sha_len=40 ;;
esac
[[ "$reviewed" =~ ^[0-9a-f]+$ && ${#reviewed} -eq $sha_len ]] ||
  bad "--reviewed needs the full ${sha_len}-character lowercase hex object id of the commit or tree the reviewers read, not a ref or short sha (got '${reviewed}'); commit the reviewed snapshot and pass its sha from git rev-parse HEAD"
[[ "$reviewers" =~ ^[a-z_]+(,[a-z_]+)*$ ]] ||
  bad "--reviewers needs comma-separated role names such as reviewer,fast_reviewer"
[[ "$open_findings" =~ ^[0-9]{1,9}$ ]] || bad "--open-findings needs a non-negative integer of at most 9 digits"
[[ -z "$door" || "$door" =~ ^(one-way|two-way)$ ]] || bad "--door must be one-way or two-way"
[[ -z "$blast_radius" || "$blast_radius" =~ ^(localized|service|customers|data)$ ]] ||
  bad "--blast-radius must be localized, service, customers, or data"
if [[ -n "$door" && -z "$blast_radius" ]] || [[ -z "$door" && -n "$blast_radius" ]]; then
  bad "--door and --blast-radius go together"
fi

if ! git diff --quiet HEAD --; then
  echo "record-review: commit the reviewed state first; tracked files differ from HEAD" >&2
  exit 1
fi
base="$(git rev-parse --verify --quiet "${base_ref}^{commit}")" || {
  echo "record-review: cannot resolve base ref ${base_ref}" >&2
  exit 1
}
case "$(git cat-file -t "$reviewed" 2>/dev/null)" in
  commit | tree) reviewed_tree="$(git rev-parse --verify --quiet "${reviewed}^{tree}")" ;;
  *)
    echo "record-review: ${reviewed} is not a commit or tree in this repository; commit the reviewed snapshot and pass its sha" >&2
    exit 1
    ;;
esac
head="$(git rev-parse HEAD)"
tree="$(git rev-parse 'HEAD^{tree}')"
if [[ "$reviewed_tree" != "$tree" ]]; then
  echo "record-review: reviewed commit ${reviewed} (tree ${reviewed_tree}) is not this checkout's HEAD tree ${tree}; run from the reviewed checkout or review HEAD" >&2
  exit 1
fi

json_or_null() { if [[ -n "$1" ]]; then printf '"%s"' "$1"; else printf null; fi; }
dir="$(git rev-parse --path-format=absolute --git-common-dir)/agent-review"
roles="\"${reviewers//,/\",\"}\""
reviewed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$dir"
record="$dir/$tree.json"
tmp="$(mktemp "$dir/.record.XXXXXX")"
printf '{"tree":"%s","head":"%s","base":"%s","reviewed_at":"%s","reviewers":[%s],"open_findings":%d,"copy_humanized":"%s","door":%s,"blast_radius":%s}\n' \
  "$tree" "$head" "$base" "$reviewed_at" "$roles" "$((10#$open_findings))" "$copy_humanized" \
  "$(json_or_null "$door")" "$(json_or_null "$blast_radius")" >"$tmp"
mv "$tmp" "$record"
echo "$record"
