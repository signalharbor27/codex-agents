#!/usr/bin/env python3
"""Turn agent session logs into bounded retro digests.

Reads top-level session JSONL from a Claude-style projects root and a Codex
sessions root, keeps events inside the window, and writes `index.tsv` plus one
`sNNN.md` digest per session, replacing digests from an earlier run in the
same directory. Python standard library only; streams line by
line so large logs stay within the memory cap.

Errors count only explicit failure signals: `is_error` tool results, nonzero
exit codes in tool-output headers or executor result envelopes, failed exec
scripts, and error events. Hook hits count only explicit deny or block messages.
"""

import argparse
import calendar
import collections
import json
import os
import re
import sys
import time

SKIP_USER = re.compile(
    r"^(<system-reminder>|<local-command|<task-notification>|<command-name>/(clear|compact|model|exit)"
    r"|Caveat:|\[Request interrupted|# AGENTS\.md instructions|<environment_context>"
    r"|<user_instructions>|<turn_aborted>|<subagent_notification>)"
)
# Claude hook and harness blocks: anchored at the start of the tool result so
# command output that merely mentions "hook" or "denied" never matches.
CLAUDE_HOOK = re.compile(
    r"^(?:(?:PreToolUse|PostToolUse|UserPromptSubmit|Stop|SubagentStop)(?::\S+)? hook\b"
    r"|<tool_use_error>Blocked:|Hook \S+ (?:denied|blocked)|Permission to use \S+ .*has been denied)"
)
CODEX_POLICY_REJECT = re.compile(r"` rejected: ([^\"\\]{1,200})")
HEADER_EXIT = re.compile(r"^(?:Process exited with code|Exit code:)\s*(-?\d+)\s*$", re.M)
MAX_USER = 500
MAX_ERRORS = 60
MAX_HOOKS = 40


def text_of(content):
    if isinstance(content, str):
        return content
    out = []
    for part in content or []:
        if isinstance(part, dict) and part.get("type") in ("text", "input_text", "output_text"):
            out.append(part.get("text", ""))
    return "\n".join(out)


def trunc(s, n=1200):
    s = (s or "").strip()
    return s if len(s) <= n else s[:n] + " …[+%d]" % (len(s) - n)


def one_line(s, n):
    return trunc(s, n).replace("\n", " ")


def tool_name(name):
    name = name or "?"
    if name.startswith("mcp__"):
        name = name.split("__")[-1]
        name = re.sub(r"^[a-z]+_(?=[A-Z])", "", name)
    return name


class Session:
    def __init__(self, src, path):
        self.src = src
        self.path = path
        self.title = ""
        self.cwd = ""
        self.start = None
        self.end = None
        self.user = []
        self.user_dropped = 0
        self.last_user_rep = None
        self.tools = collections.Counter()
        self.skills = collections.Counter()
        self.agents = collections.Counter()
        self.errors = []
        self.nerr = 0
        self.hooks = []
        self.nhooks = 0
        self.nudges = 0
        self.interrupts = 0
        self.compactions = 0
        self.bytes = os.path.getsize(path)

    def seen(self, ts):
        self.start = self.start or ts
        self.end = ts

    def add_user(self, ts, line, msg, rep=None):
        """Record a user message; `rep` is (kind, turn_id) for Codex events.

        Codex can log one prompt as both a `user_message` and a completed
        `UserMessage` item. Only that pair collapses: a different kind of the
        same text in the same turn, or in the same second when a turn id is
        missing. A repeated message at another time is a new entry.
        """
        last, self.last_user_rep = self.last_user_rep, rep and (rep[0], rep[1], ts, trunc(msg))
        if rep and last and last[0] != rep[0] and last[3] == trunc(msg):
            same_turn = last[1] == rep[1] if last[1] and rep[1] else last[2][:19] == ts[:19]
            if same_turn:
                self.last_user_rep = None
                return
        if len(self.user) < MAX_USER:
            self.user.append((ts, line, trunc(msg)))
        else:
            self.user_dropped += 1

    def add_error(self, ts, line, label, text):
        self.nerr += 1
        if len(self.errors) < MAX_ERRORS:
            self.errors.append((ts, line, "%s: %s" % (label, one_line(text, 300))))

    def add_hook(self, ts, line, label, text):
        self.nhooks += 1
        if len(self.hooks) < MAX_HOOKS:
            self.hooks.append((ts, line, "%s: %s" % (label, one_line(text, 400))))

    def active(self):
        return self.start is not None


