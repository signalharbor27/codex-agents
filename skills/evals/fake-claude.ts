// Test double for the `claude` executable: a script on PATH that records what the harness sent
// (argv, stdin, cwd and its entries, env, and every file under each --add-dir) and prints a
// successful `--output-format json --verbose` result carrying the given structured output.
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SCRIPT = `#!/usr/bin/env bash
set -euo pipefail
log="$FAKE_CLAUDE_DIR"
printf '%s\\0' "$@" > "$log/argv"
cat > "$log/stdin"
pwd > "$log/cwd"
ls -A > "$log/cwd-entries"
env -0 > "$log/env"
: > "$log/add-dirs"
: > "$log/files"
previous=""
for arg in "$@"; do
  if [[ "$previous" == "--add-dir" ]]; then
    printf '%s\\n' "$arg" >> "$log/add-dirs"
    find "$arg" -type f >> "$log/files"
  fi
  previous="$arg"
done
cat "$log/response.json"
`

export type FakeClaudeLog = {
  argv: string[]
  stdin: string
  cwd: string
  cwdEntries: string[]
  env: Record<string, string>
  addDirs: string[]
  files: string[]
}

const lines = (text: string) => text.split("\n").filter(Boolean)

export async function withFakeClaude(structuredOutput: unknown, run: (log: () => Promise<FakeClaudeLog>) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "fake-claude-"))
  const saved = { ...process.env }
  try {
    await writeFile(join(dir, "claude"), SCRIPT)
    await chmod(join(dir, "claude"), 0o755)
    await writeFile(join(dir, "response.json"), JSON.stringify([
      { type: "system", subtype: "init", model: "fake", tools: ["Read", "Grep", "Glob"] },
      { type: "result", subtype: "success", is_error: false, result: "", structured_output: structuredOutput, total_cost_usd: 0 },
    ]))
    Object.assign(process.env, {
      PATH: `${dir}:${process.env.PATH ?? ""}`,
      FAKE_CLAUDE_DIR: dir,
      FAKE_PASSTHROUGH: "kept",
      CLAUDECODE: "1",
      CLAUDE_CODE_SESSION_ID: "parent-session",
    })
    const read = (name: string) => readFile(join(dir, name), "utf8")
    await run(async () => ({
      argv: (await read("argv")).split("\0").slice(0, -1),
      stdin: await read("stdin"),
      cwd: (await read("cwd")).trim(),
      cwdEntries: lines(await read("cwd-entries")),
      env: Object.fromEntries((await read("env")).split("\0").filter(Boolean).map(entry => {
        const at = entry.indexOf("=")
        return [entry.slice(0, at), entry.slice(at + 1)]
      })),
      addDirs: lines(await read("add-dirs")),
      files: lines(await read("files")),
    }))
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]
    Object.assign(process.env, saved)
    await rm(dir, { recursive: true, force: true })
  }
}
