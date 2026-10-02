import { describe, expect, test } from "bun:test"
import { commands, type Context, gh, ghApi, runOptions } from "./shell.ts"

const local: Context = { cwd: "/w", home: "/home/q", remote: false }
const run = (src: string, options = {}) => commands(src, local, options)
const names = (src: string) => run(src).map(c => [c.name, ...c.args].join(" "))

describe("commands", () => {
  test("splits chains, pipes, subshells, and substitutions; drops redirects and comments", () => {
    expect(names(`a 'b c' && e 2>&1 >/dev/null | f; (g) # h i\necho $(j k) \`l\``)).toEqual(["a b c", "e", "f", "g", "j k", "l", "echo $(j k) `l`"])
  })

  test("heredoc bodies are stdin text, not commands", () => {
    const found = run(`git commit -F - <<'EOF'\ngh pr ready\nredis-cli FLUSHALL\nEOF\ngh pr view`)
    expect(found.map(c => c.name)).toEqual(["git", "gh"])
    expect(found[0]!.stdin).toBe("gh pr ready\nredis-cli FLUSHALL")
  })

  test("a heredoc inside $(cat ...) stays text", () => {
    expect(names(`git commit -m "$(cat <<'EOF'\nWire gh pr ready (later)\nEOF\n)"`).map(n => n.split(" ")[0])).toEqual(["cat", "git"])
  })

  test("unquoted heredoc substitutions run", () => {
    expect(names("cat <<EOF\n$(redis-cli DBSIZE)\nEOF")).toContain("redis-cli DBSIZE")
  })

  test("piped stdin comes only from echo, printf, and cat/tee input", () => {
    const stdinOf = (src: string) => run(src).at(-1)!.stdin
    expect(stdinOf("echo FLUSHALL | redis-cli")).toBe("FLUSHALL")
    expect(stdinOf("printf 'a\\nb' | tee x | redis-cli")).toBe("a\\nb")
    expect(stdinOf("cat <<EOF | redis-cli\nFLUSHDB\nEOF")).toBe("FLUSHDB")
    expect(stdinOf("grep FLUSHDB notes | redis-cli")).toBe("")
    expect(stdinOf("cat notes.txt | redis-cli")).toBe("")
    expect(stdinOf("redis-cli <<< FLUSHALL")).toBe("FLUSHALL")
  })

  test("follows cd, and cd into an unknown path loses the cwd", () => {
    expect(run("cd sub && a; cd ~/p && b; cd $X && c").map(c => c.ctx.cwd)).toEqual(["/w/sub", "/home/q/p", undefined])
  })

  test("cd and export inside ( ... ), a pipeline stage, or a background job do not last", () => {
    const cwds = (src: string) => run(src).map(c => `${c.name}:${c.ctx.cwd}`)
    expect(cwds("(cd scripts); rm -rf .")).toEqual(["rm:/w"])
    expect(cwds("(cd a && b) && c")).toEqual(["b:/w/a", "c:/w"])
    expect(cwds("(cd a; (cd b; c); d); e")).toEqual(["c:/w/a/b", "d:/w/a", "e:/w"])
    expect(cwds("cd a | true; b")).toEqual(["true:/w", "b:/w"])
    expect(cwds("true | cd a; b")).toEqual(["true:/w", "b:/w"])
    expect(cwds("cd a & b")).toEqual(["b:/w"])
    expect(cwds("cd a; b")).toEqual(["b:/w/a"])
    const assigned = (src: string) => run(src).at(-1)!.assignments
    expect(assigned("export GH_REPO=x/y; gh pr ready")).toEqual(["GH_REPO=x/y"])
    expect(assigned("(export GH_REPO=x/y); gh pr ready")).toEqual([])
  })

  test("cd reads -- and -L/-P; cd - is unknown", () => {
    expect(run("cd -- sub && a; cd -P /srv && b; cd - && c; cd && d").map(c => c.ctx.cwd)).toEqual(["/w/sub", "/srv", undefined, "/home/q"])
  })

  test("env -C and sudo -D/--chdir set the wrapped command's cwd", () => {
    const cwd = (src: string) => run(src).at(-1)!.ctx.cwd
    expect(cwd("env -C sub rm -rf x")).toBe("/w/sub")
    expect(cwd("env --chdir=/etc rm -rf x")).toBe("/etc")
    expect(cwd("env -C/etc A=1 rm -rf x")).toBe("/etc")
    expect(cwd("sudo -D /srv rm -rf x")).toBe("/srv")
    expect(cwd("sudo --chdir /srv rm -rf x")).toBe("/srv")
    expect(cwd("sudo -u root -C 3 rm -rf x")).toBe("/w")
    expect(cwd("env -u X rm -rf x")).toBe("/w")
  })

  test("assignments on a shell carry into its script", () => {
    expect(run("GH_REPO=x/y bash -c 'gh pr ready'").at(-1)!.assignments).toEqual(["GH_REPO=x/y"])
    expect(run("export GH_REPO=x/y; sudo sh -c 'gh pr ready'").at(-1)!.assignments).toEqual(["GH_REPO=x/y"])
    expect(run("GH_REPO=x/y true; gh pr ready").at(-1)!.assignments).toEqual([])
  })

  test("xargs takes echo/printf input words as operands; other input stays unknown", () => {
    expect(names("echo a b | xargs rm -rf")).toEqual(["echo a b", "rm -rf a b"])
    expect(names("printf '%s\\n' /etc | xargs -I{} rm -rf {}/x").at(-1)).toBe("rm -rf /etc/x")
    expect(names("find . -name dist | xargs rm -rf").at(-1)).toBe("rm -rf")
  })

  test("a remote docker daemon makes its commands remote", () => {
    for (const src of ["DOCKER_HOST=ssh://prod docker exec pg psql", "docker -H ssh://prod exec pg psql", "docker --host=tcp://10.0.0.5:2375 exec pg psql", "docker --context prod exec pg psql", "export DOCKER_CONTEXT=prod; docker exec pg psql", "podman --remote exec pg psql"])
      expect({ src, ctx: run(src).at(-1)!.ctx }).toMatchObject({ src, ctx: { remote: true, container: "exec", target: { name: "pg" } } })
    for (const src of ["docker -H unix:///var/run/docker.sock exec pg psql", "docker --context default exec pg psql", "DOCKER_HOST=tcp://localhost:2375 docker exec pg psql", "docker --log-level debug exec pg psql"])
      expect({ src, ctx: run(src).at(-1)!.ctx }).toMatchObject({ src, ctx: { remote: false, container: "exec", target: { name: "pg" } } })
  })

  test("unwraps wrappers and collects assignments", () => {
    for (const src of [
      "sudo -u redis env A=1 timeout -s KILL 5 nice -n 5 ionice -c3 stdbuf -o0 X=2 redis-cli FLUSHDB",
      "runuser -u redis -- redis-cli FLUSHDB",
      "flock -w 5 /tmp/lock redis-cli FLUSHDB",
      "flock /tmp/lock -c 'redis-cli FLUSHDB'",
      "watch -n 5 redis-cli FLUSHDB",
      "parallel -j2 redis-cli FLUSHDB ::: a b",
      "nohup time command redis-cli FLUSHDB",
      `bash -lc "redis-cli FLUSHDB"`,
      `su - redis -c 'redis-cli FLUSHDB'`,
      `sg docker -c "redis-cli FLUSHDB"`,
      `sg docker "redis-cli FLUSHDB"`,
      "eval redis-cli FLUSHDB",
      "echo redis-cli FLUSHDB | bash",
    ]) expect(names(src)).toContain("redis-cli FLUSHDB")
    expect(run("A=1 env B=2 gh pr ready").at(-1)!.assignments).toEqual(["A=1", "B=2"])
  })

  test("ssh payloads run remotely; options after the host and -- are skipped", () => {
    for (const src of [
      "ssh prod 'redis-cli FLUSHDB'",
      "ssh -p 2222 -o BatchMode=yes prod redis-cli FLUSHDB",
      "ssh prod -p 2222 -o BatchMode=yes redis-cli FLUSHDB",
      "ssh prod -- redis-cli FLUSHDB",
      "ssh prod <<'EOF'\nredis-cli FLUSHDB\nEOF",
      "ssh prod bash -s <<'EOF'\nredis-cli FLUSHDB\nEOF",
      `sg docker -c "ssh prod -- redis-cli FLUSHDB"`,
    ]) {
      const found = run(src).find(c => c.name === "redis-cli")
      expect(found).toMatchObject({ args: ["FLUSHDB"], ctx: { remote: true, cwd: undefined, home: undefined } })
    }
  })

  test("marks containers and names the exec target", () => {
    expect(run("docker exec -it -u root pg psql -c x").at(-1)).toMatchObject({ name: "psql", ctx: { container: "exec", target: { engine: "docker", name: "pg" }, remote: false, cwd: undefined } })
    expect(run("podman exec -e A=1 box rm -rf x").at(-1)!.ctx.target).toEqual({ engine: "podman", name: "box" })
    expect(run("docker compose exec -T pg psql").at(-1)!.ctx).toMatchObject({ container: "exec", target: undefined })
    const runCommands = new Set(["psql"])
    const ran = (src: string) => commands(src, local, { runCommands }).map(c => [c.name, ...c.args, c.ctx.container ?? "host"].join(" "))
    expect(ran("docker run --rm --label x.worktree=/w postgres:16 psql")).toEqual(["docker run --rm --label x.worktree=/w postgres:16 host", "psql scratch"])
    expect(ran("docker run --rm --label x=1 postgres:16 psql").at(-1)).toBe("psql run")
    expect(ran("docker run --rm postgres:16 psql").at(-1)).toBe("psql run")
    expect(ran("docker run --rm alpine ls")).toEqual(["docker run --rm alpine ls host"])
    expect(run("kubectl exec -it r -- redis-cli").at(-1)!.ctx).toMatchObject({ remote: true })
  })

  test("runOptions reads --name and worktree labels", () => {
    expect(runOptions(["-d", "--name", "pg", "--label", "agent.worktree=/w", "postgres"])).toEqual({ name: "pg", worktreeLabel: true })
    expect(runOptions(["--name=pg", "-l", "x.worktree", "postgres"])).toEqual({ name: "pg", worktreeLabel: true })
    expect(runOptions(["--label=owner=x.worktree", "postgres"])).toEqual({ name: undefined, worktreeLabel: false })
  })

  test("chained marks commands joined by && to the one before, through cd and wrappers", () => {
    const chain = (src: string) => run(src).map(c => `${c.name}:${c.chained}`)
    expect(chain("a && b; c || d | e & f\ng && h")).toEqual(["a:false", "b:true", "c:false", "d:false", "e:false", "f:false", "g:false", "h:true"])
    expect(chain("a && cd x && b; cd y && c")).toEqual(["a:false", "b:true", "c:false"])
    expect(chain(`a && bash -c "b && c; d"`)).toEqual(["a:false", "b:true", "c:true", "d:false"])
    expect(chain("a && b \"$(c)\"")).toEqual(["a:false", "c:true", "b:true"])
  })
})