def iter_jsonl(path):
    with open(path, errors="replace") as handle:
        for lineno, line in enumerate(handle, 1):
            try:
                record = json.loads(line)
            except (ValueError, MemoryError):
                continue
            if isinstance(record, dict):
                yield lineno, record


def in_window(ts, since, until):
    return bool(ts) and ts >= since and (until is None or ts < until)


def parse_claude(path, since, until):
    s = Session("claude", path)
    names = {}
    last_ts = None
    for lineno, d in iter_jsonl(path):
        t = d.get("type")
        if t == "ai-title":
            s.title = d.get("aiTitle", "") or s.title
        elif t == "summary" and not s.title:
            s.title = d.get("summary", "")
        last_ts = d.get("timestamp") or last_ts
        if not in_window(last_ts, since, until):
            continue
        ts = last_ts
        s.seen(ts)
        if d.get("cwd"):
            s.cwd = d["cwd"]
        # One compaction writes a compact_boundary plus a summary user record.
        if t == "system" and d.get("subtype") == "compact_boundary":
            s.compactions += 1
        if t == "attachment":
            att = d.get("attachment") or {}
            if att.get("type") == "hook_blocking_error":
                err = att.get("blockingError") or {}
                s.add_hook(ts, lineno, "%s hook" % att.get("hookEvent", "?"), err.get("blockingError", "") if isinstance(err, dict) else str(err))
            elif att.get("type") == "hook_additional_context":
                s.nudges += 1
        if t == "assistant":
            for part in (d.get("message") or {}).get("content") or []:
                if isinstance(part, dict) and part.get("type") == "tool_use":
                    name = tool_name(part.get("name"))
                    names[part.get("id")] = name
                    s.tools[name] += 1
                    args = part.get("input") or {}
                    if name == "Skill":
                        s.skills[args.get("skill") or "?"] += 1
                    if name in ("Agent", "Task"):
                        s.agents[args.get("subagent_type") or "general"] += 1
        if t != "user" or any(d.get(flag) for flag in ("isSidechain", "isMeta", "isCompactSummary", "isVisibleInTranscriptOnly")):
            continue
        content = (d.get("message") or {}).get("content")
        results = [x for x in content if isinstance(x, dict) and x.get("type") == "tool_result"] if isinstance(content, list) else []
        for result in results:
            body = text_of(result.get("content"))
            if "Request interrupted" in body or "user doesn't want to proceed" in body:
                s.interrupts += 1
            if result.get("is_error"):
                label = names.get(result.get("tool_use_id"), "?")
                if CLAUDE_HOOK.match(body.lstrip()):
                    s.add_hook(ts, lineno, label, body)
                else:
                    s.add_error(ts, lineno, label, body)
        if results:
            continue
        msg = text_of(content)
        if "Request interrupted" in msg:
            s.interrupts += 1
        if msg.strip() and not SKIP_USER.match(msg.strip()):
            s.add_user(ts, lineno, msg)
    return s


def codex_output_text(output):
    if isinstance(output, str):
        return output
    return text_of(output)


SETTLED_INDEX_KEYS = {"i", "index", "task"}


def executor_exit_code(obj):
    """Return the exit code of an executor result envelope, else None.

    Envelopes are an exec_command result (`chunk_id` and `wall_time_seconds`),
    the legacy shell result (`output` plus `metadata.exit_code` and
    `metadata.duration_seconds`), or either wrapped in a fulfilled
    Promise.allSettled record. Any other JSON is command output.
    """
    if not isinstance(obj, dict):
        return None
    keys = set(obj) - SETTLED_INDEX_KEYS
    if keys == {"result"}:
        return executor_exit_code(obj["result"])
    if keys == {"status", "value"} and obj["status"] == "fulfilled":
        return executor_exit_code(obj["value"])
    if "chunk_id" in obj and "wall_time_seconds" in obj:
        code = obj.get("exit_code")
    else:
        meta = obj.get("metadata")
        is_shell = "output" in obj and isinstance(meta, dict) and "duration_seconds" in meta
        code = meta.get("exit_code") if is_shell else None
    return code if isinstance(code, int) and not isinstance(code, bool) else None


