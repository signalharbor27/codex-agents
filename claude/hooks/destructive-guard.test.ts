import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { denyReason, gitToplevel, handle, type Host, type Inspect, realpath } from "./destructive-guard.ts"

// A fake host: two git work trees, one temp root, a home directory that is not a work tree, and
// containers: scratch-* carry a worktree label, pg and app carry other labels, anything else fails.
const repo = "/w/repo"
const worktree = "/srv/data/workspaces/wt"
const home = "/home/agent"
const inspections: string[] = []
const inspect: Inspect = (engine, container) => {
  inspections.push(`${engine} ${container}`)
  if (container.startsWith("scratch-")) return ["tweetstream.worktree", "other"]
  if (container === "pg" || container === "app") return ["com.docker.compose.project"]
}
// Every path exists and none is a symlink, except the links in `symlinks`.
const symlinks: Record<string, string> = { [`${repo}/escape`]: "/etc", "/tmp/link": `${worktree}/agents` }
const paths: Pick<Host, "toplevel" | "tempRoots" | "inspect" | "realpath"> = {
  toplevel: path => [repo, worktree].find(top => path === top || path.startsWith(`${top}/`)),
  tempRoots: ["/tmp"],
  inspect,
  realpath: path => symlinks[path] ?? path,
}
const deny = (command: string, cwd = repo) => denyReason(command, { ...paths, cwd, home })

const cases = (title: string, commands: string[], expected: RegExp | undefined) =>
  describe(title, () => {
    for (const command of commands) test(command, () => {
      const reason = deny(command)
      if (expected) {
        expect(reason).toMatch(expected)
        expect(reason).toContain("AGENT_DESTRUCTIVE_OK=1")
      } else expect(reason).toBeUndefined()
    })
  })

cases("denies Redis flushes", [
  "redis-cli -p 6380 FLUSHDB ASYNC",
  "redis-cli flushall",
  "redis-cli -h 10.0.0.5 -n 2 FlushDb",
  "sudo -u redis redis-cli FLUSHALL",
  "env REDISCLI_AUTH=x redis-cli FLUSHDB",
  "REDISCLI_AUTH=x timeout 5 /usr/bin/redis-cli FLUSHDB",
  "cd /srv && redis-cli -p 6380 FLUSHDB ASYNC",
  "true; redis-cli FLUSHALL",
  "echo FLUSHALL | redis-cli -p 6380",
  "printf 'SELECT 2\\nFLUSHDB\\n' | redis-cli",
  "echo FLUSHDB | redis-cli -x",
  "redis-cli <<EOF\nSELECT 1\nflushdb\nEOF",
  "redis-cli <<< FLUSHALL",
  "docker exec -it redis redis-cli FLUSHALL",
  "docker exec -it scratch-redis redis-cli FLUSHALL",
  "docker run -d --name r1 --label x.worktree=/w redis:7 && docker exec r1 redis-cli FLUSHALL",
  "docker compose exec -T redis redis-cli FLUSHDB",
  "ssh prod 'redis-cli -p 6380 FLUSHDB ASYNC'",
  "ssh -p 2222 -o BatchMode=yes prod redis-cli FLUSHDB",
  "ssh prod <<'EOF'\nredis-cli FLUSHALL\nEOF",
  "ssh prod bash -s <<'EOF'\nredis-cli FLUSHALL\nEOF",
  `bash -c "redis-cli FLUSHALL"`,
  `sudo sh -lc 'redis-cli FLUSHALL'`,
  "echo $(redis-cli FLUSHALL)",
  "kubectl exec -it redis-0 -- redis-cli FLUSHALL",
  "ssh prod -- redis-cli -p 6380 FLUSHDB ASYNC",
  "ssh prod -p 22 -o BatchMode=yes -- redis-cli FLUSHDB",
  `sg docker -c "docker exec redis redis-cli FLUSHDB"`,
  `sg docker -c "ssh prod -- 'redis-cli FLUSHALL'"`,
  "runuser -u redis -- redis-cli FLUSHDB",
  "flock /tmp/l redis-cli FLUSHDB",
  "watch -n 60 redis-cli FLUSHDB",
  "cat <<EOF | redis-cli\nFLUSHDB\nEOF",
  "redis-cli -n 2 -r 3 FLUSHDB",
  "redis-cli --tls --cacert ca.pem -a pw FLUSHALL",
  "DOCKER_HOST=ssh://prod docker exec scratch-redis redis-cli FLUSHALL",
], /Redis FLUSH(?:ALL|DB) deletes every key/)