describe("gh", () => {
  const last = (src: string) => run(src).at(-1)!
  test("reads global -R and GH_REPO before the subcommand", () => {
    expect(gh(last("gh -R o/r pr ready 4"))).toEqual({ repo: "o/r", words: ["pr", "ready", "4"] })
    expect(gh(last("GH_REPO=o/r gh pr ready"))).toEqual({ repo: "o/r", words: ["pr", "ready"] })
    expect(gh(last("GH_HOST=ghe.example.com gh -Rx/y pr ready"))).toEqual({ repo: "x/y", host: "ghe.example.com", words: ["pr", "ready"] })
    expect(gh(last("git status"))).toBeUndefined()
  })

  test("ghApi reads method, endpoint, and fields; fields imply POST", () => {
    expect(ghApi(["repos/o/r/pulls", "-f", "head=b", "-Fdraft=true"])).toEqual({ method: "POST", endpoint: "repos/o/r/pulls", fields: ["head=b", "draft=true"], input: false, help: false })
    expect(ghApi(["--hostname", "ghe.example.com", "repos/o/r/pulls", "--help"])).toMatchObject({ hostname: "ghe.example.com", help: true })
    expect(ghApi(["--method=GET", "repos/o/r/pulls", "-f", "state=open"]).method).toBe("GET")
    expect(ghApi(["-H", "Accept: x", "repos/o/r/pulls", "--jq", ".[0]"])).toMatchObject({ method: "GET", endpoint: "repos/o/r/pulls" })
    expect(ghApi(["-X", "put", "repos/o/r/collaborators/u", "--input", "-"])).toMatchObject({ method: "PUT", input: true })
  })
})
