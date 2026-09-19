# Agent profile and oracle routing checks, 2026-09-19

All seven agent descriptions state invocation conditions. Oracle selection has
concrete risk triggers in the review skill. Profile models and effort are pinned
in `agents/*.toml`; the saved main-chat default is Astra/high.

## Evidence

- Codex CLI 0.154.0; Bun 1.3.14. Routing calls used `gpt-6-astra` / `high`.
- 79 unit tests passed, including missing oracle selection, unnecessary oracle
  selection, progressive follow-up scope, and profile provenance negatives.
- Skill surface checks, TOML parsing, and diff whitespace checks passed.
- Six selected live routing cases passed: tenant access, charge retries,
  mixed-version migration, unresolved review disagreement, billing copy, and
  a routine small review. The four risk cases selected oracle review; the two
  near negatives kept review local. The disagreement case preserved delta scope.
- An independent review covered the profiles, workflow rules, installation, and
  eval changes. Accepted fixes received focused checks and delta review.

Initial live results failed three strict reference-path checks. Two used the
wrong path prefix. The migration case also encountered a schema that excluded
the data skill's actual root-level Markdown references and emitted a placeholder.
The schema and prompt now specify exact skills-root-relative paths. The migration
fixture includes its applicable data guidance. Invented paths still fail.
Those three cases passed fresh runs; the three initially passing results also
passed the final judge. Original failures remain in the local evidence directory.

## Global profile activation

The initial fresh CLI smoke selected `oracle_reviewer` but spawning failed with
`agent type is currently not available`. Codex 0.154.0 discovers individual
profile symlinks, then rejects them during activation with `O_NOFOLLOW`.
The same open flags failed on a file symlink and succeeded through a directory
symlink containing regular TOMLs.

After linking `~/.codex/agents` to the repository's agent directory, a fresh smoke
selected and spawned `oracle_reviewer` with a fresh brief and no model/effort
overrides. Its independent payment-retry review completed. The global AGENTS link
still resolves to the repository. The old agent directory and config were backed
up. Installer checks preserved both ordinary and hidden unrelated profiles.

## Limits

Routing classifications measure intended selection. The native smoke requested
one independent review and left the role choice to the model; it does not measure
unprompted delegation frequency or general review quality. Its response did not
expose the child's effective model/effort. Those settings were checked in the
loaded profile files, rather than measured from inference telemetry.

Ambient global discovery was not isolated. These are selected observations,
without a paired baseline or statistical improvement claim. Local transcripts,
initial failures, and check output are in `/tmp/codex-agent-routing-t5H3ap`.