cases("allows Redis near misses", [
  "redis-cli GET flushdb_key",
  "redis-cli --scan --pattern 'flushdb*'",
  "redis-cli DBSIZE",
  "grep -rn FLUSHDB src/",
  "rg 'redis-cli FLUSHALL' docs",
  `git commit -m "Block redis-cli FLUSHALL in the guard"`,
  "echo FLUSHALL",
  "echo 'GET flushdb_key' | redis-cli",
  `cat <<'EOF' > notes.md\nredis-cli FLUSHALL\nEOF`,
  "grep -l FLUSHDB notes.md | redis-cli -x SET k",
  "rg FLUSHALL docs | redis-cli -x SET k",
  "redis-cli GET FLUSHALL",
  "redis-cli SET k FLUSHDB",
  "redis-cli -n 2 SET flushall 1",
  "echo 'SET k FLUSHDB' | redis-cli",
  "echo FLUSHALL | redis-cli -x SET k",
], undefined)

cases("denies SQL drops and truncates against non-local targets", [
  `psql "$DATABASE_URL" -c "TRUNCATE users"`,
  `psql -h db.prod -c 'truncate table "User" cascade'`,
  `psql "$DATABASE_URL" -c "DROP DATABASE app"`,
  `psql postgres://localhost:5432/app -c "drop schema public cascade"`,
  "psql \"$DATABASE_URL\" <<'SQL'\nBEGIN;\nTRUNCATE sessions;\nCOMMIT;\nSQL",
  `echo 'TRUNCATE users' | psql "$DATABASE_URL"`,
  `mysql -h prod -e "DROP DATABASE shop"`,
  `sudo -u postgres psql -c "DROP DATABASE app"`,
  `dropdb -h prod app`,
  `ssh prod 'docker exec pg psql -U postgres -c "TRUNCATE users"'`,
  `docker run --rm postgres:16 psql "$PROD_URL" -c "TRUNCATE users"`,
  `bash -c 'psql "$URL" -c "DROP SCHEMA x"'`,
  `docker exec uga-pg psql -c "DROP DATABASE x"`,
  `docker exec pg psql -U postgres -c "TRUNCATE users"`,
  `docker exec -i pg psql -U postgres <<'SQL'\nDROP SCHEMA public CASCADE;\nSQL`,
  `docker compose exec -T postgres psql -c "DROP DATABASE test"`,
  `docker exec pg sh -c "psql -c 'TRUNCATE users'"`,
  `docker exec pg dropdb test`,
  `docker run --rm --label owner=me postgres:16 psql -c "TRUNCATE t"`,
  `docker run -d --name pg2 --label owner=me postgres:16 && docker exec pg2 psql -c "TRUNCATE t"`,
  `docker exec "$CTR" psql -c "TRUNCATE t"`,
  `psql --command="TRUNCATE users"`,
  `psql --command "TRUNCATE users"`,
  `psql -c"TRUNCATE users"`,
  `mysql --execute="DROP DATABASE shop"`,
  `mysql -e"DROP SCHEMA shop"`,
  `clickhouse-client --query="TRUNCATE TABLE events"`,
  `psql "$URL" -tAc "TRUNCATE users"`,
  `psql "$URL" -Atc "DROP SCHEMA public CASCADE"`,
  `psql -Xc "TRUNCATE users"`,
  `psql -tAc"TRUNCATE users"`,
  `mysql -h prod -Bse "DROP DATABASE shop"`,
  `clickhouse-client -nq "TRUNCATE TABLE events"`,
  `psql -c "select 1; truncate t"`,
  `psql -c "BEGIN;\nTRUNCATE t;\nCOMMIT;"`,
  "psql <<'SQL'\n\\c app\nTRUNCATE t;\nSQL",
  `DOCKER_HOST=ssh://prod docker exec scratch-pg psql -c "TRUNCATE t"`,
  `docker -H ssh://prod exec scratch-pg psql -c "TRUNCATE t"`,
  `docker --context prod exec scratch-pg psql -c "TRUNCATE t"`,
  `docker -H tcp://10.0.0.5:2375 run --rm --label x.worktree=/w postgres:16 psql -c "TRUNCATE t"`,
  `docker -H ssh://prod run -d --name pg3 --label x.worktree=/w postgres:16 && docker -H ssh://prod exec pg3 psql -c "TRUNCATE t"`,
], /SQL (?:DROP DATABASE|DROP SCHEMA|TRUNCATE) deletes data|dropdb deletes/)

