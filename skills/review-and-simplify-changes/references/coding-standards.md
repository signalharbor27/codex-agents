# Coding standards

Apply these when judging a diff or proposing a standard. Each standard names what to flag, the fix, and where it stops applying. Judge code the diff adds or changes plus its direct effects; list pre-existing instances separately. Report a violation as a Standards finding that cites the standard's name, location, evidence, and fix.

## Repo extension

A `CODING_STANDARDS.md` at the repository root adds project rules or overrides these. Read it when present; when it conflicts with this file, the repo rule wins. Repo `AGENTS.md` conventions also count as Standards.

## Classify each finding

- **Mechanical**: a lint rule, type setting, grep, or test could detect it reliably, such as a test that reads source files, a re-asserted literal constant, `as any`, or an ownerless `TODO`. Report it with the suggested deterministic check so it stops recurring.
- **Reviewed**: only a reader of intent or design can detect it, such as module depth or whether a comment explains a why. Report it with evidence. A recurring reviewed finding becomes a rule in this file or the repo extension, since no check can carry it.
- This mechanical/reviewed axis is about detection. The separate `fix: clear|judgement` tag says whether the fix is settled enough for `refiner`; a reviewed finding can still have a clear fix.
- Name the standard behind every Standards finding. A preference that no standard covers belongs in synthesis as a proposed standard, not as a finding.

## Module design

Doctrine and sources live in `engineering/references/boundary-design.md`; read it when depth or ownership is disputed. Flag at diff level:

- **Shallow module**: a new function, class, file, service, or package whose interface is about as large as what it hides, or that serves one caller with little leverage. Apply the deletion test: if deleting it would move only a few lines and no policy into callers, it is shallow. Fix: inline it into the caller or the existing owner. Keep it when it hides policy, provider quirks, storage layout, or coordination, or protects a stable contract.
- **Pass-through layer**: a wrapper, re-export, adapter, or mapping type that forwards calls or copies fields unchanged. Fix: call the owner directly and drop the parallel type. Keep it when it enforces a trust, lifecycle, or compatibility boundary, such as parsing untrusted input once.
- **Hypothetical seam**: an interface, port, factory, injection point, or config option with one implementation. Fix: write the concrete code and add the seam when a second adapter arrives. Keep it when a second real adapter exists (a materially different test fake used by tests counts) or it hides real external complexity or policy variation.
- **Scattered invariant**: one rule, validation, constant, or mapping enforced in two places, or callers re-checking what the owner guarantees. Fix: give the invariant one owner and have callers ask it. Keep a second check at a separate trust boundary such as another process or an external input; similar syntax that encodes different knowledge is not duplication.
- **Lost locality**: following one behaviour means hopping through new one-use helpers or tiny files. Fix: keep use-case flow near its entrypoint; three clear lines beat a helper used once. Keep a helper that hides volatile protocol, storage, or coordination mechanics.

## Test lies

A test lies when it can pass while the behaviour it names is broken, or fails when behaviour is intact. Default fix: test through the module's public interface with real dependencies, fake only slow or uncontrollable edges (network, clock, randomness, third-party services), and take expected values from an independent oracle. Proof doctrine lives in `engineering/references/proof.md`; double selection in `test-design/references/test-selection.md`.

- **Tautological**: re-asserts a constant, config literal, or value computed by the same production code.
  `expect(MAX_RETRIES).toBe(3)` or `expect(total(cart)).toBe(cart.sum * TAX_RATE)`.
  Fix: delete it, or assert the behaviour the value drives (the fourth retry never runs) with a literal worked result. Keep a pin on a published contract consumers depend on, such as a protocol version or wire field name, when the test names that contract.
- **Structure-sensitive**: reads source text, asserts internal call order or private state, or snapshots implementation detail. It breaks on harmless refactors and passes real bugs.
  `expect(readFileSync("src/relay.ts", "utf8")).toMatch(/flush\(\)[\s\S]*ack\(/)`.
  Fix: assert the observable output or effect through the public interface. Keep it when the text is the product (generated files, published docs, migration SQL, a lint rule's fixtures) or the order is an external contract observed at a fake boundary.
- **Can't-fail**: stubs the unit's own risky dependency or the thing under test, or asserts something true of any implementation (`toBeDefined`, a lone `not.toThrow`, the mock returning what it was told).
  Stubbing `AudioContext` in a playback test, then asserting the stub was called.
  Fix: exercise the real dependency or a faithful fake, name a plausible broken implementation, and confirm the test rejects it. Keep doubles for an uncontrollable external edge when the test asserts the unit's own handling of the response.
- **Private-path**: reaches internals (helpers exported only for tests, casts to read private fields) while a public seam can observe the behaviour. Fix: test through that seam and un-export the helper. Keep it when no public seam observes the behaviour cheaply, or as a labelled characterization test while legacy code gains a seam.

Keep incident-regression and contract tests even when they look awkward; removal and replacement rules live in `engineering/references/proof.md`. A rewrite keeps the incident's failing input.

## Comments and stubs

A comment earns its place by telling the reader what the code cannot: a non-obvious why, an invariant, a contract, a legal notice, or a functional directive (a suppression with its reason, a negative type-test marker, a build pragma).

- Flag comments that restate the code (`// increment the counter`), narrate the change or its history ("now uses X instead of Y", "added for #412"), leave `TODO`/`FIXME` stubs without an owner or tracking link, pad with AI filler (section banners, "This function handles...", hedging), or repeat a signature as a docstring.
- When added comment lines approach added code lines, read every comment; one review passed about 180 such lines as "concise and accurate".
- Fix: delete the comment, or rewrite it as one line of why. Move change narration to the commit or PR text.
- Keep comments whose removal changes tool behaviour (suppressions, pragmas, negative type tests, doc generators) and published API docs. Uncertainty about a comment's purpose calls for a trace, not deletion.

Flag placeholder or stub code too: a body that returns a hard-coded or empty value in place of the behaviour its name promises, `throw new Error("not implemented")`, a bare `pass` or `unimplemented!()`, a sample payload in a production path, or a handler that only logs. Fix: implement the behaviour or remove the entrypoint. Keep a stub that a test double needs, or one an explicit, tracked staged rollout requires.

## Errors, fallbacks, and weak types

Detail lives in the weak-types, error-handling, and legacy/fallback topics of the eight-topic checklist in `review-and-simplify-changes/SKILL.md`. At diff level, flag a catch or fallback that hides a failure, a default that masks missing data, and `any` or casts where the real shape is known. Keep boundary handling for untrusted input, external systems, cleanup, retries, and user-safe errors.
