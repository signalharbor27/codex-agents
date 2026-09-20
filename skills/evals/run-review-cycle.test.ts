import { expect, test } from "bun:test"
import { writeFile, unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { reviewCycle, INITIAL, INJECTED, CYCLE_ORACLE } from "./run-review-cycle.ts"
import { inSandbox } from "./run-execution-evals.ts"
import { captureProcess, oracleArgs } from "./run-judgment-evals.ts"
const FIXED = "const cache=new Map(); export function get(s,i){if(s.tenant!==i.tenant)throw Error('denied');if(!cache.has(i.id))cache.set(i.id,i);return cache.get(i.id)}"
test("contract oracle rejects original and repair regression, accepts complete repair", async () => {
  await inSandbox(async dir => {
    for (const [code, passes] of [[INITIAL,false],[INJECTED,false],[FIXED,true]] as const) {
      await writeFile(join(dir,"access.mjs"),code)
      expect((await captureProcess(oracleArgs(CYCLE_ORACLE),dir,"oracle",10000)).exitCode === 0).toBe(passes)
    }
  })
})
test("real stage runner preserves snapshots, independent identities and fault provenance", async () => {
  const phases: string[] = []
  const result = await reviewCycle(resolve(import.meta.dir,"../.."),false,async (args,dir,label) => {
    phases.push(label)
    if (label.includes("oracle")) return captureProcess(args,dir,label,10000)
    if (label === "repair" || label === "repair-regression") await writeFile(join(dir,"access.mjs"),FIXED)
    return {exitCode:0,stderr:"",stdout:[{type:"thread.started",thread_id:label},{type:"item.completed",item:{type:"agent_message",text:"Requires semantic assessment"}},{type:"turn.completed"}].map(x=>JSON.stringify(x)).join("\n")}
  })
  expect(result.status).toBe("needs-transcript-assessment")
  expect(phases).toEqual(["full-review","repair","initial repair oracle","delta-review","injected regression oracle","repair-regression","final contract oracle","final-review"])
  expect(result.results?.find((r:any)=>r.phase==='fault-injection').prior).toBe(FIXED)
})
test("no-op repair cannot reach regression injection", async () => {
  const result = await reviewCycle(resolve(import.meta.dir,"../.."),false,async (args,dir,label) => label.includes("oracle") ? captureProcess(args,dir,label,10000) : ({exitCode:0,stderr:"",stdout:[{type:"thread.started",thread_id:label},{type:"item.completed",item:{type:"agent_message",text:"Claimed repair"}},{type:"turn.completed"}].map(x=>JSON.stringify(x)).join("\n")}))
  expect(result.status).toBe("evidence-failed")
  expect(result.results?.some((r:any)=>r.phase==='fault-injection')).toBe(false)
})

const traceFor = (label: string) => [{type:"thread.started",thread_id:label},{type:"item.completed",item:{type:"agent_message",text:"Review result"}},{type:"turn.completed"}].map(x=>JSON.stringify(x)).join("\n")
test("oracle rejects a repair that authorizes only warm hits", async () => {
  await inSandbox(async dir => {
    await writeFile(join(dir,"access.mjs"),"const cache=new Map();export function get(s,i){if(cache.has(i.id)){if(s.tenant!==i.tenant)throw Error('denied');return cache.get(i.id)}cache.set(i.id,i);return i}")
    const result = await captureProcess(oracleArgs(CYCLE_ORACLE),dir,"cold miss oracle",10000)
    expect(result.exitCode).toBe(42)
    expect(result.stdout.trim()).toBe("FAIL contract: cold unauthorized cache miss")
  })
})
test("injected regression cannot pass on timeout or unrelated infrastructure error", async () => {
  for (const failure of [{exitCode:143,error:"timeout",stdout:"",stderr:""},{exitCode:1,stdout:"",stderr:"sandbox denied"}]) {
    const result = await reviewCycle(resolve(import.meta.dir,"../.."),false,async (args,dir,label) => {
      if(label === "injected regression oracle") return failure
      if(label.includes("oracle")) return captureProcess(args,dir,label,10000)
      if(label === "repair") await writeFile(join(dir,"access.mjs"),FIXED)
      return {exitCode:0,stderr:"",stdout:traceFor(label)}
    })
    expect(result.status).toBe("evidence-failed")
    expect(result.error).toBe("injected regression lacks expected contract failure")
    expect(result.results?.some((row:any)=>row.phase === "repair-regression")).toBe(false)
  }
})
test("phase deletion preserves raw transcript and exact failing stage", async () => {
  const result = await reviewCycle(resolve(import.meta.dir,"../.."),false,async (_args,dir,label) => {
    await unlink(join(dir,"access.mjs"))
    return {exitCode:0,stderr:"retained stderr",stdout:traceFor(label)}
  })
  expect(result.status).toBe("runner-error")
  expect(result.stage).toBe("full-review:snapshot")
  expect(result.results?.[0].raw.stdout).toBe(traceFor("full-review"))
  expect(result.results?.[0].raw.stderr).toBe("retained stderr")
})

test("oracle rejects authorization-only implementation that discards cached values", async () => {
  await inSandbox(async dir => {
    await writeFile(join(dir,"access.mjs"),"export function get(s,i){if(s.tenant!==i.tenant)throw Error('denied');return i}")
    const result = await captureProcess(oracleArgs(CYCLE_ORACLE),dir,"cache retention oracle",10000)
    expect(result.exitCode).toBe(42)
    expect(result.stdout.trim()).toBe("FAIL contract: cache value not retained")
  })
})