cases("allows SQL near misses and local containers", [
  `psql "$DATABASE_URL" -c "select 'truncate'"`,
  `psql "$DATABASE_URL" -c "select count(*) from \\"Truncated\\""`,
  `psql "$DATABASE_URL" -c "DROP TABLE scratch"`,
  `psql "$DATABASE_URL" -c "UPDATE users SET truncated = true WHERE id = 1"`,
  `psql -c "-- TRUNCATE users\nselect 1"`,
  `psql "$URL" -tAc "SELECT 1"`,
  `psql "$URL" -tAc "select count(*) from \\"User\\""`,
  `psql -U truncate -tAc "SELECT 1"`,
  "grep -rn TRUNCATE migrations/",
  `git commit -m "Guard TRUNCATE and DROP DATABASE"`,
  `docker exec -i scratch-pg psql -U postgres -c "TRUNCATE users"`,
  "docker exec -i scratch-pg psql -U postgres <<'SQL'\nDROP SCHEMA public CASCADE;\nSQL",
  `docker exec scratch-pg sh -c "psql -c 'TRUNCATE users'"`,
  `sg docker -c 'docker exec scratch-pg psql -c "DROP DATABASE x"'`,
  `docker run --rm --label "tweetstream.worktree=$(git rev-parse --show-toplevel)" postgres:16 psql -c "TRUNCATE t"`,
  `docker run -d --name pg2 --label x.worktree=/w postgres:16 && docker exec pg2 psql -c "DROP DATABASE x"`,
  `docker exec scratch-pg dropdb test`,
  `docker exec pg psql -c "select 1"`,
  `psql -c "SELECT TRUNCATE(12.34, 1)"`,
  `mysql -e "SELECT TRUNCATE(12.34,1)"`,
  `psql --command="SELECT truncate(1.5)"`,
  `psql -c 'select "truncate" from t; select "drop schema x" from t'`,
  `mysql -e 'select \`truncate\` from t'`,
  `psql -c "select 1 -- ; truncate t"`,
  `psql -h truncate.example.com -c "select 1"`,
  `docker -H unix:///var/run/docker.sock exec scratch-pg psql -c "TRUNCATE t"`,
  `docker --context default exec scratch-pg psql -c "TRUNCATE t"`,
], undefined)

describe("container inspection", () => {
  const inspected = (command: string) => {
    inspections.length = 0
    return { reason: deny(command), inspections: [...inspections] }
  }

  test("inspects only after a guarded pattern matches, and once per container", () => {
    expect(inspected(`docker exec pg psql -c "select 1"; docker exec app rm -rf /tmp/x`)).toEqual({ reason: undefined, inspections: [] })
    expect(inspected(`docker exec scratch-pg psql -c "TRUNCATE a" && docker exec scratch-pg psql -c "TRUNCATE b"`)).toEqual({ reason: undefined, inspections: ["docker scratch-pg"] })
    expect(inspected(`podman exec scratch-pg psql -c "TRUNCATE a"`).inspections).toEqual(["podman scratch-pg"])
  })

  test("a container this command starts with a worktree label needs no inspection", () => {
    expect(inspected(`docker run -d --name pg2 --label=x.worktree=/w postgres:16 && docker exec pg2 psql -c "TRUNCATE t"`)).toEqual({ reason: undefined, inspections: [] })
  })

  test("names why the container is not scratch", () => {
    expect(inspected(`docker exec uga-pg psql -c "DROP DATABASE x"`).reason).toContain("`docker inspect uga-pg` failed")
    expect(deny(`docker exec pg psql -c "DROP DATABASE x"`)).toContain("Container pg has no label ending in .worktree")
    expect(deny(`docker compose exec pg psql -c "DROP DATABASE x"`)).toContain("compose service")
    expect(deny(`docker exec pg psql -c "DROP DATABASE x"`)).toContain("docker run --label <project>.worktree=<path>")
  })

  test("a scratch label does not excuse Redis flushes or permission writes", () => {
    expect(deny("docker exec scratch-pg redis-cli FLUSHDB")).toMatch(/Redis FLUSHDB/)
    expect(deny(`docker exec scratch-pg curl -X PUT https://discord.com/api/v10/channels/1/permissions/2`)).toMatch(/Discord/)
  })
})

