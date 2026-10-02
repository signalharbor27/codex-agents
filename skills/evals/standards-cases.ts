// Planted-defect fixtures for run-standards-evals.ts. Each case is a tiny TypeScript repository:
// `before` is committed, then `after` is written so the review target is the uncommitted diff.

export const STANDARDS_CATEGORIES = [
  "tautological-test",
  "structure-sensitive-test",
  "cannot-fail-test",
  "private-path-test",
  "slop-comment",
  "shallow-module",
  "pass-through-layer",
  "hypothetical-seam",
  "scattered-invariant",
  "lost-locality",
  "weak-error-handling",
  "correctness-bug",
  "other",
] as const

export type StandardsCategory = (typeof STANDARDS_CATEGORIES)[number]

// "new": code the diff adds or changes; "touched": pre-existing code in a file the diff touches.
export const FINDING_ORIGINS = ["new", "touched"] as const
export type FindingOrigin = (typeof FINDING_ORIGINS)[number]

export type PlantedDefect = {
  category: StandardsCategory
  // Any listed category id satisfies the plant; the first is canonical.
  accept?: StandardsCategory[]
  // Files where a finding counts as located correctly; the first holds the defect.
  files: string[]
  // A matching finding's summary must name at least one of these (case-insensitive), so a
  // finding that guesses the category without locating the defect does not count.
  evidence: string[]
  // When set, a matching finding must carry this origin.
  origin?: FindingOrigin
}

export type StandardsCase = {
  id: string
  before: Record<string, string>
  after: Record<string, string>
  // Empty for the clean control, which passes only with zero findings.
  planted: PlantedDefect[]
}

const PACKAGE = '{\n  "name": "fixture",\n  "private": true,\n  "type": "module",\n  "scripts": { "test": "bun test" }\n}\n'

