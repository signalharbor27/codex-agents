export type JudgmentCase = {
  id: string
  prompt: string
  files: Record<string, string>
  inspect: string[]
  rubric: string[]
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
]