const channel = "https://discord.com/api/v10/channels/123/permissions/456"
cases("denies Discord permission and role writes", [
  `curl -X PUT -H "Authorization: Bot $TOKEN" ${channel} -d '{"allow":"0"}'`,
  `curl --request DELETE "${channel}"`,
  `curl -sXPATCH https://discord.com/api/v10/guilds/1/roles/2`,
  `curl --request=PUT "https://discord.com/api/v10/guilds/1/members/2/roles/3"`,
  `curl -X DELETE "$API/guilds/$GUILD/members/$USER/roles/$ROLE"`,
  `http PUT ${channel} "Authorization:Bot $T"`,
  `xh DELETE discord.com/api/guilds/1/roles/2`,
  `ssh box "curl -X PUT ${channel}"`,
  `curl -X PATCH https://discord.com/api/v10/channels/123 -d '{"permission_overwrites":[]}'`,
  `curl -X PATCH https://discord.com/api/v10/guilds/1/members/2 --json '{"roles":["3"]}'`,
  `http PATCH https://discord.com/api/v10/guilds/1/members/2 roles:='["3"]'`,
  `curl -X PUT --url ${channel}`,
  `curl -X PUT --url=${channel}`,
  `curl -X DELETE https://example.com/ok https://discord.com/api/v10/guilds/1/roles/2`,
  `curl -X POST https://discord.com/api/v10/guilds/1/roles -d '{"name":"mod"}'`,
  `curl https://discordapp.com/api/guilds/1/roles --json '{"name":"mod"}'`,
  `curl -X DELETE "$DISCORD/guilds/1/roles/2"`,
  `curl -X PUT https://canary.discord.com/api/v10/channels/1/permissions/2`,
], /changes live Discord permissions or roles/)

cases("denies Discord channel and member edits whose body the hook cannot read", [
  `curl -X PATCH https://discord.com/api/v10/channels/1 -d @body.json`,
  `curl -X PATCH https://discord.com/api/v10/channels/1 --data-binary @body.json`,
  `curl -X PATCH https://discord.com/api/v10/guilds/1/members/2 -d@body.json`,
  `curl -X PATCH https://discord.com/api/v10/guilds/1/members/2 --json @-`,
  `jq . body.json | curl -X PATCH https://discord.com/api/v10/channels/1 --data-binary @-`,
  `curl -X PATCH https://discord.com/api/v10/channels/1 -T body.json`,
  `http PATCH https://discord.com/api/v10/channels/1 < body.json`,
  `http PATCH https://discord.com/api/v10/channels/1 @body.json`,
], /body the hook cannot inspect/)

cases("denies GitHub branch protection and collaborator writes", [
  "gh api -X PUT repos/o/r/branches/main/protection --input protection.json",
  "gh api --method DELETE repos/{owner}/{repo}/branches/main/protection",
  "gh api -X POST repos/o/r/branches/main/protection/enforce_admins",
  "gh api -XPATCH repos/o/r/branches/main/protection/required_status_checks -f strict=true",
  "gh api -X PUT repos/o/r/collaborators/someone -f permission=admin",
  "gh -R o/r api -X DELETE repos/o/r/collaborators/someone",
  "curl -X PUT https://api.github.com/repos/o/r/branches/main/protection -d @p.json",
], /changes GitHub branch protection or collaborator access/)

cases("allows GitHub near misses", [
  "gh api repos/o/r/branches/main/protection",
  "gh api repos/o/r/collaborators",
  "gh api -X POST repos/o/r/issues -f title=protection",
  "gh pr create --title 'Add branch protection'",
], undefined)

cases("allows Discord near misses", [
  `curl -H "Authorization: Bot $TOKEN" https://discord.com/api/v10/guilds/1/roles`,
  `curl -X GET ${channel}`,
  `http GET https://discord.com/api/v10/guilds/1/roles`,
  `curl -X POST https://discord.com/api/v10/channels/123/messages -d '{"content":"hi"}'`,
  `curl -X PUT https://example.com/upload/roles.json`,
  `curl -X PATCH https://discord.com/api/v10/channels/123 -d '{"name":"general"}'`,
  `curl -X PATCH https://discord.com/api/v10/guilds/1/members/2 -d '{"nick":"fan"}'`,
  `curl -X PUT https://example.com/api/channels/1/permissions/2`,
  `curl -X DELETE http://localhost:3000/api/guilds/1/roles/2`,
  `curl -X POST https://discord.com/api/v10/channels/1/messages -d @message.json`,
  `curl -X POST --url https://discord.com/api/v10/guilds/1/roles/2 -H "X: y"`,
  `curl -X PATCH https://example.com/channels/1 -d @body.json`,
  `curl -X PATCH https://discord.com/api/v10/channels/1 --data-binary @- <<'EOF'\n{"name":"general"}\nEOF`,
  `curl -X PATCH https://discord.com/api/v10/channels/1 --data-raw '@not-a-file'`,
  `http PATCH https://discord.com/api/v10/channels/1 name=general`,
], undefined)