export const STANDARDS_CASES: StandardsCase[] = [
  {
    id: "tautological-test",
    before: { "package.json": PACKAGE },
    after: {
      "src/nickname.ts": `// The nickname column is varchar(32), and Postgres counts varchar length in code points.
export const MAX_NICKNAME_LENGTH = 32

export function isValidNickname(nickname: string): boolean {
  const length = [...nickname].length
  return length > 0 && length <= MAX_NICKNAME_LENGTH
}
`,
      "src/nickname.test.ts": `import { expect, test } from "bun:test"
import { MAX_NICKNAME_LENGTH, isValidNickname } from "./nickname"

test("nickname limit is 32 characters", () => {
  expect(MAX_NICKNAME_LENGTH).toBe(32)
})

test("accepts nicknames up to the limit and rejects empty or longer ones", () => {
  expect(isValidNickname("a".repeat(32))).toBe(true)
  expect(isValidNickname("🙂".repeat(32))).toBe(true)
  expect(isValidNickname("a".repeat(33))).toBe(false)
  expect(isValidNickname("")).toBe(false)
})
`,
    },
    planted: [{ category: "tautological-test", files: ["src/nickname.test.ts"], evidence: ["MAX_NICKNAME_LENGTH", "32"] }],
  },
  {
    id: "structure-sensitive-test",
    before: {
      "package.json": PACKAGE,
      "src/Banner.tsx": `export function Banner({ title }: { title: string }) {
  return (
    <header>
      <h1>{title}</h1>
    </header>
  )
}
`,
    },
    after: {
      "src/Banner.tsx": `import { Logo } from "./Logo"

export function Banner({ title }: { title: string }) {
  return (
    <header>
      <Logo />
      <h1>{title}</h1>
    </header>
  )
}
`,
      "src/Logo.tsx": `export function Logo() {
  return <img src="/logo.svg" alt="Acme" />
}
`,
      "src/Banner.test.ts": `import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

test("banner shows the logo before the title", () => {
  const source = readFileSync(new URL("./Banner.tsx", import.meta.url), "utf8")
  expect(source.indexOf("<Logo")).toBeGreaterThan(-1)
  expect(source.indexOf("<Logo")).toBeLessThan(source.indexOf("<h1>"))
})
`,
    },
    planted: [{ category: "structure-sensitive-test", files: ["src/Banner.test.ts"], evidence: ["readFileSync", "indexOf"] }],
  },
  {
    id: "cannot-fail-test",
    before: { "package.json": PACKAGE },
    after: {
      "src/config.ts": `import { readFileSync } from "node:fs"

export class ConfigError extends Error {
  override name = "ConfigError"
}

export type Config = { port: number }

export function loadConfig(path: string): Config {
  const text = readFileSync(path, "utf8")
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (cause) {
    throw new ConfigError(\`\${path} is not valid JSON\`, { cause })
  }
  const port = typeof raw === "object" && raw !== null && "port" in raw ? raw.port : undefined
  if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(\`\${path} needs "port", an integer from 1 to 65535\`)
  }
  return { port }
}
`,
      "src/config.test.ts": `import { expect, mock, test } from "bun:test"

mock.module("node:fs", () => ({ readFileSync: () => '{"port": 8080}' }))
const { loadConfig } = await import("./config")

test("rejects malformed config", () => {
  expect(loadConfig("config.json")).toBeDefined()
})
`,
    },
    planted: [{ category: "cannot-fail-test", files: ["src/config.test.ts"], evidence: ["readFileSync", "malformed"] }],
  },
  {
    id: "slop-comment",
    before: {
      "package.json": PACKAGE,
      "src/cart.ts": `export type Line = { sku: string; quantity: number; unitCents: number }

export function totalCents(lines: Line[]): number {
  let total = 0
  for (const line of lines) total += line.quantity * line.unitCents
  return total
}
`,
    },
    after: {
      "src/cart.ts": `export type Line = { sku: string; quantity: number; unitCents: number }

// ===== Cart helpers =====

// This function calculates the total of all lines in cents.
export function totalCents(lines: Line[]): number {
  // Start the total at zero
  let total = 0
  // Loop over every line
  for (const line of lines) {
    // Add quantity times unit price to the total
    total += line.quantity * line.unitCents
  }
  // Return the total
  return total
}

// Changed: merge now uses a Map instead of an object (was slow before #412).
// This function merges lines that share a SKU and unit price.
export function mergeLines(lines: Line[]): Line[] {
  // Create a map keyed by SKU and unit price
  const byKey = new Map<string, Line>()
  for (const line of lines) {
    const key = \`\${line.sku}@\${line.unitCents}\`
    const existing = byKey.get(key)
    // If we already saw this SKU at this price, add the quantity
    if (existing) existing.quantity += line.quantity
    // Otherwise store a copy of the line
    else byKey.set(key, { ...line })
  }
  // Convert the map back to an array
  return [...byKey.values()]
}
`,
      "src/cart.test.ts": `import { expect, test } from "bun:test"
import { mergeLines, totalCents } from "./cart"

test("merges repeated SKUs without mutating the input", () => {
  const input = [{ sku: "a", quantity: 1, unitCents: 250 }, { sku: "a", quantity: 2, unitCents: 250 }, { sku: "b", quantity: 1, unitCents: 99 }]
  expect(mergeLines(input)).toEqual([{ sku: "a", quantity: 3, unitCents: 250 }, { sku: "b", quantity: 1, unitCents: 99 }])
  expect(input[0]).toEqual({ sku: "a", quantity: 1, unitCents: 250 })
  expect(totalCents(mergeLines(input))).toBe(849)
})

test("keeps the same SKU at different prices on separate lines", () => {
  const input = [{ sku: "a", quantity: 1, unitCents: 250 }, { sku: "a", quantity: 1, unitCents: 200 }]
  expect(mergeLines(input)).toEqual(input)
  expect(totalCents(mergeLines(input))).toBe(450)
})
`,
    },
    planted: [{ category: "slop-comment", files: ["src/cart.ts"], evidence: ["#412", "Changed:", "Cart helpers", "Start the total", "Loop over every line", "Return the total", "This function"] }],
  },
  {
    id: "shallow-module",
    before: { "package.json": PACKAGE },
    after: {
      "src/invoice.ts": `export type Customer = { id: string; taxRate: number; discountRate: number }

export function lookupCustomer(customers: Map<string, Customer>, id: string): Customer {
  const customer = customers.get(id)
  if (!customer) throw new Error(\`unknown customer \${id}\`)
  return customer
}

export function subtotalCents(lineCents: number[]): number {
  return lineCents.reduce((sum, cents) => sum + cents, 0)
}

export function applyDiscount(cents: number, customer: Customer): number {
  return cents * (1 - customer.discountRate)
}

export function applyTax(cents: number, customer: Customer): number {
  return cents * (1 + customer.taxRate)
}

export function roundCents(cents: number): number {
  return Math.round(cents)
}

export function formatCents(cents: number): string {
  return \`$\${(cents / 100).toFixed(2)}\`
}
`,
      "src/checkout.ts": `import { applyDiscount, applyTax, formatCents, lookupCustomer, roundCents, subtotalCents, type Customer } from "./invoice"

export function checkoutTotal(customers: Map<string, Customer>, id: string, lineCents: number[]): string {
  const customer = lookupCustomer(customers, id)
  const subtotal = subtotalCents(lineCents)
  const discounted = applyDiscount(subtotal, customer)
  const taxed = applyTax(discounted, customer)
  return formatCents(roundCents(taxed))
}
`,
      "src/admin.ts": `import { applyDiscount, applyTax, formatCents, lookupCustomer, roundCents, subtotalCents, type Customer } from "./invoice"

export function adminInvoiceTotal(customers: Map<string, Customer>, id: string, lineCents: number[]): string {
  const customer = lookupCustomer(customers, id)
  const subtotal = subtotalCents(lineCents)
  const taxed = applyTax(subtotal, customer)
  const discounted = applyDiscount(taxed, customer)
  return formatCents(roundCents(discounted))
}
`,
    },
    planted: [{ category: "shallow-module", accept: ["shallow-module", "pass-through-layer", "lost-locality", "scattered-invariant"], files: ["src/invoice.ts", "src/checkout.ts", "src/admin.ts"], evidence: ["applyDiscount", "applyTax", "lookupCustomer", "subtotalCents", "roundCents", "formatCents"] }],
  },
  {
    id: "touched-tautological-test",
    before: {
      "package.json": PACKAGE,
      "src/pagination.ts": `export const DEFAULT_PAGE_SIZE = 20

export function pageCount(totalItems: number, pageSize = DEFAULT_PAGE_SIZE): number {
  if (!Number.isInteger(totalItems) || totalItems < 0) throw new RangeError("totalItems must be a non-negative integer")
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError("pageSize must be a positive integer")
  return Math.ceil(totalItems / pageSize)
}
`,
      "src/pagination.test.ts": `import { expect, test } from "bun:test"
import { DEFAULT_PAGE_SIZE, pageCount } from "./pagination"

test("default page size is 20", () => {
  expect(DEFAULT_PAGE_SIZE).toBe(20)
})

test("rounds partial pages up", () => {
  expect(pageCount(41)).toBe(3)
  expect(pageCount(40)).toBe(2)
  expect(pageCount(0)).toBe(0)
  expect(pageCount(10, 3)).toBe(4)
})

test("rejects counts and sizes that cannot form pages", () => {
  expect(() => pageCount(-1)).toThrow(RangeError)
  expect(() => pageCount(1.5)).toThrow(RangeError)
  expect(() => pageCount(10, 0)).toThrow(RangeError)
})
`,
    },
    after: {
      "src/pagination.ts": `export const DEFAULT_PAGE_SIZE = 20

export function pageCount(totalItems: number, pageSize = DEFAULT_PAGE_SIZE): number {
  if (!Number.isInteger(totalItems) || totalItems < 0) throw new RangeError("totalItems must be a non-negative integer")
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError("pageSize must be a positive integer")
  return Math.ceil(totalItems / pageSize)
}

export function pageRange(page: number, totalItems: number, pageSize = DEFAULT_PAGE_SIZE): { start: number; end: number } {
  const lastPage = Math.max(pageCount(totalItems, pageSize), 1)
  if (!Number.isInteger(page) || page < 1 || page > lastPage) throw new RangeError(\`page must be an integer from 1 to \${lastPage}\`)
  const start = (page - 1) * pageSize
  return { start, end: Math.min(start + pageSize, totalItems) }
}
`,
      "src/pagination.test.ts": `import { expect, test } from "bun:test"
import { DEFAULT_PAGE_SIZE, pageCount, pageRange } from "./pagination"

test("default page size is 20", () => {
  expect(DEFAULT_PAGE_SIZE).toBe(20)
})

test("rounds partial pages up", () => {
  expect(pageCount(41)).toBe(3)
  expect(pageCount(40)).toBe(2)
  expect(pageCount(0)).toBe(0)
  expect(pageCount(10, 3)).toBe(4)
})

test("rejects counts and sizes that cannot form pages", () => {
  expect(() => pageCount(-1)).toThrow(RangeError)
  expect(() => pageCount(1.5)).toThrow(RangeError)
  expect(() => pageCount(10, 0)).toThrow(RangeError)
})

test("returns the item range of a page, with a short last page and an empty first page", () => {
  expect(pageRange(1, 41)).toEqual({ start: 0, end: 20 })
  expect(pageRange(3, 41)).toEqual({ start: 40, end: 41 })
  expect(pageRange(2, 10, 3)).toEqual({ start: 3, end: 6 })
  expect(pageRange(1, 0)).toEqual({ start: 0, end: 0 })
})

test("rejects pages outside the available range", () => {
  expect(() => pageRange(0, 41)).toThrow(RangeError)
  expect(() => pageRange(4, 41)).toThrow(RangeError)
  expect(() => pageRange(2, 0)).toThrow(RangeError)
})
`,
    },
    planted: [{ category: "tautological-test", files: ["src/pagination.test.ts"], evidence: ["DEFAULT_PAGE_SIZE", "20"], origin: "touched" }],
  },
  {
    id: "clean-control",
    before: { "package.json": PACKAGE },
    after: {
      "src/lru.ts": `export class LruCache<K, V> {
  readonly #capacity: number
  readonly #entries = new Map<K, { value: V }>()

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer")
    this.#capacity = capacity
  }

  get size(): number {
    return this.#entries.size
  }

  get(key: K): V | undefined {
    const entry = this.#entries.get(key)
    if (!entry) return undefined
    this.#entries.delete(key)
    this.#entries.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    this.#entries.delete(key)
    this.#entries.set(key, { value })
    if (this.#entries.size > this.#capacity) {
      const [oldest] = this.#entries.keys()
      this.#entries.delete(oldest)
    }
  }
}
`,
      "src/lru.test.ts": `import { expect, test } from "bun:test"
import { LruCache } from "./lru"

test("evicts the least recently used entry when full", () => {
  const cache = new LruCache<string, number>(2)
  cache.set("a", 1)
  cache.set("b", 2)
  cache.set("c", 3)
  expect(cache.get("a")).toBeUndefined()
  expect(cache.get("b")).toBe(2)
  expect(cache.get("c")).toBe(3)
})

test("reading an entry protects it from the next eviction", () => {
  const cache = new LruCache<string, number>(2)
  cache.set("a", 1)
  cache.set("b", 2)
  expect(cache.get("a")).toBe(1)
  cache.set("c", 3)
  expect(cache.get("b")).toBeUndefined()
  expect(cache.get("a")).toBe(1)
})

test("overwriting a key updates its value without growing the cache", () => {
  const cache = new LruCache<string, number>(2)
  cache.set("a", 1)
  cache.set("a", 5)
  expect(cache.size).toBe(1)
  expect(cache.get("a")).toBe(5)
})

test("reading a stored undefined value still protects it from eviction", () => {
  const cache = new LruCache<string, number | undefined>(2)
  cache.set("a", undefined)
  cache.set("b", 2)
  expect(cache.get("a")).toBeUndefined()
  cache.set("c", 3)
  expect(cache.get("b")).toBeUndefined()
  expect(cache.size).toBe(2)
  expect(cache.get("c")).toBe(3)
})

test("rejects capacities that cannot hold an entry", () => {
  for (const capacity of [0, -1, 1.5, Number.NaN]) expect(() => new LruCache(capacity)).toThrow(RangeError)
})
`,
    },
    planted: [],
  },
  {
    id: "untouched-smell-control",
    before: {
      "package.json": PACKAGE,
      "src/duration.ts": `const UNIT_MS = new Map([
  ["ms", 1],
  ["s", 1_000],
  ["m", 60_000],
])

export function parseDuration(text: string): number {
  const match = /^(\\d+)([a-z]+)$/.exec(text.trim())
  const unitMs = match ? UNIT_MS.get(match[2]) : undefined
  if (!match || unitMs === undefined) throw new RangeError(\`invalid duration: \${JSON.stringify(text)}\`)
  return Number(match[1]) * unitMs
}
`,
      "src/duration.test.ts": `import { expect, test } from "bun:test"
import { parseDuration } from "./duration"

test("converts each unit to milliseconds", () => {
  expect(parseDuration("250ms")).toBe(250)
  expect(parseDuration("2s")).toBe(2_000)
  expect(parseDuration(" 3m ")).toBe(180_000)
})

test("rejects unknown units and malformed text", () => {
  for (const text of ["5d", "1.5s", "", "s", "-2s"]) expect(() => parseDuration(text)).toThrow(RangeError)
})
`,
      "src/greeting.ts": `// ===== Greeting helpers =====

// This function returns a greeting for the given name.
export function greeting(name: string): string {
  // Return the greeting
  return \`Hello, \${name}!\`
}
`,
    },
    after: {
      "src/duration.ts": `const UNIT_MS = new Map([
  ["ms", 1],
  ["s", 1_000],
  ["m", 60_000],
  ["h", 3_600_000],
])

export function parseDuration(text: string): number {
  const match = /^(\\d+)([a-z]+)$/.exec(text.trim())
  const unitMs = match ? UNIT_MS.get(match[2]) : undefined
  if (!match || unitMs === undefined) throw new RangeError(\`invalid duration: \${JSON.stringify(text)}\`)
  return Number(match[1]) * unitMs
}
`,
      "src/duration.test.ts": `import { expect, test } from "bun:test"
import { parseDuration } from "./duration"

test("converts each unit to milliseconds", () => {
  expect(parseDuration("250ms")).toBe(250)
  expect(parseDuration("2s")).toBe(2_000)
  expect(parseDuration(" 3m ")).toBe(180_000)
  expect(parseDuration("1h")).toBe(3_600_000)
})

test("rejects unknown units and malformed text", () => {
  for (const text of ["5d", "1.5s", "", "s", "-2s"]) expect(() => parseDuration(text)).toThrow(RangeError)
})
`,
    },
    planted: [],
  },
]