def codex_exit_codes(output):
    """Yield exit codes from tool headers and executor envelopes, never from command output."""
    parts = [output] if isinstance(output, str) else [p.get("text", "") for p in output or [] if isinstance(p, dict)]
    for part in parts:
        # Only a tool header (text before "Output:") carries the process exit code.
        header = part.split("\nOutput:", 1)[0][:400] if "\nOutput:" in part else ""
        for match in HEADER_EXIT.finditer(header):
            yield int(match.group(1))
        stripped = part.strip()
        if not stripped.startswith("{"):
            continue
        try:
            code = executor_exit_code(json.loads(stripped))
        except ValueError:
            continue
        if code is not None:
            yield code


def parse_codex(path, since, until, include_automated):
    meta = None
    for _, first in iter_jsonl(path):
        meta = first.get("payload") or {}
        break
    if meta is None:
        return None, False
    automated = meta.get("originator") == "codex_exec" or not isinstance(meta.get("source"), str)
    if automated and not include_automated:
        return None, True
    s = Session("codex:%s" % meta.get("originator"), path)
    meta_cwd = meta.get("cwd", "")
    calls = {}
    for lineno, d in iter_jsonl(path):
        ts = d.get("timestamp")
        if not in_window(ts, since, until):
            continue
        s.seen(ts)
        t = d.get("type")
        p = d.get("payload") or {}
        pt = p.get("type")
        if t == "compacted":
            s.compactions += 1
        if t == "turn_context" and p.get("cwd"):
            s.cwd = p["cwd"]
        if t == "event_msg":
            item = p.get("item") or {}
            if pt == "user_message" or (pt == "item_completed" and item.get("type") == "UserMessage"):
                msg = p.get("message") or text_of(item.get("content"))
                if msg and msg.strip() and not SKIP_USER.match(msg.strip()):
                    s.add_user(ts, lineno, msg, (pt, p.get("turn_id")))
            elif pt == "turn_aborted":
                s.interrupts += 1
            elif pt == "error":
                s.add_error(ts, lineno, "event", p.get("message", ""))
        if t != "response_item":
            continue
        if pt in ("function_call", "custom_tool_call"):
            name = p.get("name") or "?"
            args = p.get("arguments") or p.get("input") or ""
            if not isinstance(args, str):
                args = json.dumps(args)
            nested = re.findall(r"tools\.(\w+)\(", args) if name == "exec" else []
            for tool in nested or [name]:
                s.tools[tool] += 1
            calls[p.get("call_id")] = nested[0] if nested else name
            if "spawn_agent" in name or "spawn_agent" in args:
                s.agents["spawn"] += 1
            for skill in set(re.findall(r"skills/([\w-]+)/SKILL\.md", args)):
                s.skills[skill] += 1
        elif pt in ("function_call_output", "custom_tool_call_output"):
            output = p.get("output")
            body = codex_output_text(output)
            label = calls.get(p.get("call_id"), "?")
            if body.startswith("Script failed"):
                detail = body.split("Script error:", 1)[-1]
                reject = CODEX_POLICY_REJECT.search(detail)
                if reject:
                    s.add_hook(ts, lineno, label, "rejected: " + reject.group(1))
                else:
                    s.add_error(ts, lineno, label, detail)
                continue
            codes = [code for code in codex_exit_codes(output) if code != 0]
            if codes:
                tail = body.split("\nOutput:", 1)[-1]
                s.add_error(ts, lineno, "%s exit %d" % (label, codes[0]), tail)
    s.cwd = s.cwd or meta_cwd
    return s, False


def walk_jsonl(root, top_level_only, since_epoch):
    """Yield JSONL paths modified since the window start.

    With top_level_only, read only <root>/<project>/<session>.jsonl; deeper
    files are subagent rollouts of those sessions.
    """
    root = os.path.expanduser(root)
    if not os.path.isdir(root):
        return
    for directory, subdirs, files in os.walk(root):
        depth = 0 if directory == root else os.path.relpath(directory, root).count(os.sep) + 1
        if top_level_only and depth >= 1:
            subdirs[:] = []
        if top_level_only and depth != 1:
            continue
        for name in sorted(files):
            if not name.endswith(".jsonl"):
                continue
            path = os.path.join(directory, name)
            try:
                if os.path.getmtime(path) >= since_epoch:
                    yield path
            except OSError:
                continue


def parse_date(date):
    """Return (YYYY-MM-DD, epoch); the padded form compares correctly with ISO timestamps."""
    parsed = time.strptime(date, "%Y-%m-%d")
    return time.strftime("%Y-%m-%d", parsed), calendar.timegm(parsed)