cases("denies recursive rm outside git work trees and temp directories", [
  "rm -rf /",
  "rm -rf /*",
  "rm -rf ~",
  "rm -rf ~/",
  `rm -rf "$HOME"`,
  "rm -rf ${HOME}/*",
  "rm -rf /etc",
  "rm -rf /srv",
  "sudo rm -rf /var/lib",
  "rm -fr /srv/data/workspaces/other",
  "rm -r --no-preserve-root /",
  "rm -rf -- /etc/nginx",
  "rm -rf ../..",
  "rm -rf .",
  "rm -rf ~/projects/TweetStream",
  "rm -rf /w/elsewhere/build",
  "rm -rf /tmp",
  "rm -rf /tmp/",
  "rm -rf /tmp/*",
  "cd /tmp && rm -rf *",
  `rm -rf ${repo}`,
  `rm -rf ${worktree}/`,
  "rm -rf *",
  "cd ~ && rm -rf *",
  "cd /srv && rm -rf data",
  "ssh prod 'rm -rf /srv/app'",
  "ssh prod 'rm -rf build'",
  "sudo bash -c 'rm -rf /var/lib/postgresql'",
  "true && rm -Rf /opt/thing",
  "docker exec app rm -rf /srv/app/cache",
  "docker exec gone rm -rf data",
  `sg docker -c "docker exec app rm -rf /var/lib/app/tmp"`,
  "(cd scripts); rm -rf .",
  "(cd scripts && true) && rm -rf *",
  "cd /tmp/work | true; rm -rf .",
  "env -C / rm -rf *",
  "sudo -D /etc rm -rf *",
  "env --chdir=/srv rm -rf data",
  "rm -rf escape/nginx",
  "rm -rf escape/",
  "rm -rf /tmp/link/..",
  "rm -rf /tmp/link/../..",
  "rm -rf {*,.[!.]*}",
  "rm -rf .* *",
  "rm -rf .[!.]* ..?* *",
  `rm -rf ${repo}/{*,.*}`,
  "cd ~ && rm -rf .*",
  "echo /etc/nginx | xargs rm -rf",
  "printf '%s\\n' /srv/app | xargs -I{} rm -rf {}",
  "xargs rm -rf <<EOF\n/etc/nginx\nEOF",
  "docker -H ssh://prod run --rm --label x.worktree=/w alpine rm -rf /srv/app",
], /rm -r .* would delete/)

cases("allows recursive rm near misses", [
  "rm -rf ./node_modules",
  "rm -rf node_modules dist",
  "rm -rf /tmp/x",
  "rm -rf /tmp/generate-hosts-*",
  `rm -rf "$tmp"`,
  `rm -rf "$(mktemp -d)"`,
  "rm /etc/hosts.bak",
  "rm -f ~/.cache/thing",
  `rm -rf ${repo}/build`,
  `rm -rf ${worktree}/node_modules`,
  `cd ${worktree} && rm -rf dist`,
  `docker exec scratch-app rm -rf /srv/app/cache`,
  `docker exec app rm -rf /tmp/build`,
  "cd scripts && rm -rf ../claude/agents",
  "cd /tmp/work && rm -rf *",
  "rm -rf /tmp/x/*",
  "ssh prod 'rm -rf /tmp/deploy-123'",
  "echo rm -rf /",
  `git commit -m "Never rm -rf /"`,
  "(cd scripts && rm -rf build)",
  "(cd /tmp/work && rm -rf *)",
  "env -C /tmp/work rm -rf *",
  "sudo -D /tmp/work rm -rf *",
  "rm -rf escape",
  "rm -rf /tmp/link",
  "rm -rf /tmp/link/sub",
  "rm -rf build/{*,.[!.]*}",
  "cd build && rm -rf .* *",
  "rm -rf .cache *.log",
  "echo build dist | xargs rm -rf",
  "find . -name dist | xargs rm -rf",
  "docker run --rm --label x.worktree=/w alpine rm -rf /srv/app",
], undefined)

