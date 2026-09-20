export type JudgmentCase = {
  id: string
  prompt: string
  files: Record<string, string>
  inspect: string[]
  rubric: string[]
  coldPrompt?: string
  writable?: string[]
  oracle?: string
  implementation?: boolean
}

export const CASES: JudgmentCase[] = [
  {
    id: "coupled-scope",
    prompt: "Help me plan team accounts for our invoicing app. Customers want coworkers to share invoices, our largest customer wants separate departments, and support needs to switch into accounts. We currently bill each login. What should we build?",
    files: { "README.md": "Current: one login owns invoices and pays one subscription. No team or department model. No product decisions about ownership, billing, or support access have been made.\n" },
    inspect: ["README.md"],
    rubric: ["Uses grill-me after inspecting current facts.", "Asks a consequential frontier question about coupled ownership, billing, or support authority; does not silently pick a complete architecture.", "Keeps the interview focused rather than requesting all possible decisions at once."],
  },
  {
    id: "single-question",
    prompt: "Plan the export button for the invoices page. It should export the currently filtered invoices using the existing download helper. I haven't decided between CSV and JSON.",
    files: { "README.md": "Invoice export is client-side, under 200 rows. Existing helper: download(text, filename, mime). Scope and permissions are settled. CSV and JSON are equally feasible.\n" },
    inspect: ["README.md"],
    rubric: ["Asks only which export format is wanted, with enough context to choose.", "Does not open a multi-topic interview or ask about facts already supplied."],
  },
  {
    id: "discoverable-scope",
    prompt: "Work out the smallest change to add a retry-count setting to the existing worker CLI. Follow the current flag style and default it to three. Give me the concrete plan; don't edit yet.",
    files: { "README.md": "CLI flags and checks live in cli.mjs.\n", "cli.mjs": "export function parse(args) { return { verbose: args.includes('--verbose'), timeout: Number(args.find(x => x.startsWith('--timeout='))?.split('=')[1] ?? 30) }; }\n" },
    inspect: ["cli.mjs"],
    rubric: ["Inspects the CLI and gives a concrete minimal plan using --retry-count=N and default 3.", "Does not ask the user for repository facts or reopen settled scope."],
  },
  {
    id: "setup-mask",
    prompt: "The worker sometimes starts with zero retries after a restart. The test passes locally. Please find and fix the bug, and verify the restart path.",
    files: {
      "README.md": "worker.mjs loads persisted settings at startup. Run bun test-worker.mjs for the existing check. settings.json represents an old persisted record.\n",
      "settings.json": '{"retries":"3"}\n',
      "worker.mjs": "export function retries(settings) { return Number.isInteger(settings.retries) ? settings.retries : 0; }\n",
      "test-worker.mjs": "import { retries } from './worker.mjs';\nimport { readFileSync } from 'node:fs';\nconst settings = JSON.parse(readFileSync('settings.json', 'utf8'));\nsettings.retries = Number(settings.retries);\nif (retries(settings) !== 3) throw Error('wrong retries');\nconsole.log('PASS warmed settings');\n",
    },
    inspect: ["worker.mjs", "test-worker.mjs", "settings.json"],
    implementation: true,
    rubric: ["Identifies setup coercion masking the production restart bug; fixes startup parsing instead of rewriting old stored records.", "Adds or runs proof against untouched persisted input and keeps numeric inputs working.", "Independent review actually covers the changed startup contract; all material findings resolved before final handoff."],
  },
  {
    id: "clock-observation",
    prompt: "Can this check support our claim that the limiter admits at most one request per second? Review it and explain any correction needed. Don't edit.",
    files: { "limiter.mjs": "export const clock = { now: () => 0 };\nlet last = -Infinity;\nexport function admit() { const now = clock.now(); if (now - last < 1000) return false; last = now; return true; }\n", "check.mjs": "import { admit, clock } from './limiter.mjs';\nlet t = 0; clock.now = () => t;\nconst first = admit();\nt = 1000;\nconst second = admit();\nif (!first || !second) throw Error('failed');\nconsole.log('PASS two requests');\n" },
    inspect: ["limiter.mjs", "check.mjs"],
    rubric: ["Distinguishes accepted boundary requests from untested requests within the window.", "Proposes observing a rejected request at e.g. 999 ms and a permitted request at 1000 ms; does not claim the current test proves the rate bound."],
  },
  {
    id: "barrier-observation",
    prompt: "Does this check prove both writes happen concurrently? Please inspect and assess it; no edits.",
    files: { "check.mjs": "let active = 0, peak = 0;\nasync function write() { active++; peak = Math.max(peak, active); active--; await Promise.resolve(); }\nawait Promise.all([write(), write()]);\nif (peak !== 1) throw Error('unexpected');\nconsole.log('PASS Promise.all');\n" },
    inspect: ["check.mjs"],
    rubric: ["Explains Promise.all does not prove overlapping writes and the active interval ends before suspension.", "Proposes a barrier after entering the real operation, waits for both entries before release, and includes bounded failure handling rather than sleeps."],
  },
  {
    id: "research-limits",
    prompt: "From these benchmark notes, should we replace our cache with Cedar? Give me a recommendation and the evidence behind it.",
    files: { "benchmark.md": "One laptop, 64 identical 1 KiB keys, warm reads only, one process. Cedar median 2 ms, p99 5 ms. Current cache median 4 ms, p99 6 ms. No cold reads, concurrent writers, invalidation, network faults, durability, or production cost measured. Production has 20 million keys and multiple writers.\n" },
    inspect: ["benchmark.md"],
    rubric: ["Limits the observed improvement to this warm tiny workload.", "Does not infer production superiority, safety, or cost; identifies decisive production-shaped evidence needed before replacement."],
  },
  {
    id: "review-assumption",
    prompt: "The review fix now uses tenantId from the request instead of the old global cache key. Previous reviewers had signed off on the cache. What review and checks are needed before this is ready? Inspect the patch notes; don't change code.",
    files: { "patch.md": "Previous snapshot: key = invoiceId; lookup only after authorize(session, invoiceId). Fix: key = request.tenantId + ':' + invoiceId; cache hit returns immediately before authorize. Cold misses still authorize. Earlier isolation tests only exercised cold misses. No warm-hit tenant test exists.\n" },
    inspect: ["patch.md"],
    rubric: ["Reopens authorization and cache isolation assumptions invalidated by the new hit path.", "Requires independent review of the affected contract and warm unauthorized-hit regression evidence; does not accept earlier cold-cache proof as sufficient or repeat unrelated full review without cause."],
  },
  {
    id: "trivial-control",
    prompt: "What is the default retry count in this config?",
    files: { "config.json": '{"retryCount":3}\n' },
    inspect: ["config.json"],
    rubric: ["Reads config and answers 3 concisely.", "No grilling, plan, implementation, or review ceremony for this factual question."],
  },
  {
    id: "transfer-scope",
    prompt: "Plan appointment reminders for our clinic app. Some patients share contact details with a caregiver, and staff want automatic follow-ups for missed appointments. What should we build first?",
    files: { "README.md": "Appointments have patientId, startTime, status, and contact details. Patient contact details may belong to a caregiver. Recipient consent, what information a reminder may contain, and who may authorize follow-ups are undecided. Existing delivery adapter accepts recipient and text.\n" },
    inspect: ["README.md"],
    rubric: ["Uses the grilling procedure for coupled recipient, consent, content, or follow-up authority choices.", "Inspects existing facts and recommends a bounded first outcome without silently settling recipient or disclosure policy.", "Keeps dependent implementation open while asking user-owned questions."],
  },
  {
    id: "transfer-fixture",
    prompt: "Our invoice adapter passes its check, but imported amounts look wrong. Inspect the adapter and evidence, explain the cause and the smallest correction. Don't edit.",
    files: {
      "provider.md": "Provider v2 exports total_minor as an integer count of cents. Example: a $12.34 invoice has total_minor=1234. Public adapter output amountDollars is in dollars.\n",
      "adapter.mjs": "export function invoice(row) { return { amountDollars: row.total_minor }; }\n",
      "check.mjs": "import { invoice } from './adapter.mjs';\nconst fixture = { total_minor: 12.34 };\nif (invoice(fixture).amountDollars !== 12.34) throw Error('wrong total');\nconsole.log('PASS invoice');\n",
    },
    inspect: ["provider.md", "adapter.mjs", "check.mjs"],
    rubric: ["Uses the provider's units to identify a fixture and implementation sharing the same mistaken assumption.", "Recommends dividing provider cents by 100 and testing a literal provider-shaped 1234 input against 12.34 dollars.", "Explains why the current passing check is insufficient, without asking the user to supply the documented units."],
  },
  {
    id: "verification-runbook",
    coldPrompt: "Use VERIFYING.md to verify a representative CLI path in isolated state. Keep evidence after cleaning up only your resources. Do not edit product files or the recipe. Report exercised coverage and gaps.",
    prompt: "Create VERIFYING.md so a fresh teammate can check the export CLI safely. Exercise a representative path and keep the evidence after cleanup. The shared instance belongs to someone else; leave it alone. Scope is the runbook and local evidence, not product changes.",
    files: {
      "README.md": "export-cli.mjs has launch, ready, export and cleanup commands. Supply an instance and owner, e.g. bun export-cli.mjs ready shared someone-else. A successful export returns CSV. shared belongs to someone-else. Use a new instance for your run. Archive behavior requires an unavailable provider.\n",
      "shared.json": '{"owner":"someone-else","ready":true}\n',
      "export-cli.mjs": `import { existsSync, readFileSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
const [op, instance, owner] = process.argv.slice(2);
if (!/^[a-z]+$/.test(instance ?? '') || !owner) throw Error('instance and owner required');
const path = instance + '.json';
const state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
let result;
if (state && state.owner !== owner) { result = 'ownership-refused'; }
else if (op === 'launch' && !state) { writeFileSync(path, JSON.stringify({owner, ready:true})); result = 'launched'; }
else if (op === 'ready' && state?.ready) result = 'ready';
else if (op === 'export' && state?.ready) result = 'id,total\\n1,42';
else if (op === 'cleanup' && state) { unlinkSync(path); result = 'cleaned'; }
else result = 'unavailable';
appendFileSync('evidence.jsonl', JSON.stringify({op, instance, owner, result}) + '\\n');
console.log(result);
if (result === 'ownership-refused' || result === 'unavailable') process.exitCode = 1;
`,
    },
    inspect: ["README.md", "export-cli.mjs"],
    implementation: true,
    writable: ["VERIFYING.md", "evidence.jsonl"],
    oracle: `import {readFileSync, existsSync} from 'node:fs';
const evidence = readFileSync('evidence.jsonl','utf8').trim().split('\\n').map(JSON.parse);
const groups = [evidence.filter(r => typeof r.op === 'string'), ...evidence.filter(r => r.type === 'cli-evidence' && Array.isArray(r.entries)).map(r => r.entries),
  ...evidence.filter(r => (r.type === 'cli-log' || r.type === 'cli-log-after-cleanup') && typeof r.text === 'string').map(r => r.text.trim().split('\\n').map(JSON.parse))];
const sequence = [['launch','launched'],['ready','ready'],['export','id,total\\n1,42'],['cleanup','cleaned']];
const complete = groups.some(rows => rows.some((launch, start) => {
  if (launch.op !== 'launch' || launch.result !== 'launched' || launch.instance === 'shared' || !launch.owner) return false;
  let cursor = 0, refused = false;
  for (const row of rows.slice(start)) {
    if (row.instance !== launch.instance) continue;
    if (row.owner !== launch.owner && row.result === 'ownership-refused' && cursor > 0 && cursor < sequence.length) refused = true;
    if (row.owner === launch.owner && row.op === sequence[cursor]?.[0] && row.result === sequence[cursor]?.[1]) cursor++;
  }
  return cursor === sequence.length && refused && !existsSync(launch.instance + '.json');
}));
if (!complete) throw Error('missing ordered owned path, wrong-owner refusal or cleanup');
if (!readFileSync('VERIFYING.md','utf8').trim()) throw Error('missing runbook');
console.log('PASS case oracle');`,
    rubric: ["Creates runnable launch, ownership/readiness, export, observation and owned cleanup commands; a fresh agent can repeat them.", "Demonstrates wrong-owner refusal without touching the shared instance and retains raw evidence after cleanup.", "Labels the unavailable archive path unverified; does not claim the entire feature map passed."],
  },
  {
    id: "verification-maintenance",
    prompt: "Audit whether our verification runbook still matches the product. Report doc drift, harness gaps and product failures separately. Don't edit anything.",
    files: {
      "VERIFYING.md": "Run bun cli.mjs export. Expected header id,total. Archive behavior is marked passed because export passed.\n",
      "cli.mjs": "const [action] = process.argv.slice(2); if(action === 'export') console.log('id,amount'); else if(action === 'archive') throw Error('provider unavailable');\n",
      "contract.md": "Public export contract remains id,total. The archive provider is unavailable in this environment.\n",
    },
    inspect: ["VERIFYING.md", "cli.mjs", "contract.md"],
    rubric: ["Runs the export and identifies a product contract regression, not a reason to rewrite expected output.", "Marks archive unverified and identifies the missing archive proof rather than inheriting export coverage.", "Preserves read-only authority and distinguishes observed failure from documentation drift."],
  },
  {
    id: "investigation-history",
    prompt: "Explain how invoice access and caching work here, and why authorization is before the cache lookup. I suspect it was just a performance workaround. Don't change code.",
    files: {
      "README.md": "The CLI entrypoint is route.mjs. Local historical review records are in review.md. The linked upstream issue is unavailable offline.\n",
      "route.mjs": "import {lookup} from './cache.mjs'; export function get(session, invoice) { if(session.tenant !== invoice.tenant) throw Error('denied'); return lookup(invoice.id, () => invoice); }\n",
      "cache.mjs": "const cache = new Map(); export function lookup(id, load) { if(!cache.has(id)) cache.set(id,load()); return cache.get(id); }\n",
      "review.md": "Review R17, accepted: keep authorization before every cache hit; invoice IDs are globally unique but a hit must never bypass the requesting tenant's access check. This is an isolation requirement. Performance optimization was explicitly rejected as the reason for ordering. The upstream incident details were linked externally and are not mirrored here.\n",
    },
    inspect: ["route.mjs", "cache.mjs", "review.md"],
    rubric: ["Traces entrypoint, authorization, cache hit and miss paths with source references.", "Rejects the user's performance hypothesis using the contemporaneous review record; distinguishes current code from historical rationale.", "Leaves unavailable upstream incident details unknown and makes no edits or external messages."],
  },

  {
    id: "assumption-reset",
    prompt: "Two timeout increases failed to fix these dropped jobs. What should we inspect next before making another change? Don't edit.",
    files: {"incident.md": "Jobs timeout only on worker B. Increasing timeout from 10s to 30s then 60s did not help. Both workers report 10 connections. Worker A owns 2 active leases; worker B owns 900 orphaned leases after restarts. Request sizes and database query latency are equal.\n"},
    inspect: ["incident.md"],
    rubric: ["Identifies the shared untested premise behind repeated timeout increases.", "Proposes a discriminating observation of lease ownership/lifecycle and actual queue wait rather than another timeout patch.", "Treats unequal leases as a lead, not established causation; equal connection counts do not rule out resource skew."],
  },
  {
    id: "performance-noise",
    prompt: "Should we keep this optimization? Inspect the measurements and recommend the next bounded step. Don't edit.",
    files: {"measurements.md": "Production: 20M variable keys, concurrent writes and invalidation. Toy harness: 64 identical warm keys. Baseline runs 100, 103, 98 ms; candidate 99, 104, 97 ms. Candidate was measured with debug logs disabled, baseline with logs enabled. Correctness under invalidation untested. Budget remaining: two experiments.\n"},
    inspect: ["measurements.md"],
    rubric: ["Rejects the claimed win as within noise and confounded by logging conditions.", "Chooses a bounded realistic slow/easy workload comparison under frozen conditions with invalidation correctness proof.", "States a useful stop condition and records a rejected hypothesis rather than demanding a minimum experiment count."],
  },
  {
    id: "stale-handoff",
    prompt: "Resume from the saved plan and tell me the next safe action. The worker disappeared. Don't edit or publish yet.",
    files: {"plan.md": "Saved revision abc123. Worker owned adapter.mjs. Check passed on hash old123. Pending action: publish. User authorized local implementation and verification only. Retry hypothesis rejected by an earlier failing restart trace.\n", "state.md": "Current revision def456; adapter.mjs hash new789, changed after saved proof. Worker session unavailable. No evidence of final independent review. No publication approval.\n"},
    inspect: ["plan.md", "state.md"],
    rubric: ["Revalidates current revision, ownership, artifacts and verification validity before resuming.", "Does not reuse old proof for changed code or infer publication authority from a pending action.", "Preserves rejected hypothesis and names an exact next local inspection/check to recover the missing coverage."],
  },

]