def short_cwd(cwd):
    home = os.path.expanduser("~")
    return cwd.replace(home + "/projects/", "").replace(home, "~")


DIGEST_NAME = re.compile(r"s\d+\.md")


def write_outputs(sessions, out):
    os.makedirs(out, exist_ok=True)
    # Drop digests from an earlier run so a smaller window leaves no stale sNNN.md.
    for name in os.listdir(out):
        if DIGEST_NAME.fullmatch(name):
            os.remove(os.path.join(out, name))
    columns = ["id", "src", "start", "end", "kb", "user_msgs", "tool_calls", "tool_errors", "hook_hits", "interrupts", "compactions", "cwd", "title"]
    with open(os.path.join(out, "index.tsv"), "w") as w:
        w.write("\t".join(columns) + "\n")
        for i, s in enumerate(sessions):
            title = s.title[:60] or (one_line(s.user[0][2], 80) if s.user else "")
            row = ["s%03d" % i, s.src, (s.start or "")[:16], (s.end or "")[:16], s.bytes // 1000, len(s.user) + s.user_dropped,
                   sum(s.tools.values()), s.nerr, s.nhooks, s.interrupts, s.compactions, short_cwd(s.cwd), title.replace("\t", " ")]
            w.write("\t".join(map(str, row)) + "\n")
    for i, s in enumerate(sessions):
        with open(os.path.join(out, "s%03d.md" % i), "w") as w:
            w.write("# s%03d %s %s\n" % (i, s.src, s.title))
            w.write("file: %s\ncwd: %s\nspan: %s → %s\n" % (s.path, s.cwd, s.start, s.end))
            w.write("compactions: %d interrupts: %d tool_errors: %d hook_hits: %d hook_nudges: %d\n" % (s.compactions, s.interrupts, s.nerr, s.nhooks, s.nudges))
            w.write("tools: %s\nskills: %s\nagents: %s\n" % (dict(s.tools.most_common(15)), dict(s.skills), dict(s.agents)))
            w.write("\nEntries cite `L<n>`, the raw-log line number; read around it with `sed -n '<n>p' <file> | cut -c1-2000`.\n")
            w.write("\n## User messages\n")
            for ts, line, msg in s.user:
                w.write("\n### %s L%d\n%s\n" % (ts, line, msg))
            if s.user_dropped:
                w.write("\n(%d later user messages omitted)\n" % s.user_dropped)
            w.write("\n## Hook and guard blocks\n")
            w.write("".join("- %s L%d %s\n" % entry for entry in s.hooks))
            w.write("\n## Tool errors (first %d of %d)\n" % (len(s.errors), s.nerr))
            w.write("".join("- %s L%d %s\n" % entry for entry in s.errors))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--since", required=True, help="window start, YYYY-MM-DD (UTC, inclusive)")
    parser.add_argument("--until", help="window end, YYYY-MM-DD (UTC, exclusive)")
    parser.add_argument("--out", required=True, help="digest directory")
    parser.add_argument("--claude-root", default="~/.claude/projects")
    parser.add_argument("--codex-root", default="~/.codex/sessions")
    parser.add_argument("--include-automated", action="store_true", help="keep codex exec and subagent rollouts")
    parser.add_argument("--max-mem-mb", type=int, default=2048, help="address-space cap; 0 disables")
    args = parser.parse_args(argv)
    if args.max_mem_mb:
        try:
            import resource
            cap = args.max_mem_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (cap, cap))
        except (ImportError, ValueError, OSError):
            pass
    try:
        args.since, since_epoch = parse_date(args.since)
        if args.until:
            args.until = parse_date(args.until)[0]
    except ValueError as err:
        parser.error("--since/--until need YYYY-MM-DD: %s" % err)
    sessions = []
    skipped = 0
    for path in walk_jsonl(args.claude_root, True, since_epoch):
        s = parse_claude(path, args.since, args.until)
        if s.active():
            sessions.append(s)
    for path in walk_jsonl(args.codex_root, False, since_epoch):
        s, was_automated = parse_codex(path, args.since, args.until, args.include_automated)
        skipped += was_automated
        if s is not None and s.active():
            sessions.append(s)
    sessions.sort(key=lambda s: s.start or "")
    write_outputs(sessions, os.path.expanduser(args.out))
    print("sessions=%d automated_skipped=%d errors=%d hook_hits=%d out=%s" % (
        len(sessions), skipped, sum(s.nerr for s in sessions), sum(s.nhooks for s in sessions), args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