describe("temp directories", () => {
  const roots = { ...paths, cwd: repo, home, tempRoots: ["/tmp", "/srv/data/tmp/ubuntu"] }
  test("this host's temp roots allow local removal only", () => {
    expect(denyReason("rm -rf /srv/data/tmp/ubuntu/db", roots)).toBeUndefined()
    expect(denyReason("ssh prod rm -rf /srv/data/tmp/ubuntu/db", roots)).toContain("a path in a remote host outside /tmp")
    expect(denyReason("docker exec app rm -rf /srv/data/tmp/ubuntu/db", roots)).toContain("a path in a container outside /tmp")
  })
})

describe("hook entry", () => {
  const input = (command: string, cwd = repo) => JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd })
  const hook = (command: string, cwd = repo, env: Record<string, string | undefined> = { HOME: home }) => handle(input(command, cwd), env, paths)

  test("prints a PreToolUse deny with the reason", () => {
    const output = JSON.parse(hook("redis-cli FLUSHALL")!)
    expect(output.hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" })
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("Ask Q first")
  })

  test("AGENT_DESTRUCTIVE_OK=1 in the hook environment allows; set inside the command it does not", () => {
    expect(hook("redis-cli FLUSHALL", repo, { HOME: home, AGENT_DESTRUCTIVE_OK: "1" })).toBeUndefined()
    expect(hook("redis-cli FLUSHALL", repo, { HOME: home, AGENT_DESTRUCTIVE_OK: "0" })).toBeDefined()
    expect(hook("AGENT_DESTRUCTIVE_OK=1 redis-cli FLUSHALL")).toBeDefined()
  })

  test("uses the hook cwd for relative rm targets", () => {
    expect(hook("rm -rf build", worktree)).toBeUndefined()
    expect(hook("rm -rf build", home)).toContain("outside every git work tree")
  })

  test("the git adapter finds any work tree from the nearest existing ancestor", () => {
    // No temp roots, so only the git lookup can allow these paths.
    const root = realpathSync(mkdtempSync(join(tmpdir(), "destructive-guard-")))
    const main = join(root, "main")
    const other = join(root, "other")
    try {
      mkdirSync(main)
      mkdirSync(other)
      for (const dir of [main, other]) expect(spawnSync("git", ["init", "-q", dir]).status).toBe(0)
      const git = { toplevel: gitToplevel, tempRoots: [], realpath, inspect }
      const at = (command: string, cwd: string) => denyReason(command, { ...git, cwd, home })
      expect(at(`rm -rf ${other}/build/not/yet/made`, main)).toBeUndefined()
      expect(at(`rm -rf ${other}`, main)).toContain(`the git work tree ${other}`)
      expect(at(`rm -rf ${root}/loose`, main)).toContain("outside every git work tree")
      // A regular file: the lookup starts from its directory.
      writeFileSync(join(main, "README.md"), "x\n")
      expect(at("rm -rf README.md", main)).toBeUndefined()
      // A symlink inside the work tree that points out of it: its contents are judged where they live.
      symlinkSync(other, join(main, "link"))
      expect(at("rm -rf link", main)).toBeUndefined()
      expect(at("rm -rf link/", main)).toContain(`the git work tree ${other}`)
      expect(at("rm -rf link/../loose", main)).toContain("outside every git work tree")
      expect(at("rm -rf link/build", main)).toBeUndefined()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("allows malformed input with a note", () => {
    expect(handle("not json", {}, paths)).toBeUndefined()
    expect(handle(JSON.stringify({ tool_input: {} }), {}, paths)).toBeUndefined()
  })

  test("runs as a hook script", async () => {
    const child = Bun.spawn({ cmd: ["bun", join(import.meta.dir, "destructive-guard.ts")], stdin: "pipe", stdout: "pipe", env: { ...process.env, AGENT_DESTRUCTIVE_OK: undefined } })
    child.stdin.write(input("ssh prod 'redis-cli -p 6380 FLUSHDB ASYNC'"))
    child.stdin.end()
    const [stdout, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
    expect(code).toBe(0)
    expect(JSON.parse(stdout).hookSpecificOutput.permissionDecision).toBe("deny")
  })
})
