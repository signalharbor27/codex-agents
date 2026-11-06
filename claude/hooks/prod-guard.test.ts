import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { askReason, handle } from "./prod-guard.ts"

// Containers: scratch-* carry a worktree label; anything else has none.
const inspect = (_engine: string, container: string) => (container.startsWith("scratch-") ? ["agent.worktree"] : [])
const ask = (command: string) => askReason(command, "/home/ubuntu/projects/TweetStream", "/home/ubuntu", inspect)

const cases = (title: string, commands: string[], asks: boolean) =>
  describe(title, () => {
    for (const command of commands) test(command, () => (asks ? expect(ask(command)).toBeString() : expect(ask(command)).toBeUndefined()))
  })

cases("runs reads without a prompt", [
  // The two commands from Q's screenshots that prompted under the blanket sudo rule.
  `curl -s http://127.0.0.1:18181/metrics | grep -E "^upstream_go_pump" | grep -v bucket | cut -c1-200 | head -60; ls /etc/tweetstream/pump/ 2>/dev/null; sudo grep -oE '^[A-Z_]*(METRIC|DEBUG|ADDR|LISTEN)[A-Z_]*' /etc/tweetstream/pump/pump.env`,
  `timeout 20 sudo -n docker ps -q --no-trunc | while read c; do timeout 10 sudo -n docker inspect -f "{{.Id}} {{json .Args}}" $c; done | grep -F "loaders-stack/edge.sh" | cut -c1-200`,
  "sudo journalctl -u tweetstream-upstream-go@blue --since -10m --no-pager",
  "sudo systemctl status tweetstream-pump; systemctl show -p MainPID --value tweetstream-pump",
  "sudo systemctl cat tweetstream-upstream-go@.service",
  "sudo cat /etc/tweetstream/crypto-worker/crypto-worker-blue.env | cut -d= -f1",
  "K=$(sudo -n grep '^STRIPE_SECRET_KEY=' /etc/tweetstream/crypto-worker/crypto-worker-blue.env | cut -d= -f2-)",
  "sudo cat /etc/tweetstream/pump/pump.env > /tmp/pump.env.copy",
  "sudo cp /etc/tweetstream/pump/pump.env /tmp/pump.env",
  "sudo ss -ltnp; sudo lsof -p 1234 | head",
  "sudo perf record -F 199 -g -p 2464677 -- sleep 30",
  "redis-cli -p 6379 INFO memory; redis-cli -p 6379 GET session:1; redis-cli SCAN 0 COUNT 100",
  "redis-cli CONFIG GET maxmemory",
  "sudo docker stop scratch-pg; sudo docker rm -f acctdel-s1-pg",
  "sudo iptables -L -n; sudo nft list ruleset; sudo ufw status",
  "sysctl net.core.somaxconn; ip route show; tc qdisc show",
  "git log --oneline -- services/upstream-go/deploy/deploy-sidecar.sh; sed -n 1,40p services/upstream-go/deploy/deploy-sidecar.sh",
  "bash services/upstream-go/deploy/deploy-sidecar-test.sh",
  "kill 12345; pkill -f measure-bin; sudo kill -0 2464677",
  "sudo pkill -f '/tmp/news-poll.sh'",
  "sudo -n docker kill 617af34ad3ab",
  "sudo docker exec tenz-dev-edge sh -c 'kill -USR1 1'",
  "grep -R smoke-live README.md; printf '%s\\n' smoke-live",
  "sudo perf probe --funcs | head",
  "redis-cli SUBSCRIBE alerts",
  "cd /srv/data/workspaces/x/services/ocr && docker compose down",
  "echo hi > out.txt 2>&1",
  "sudo rm -rf /tmp/scratch-dir",
], false)

cases("asks before changing production", [
  "sudo systemctl restart tweetstream-upstream-go@blue",
  "sudo systemctl stop tweetstream-pump.service",
  "sudo systemctl reload haproxy",
  "sudo systemctl set-property tweetstream.slice CPUQuota=50%",
  "sudo systemctl restart 'tweetstream-*'",
  "sudo systemctl daemon-reload",
  "sudo service redis-server restart",
  "sudo reboot",
  "sudo kill -USR2 2464677",
  "sudo -u tweetstream kill 2464677",
  "pkill -f upstream-go",
  "echo X=1 | sudo tee -a /etc/tweetstream/pump/pump.env",
  `sudo bash -c "printf 'A=2\\n' >> /etc/tweetstream/fomo/fomo.env"`,
  "sudo sed -i 's/A=1/A=2/' /etc/tweetstream/pump/pump.env",
  "sudo install -m 644 unit /etc/systemd/system/tweetstream-pump.service",
  "sudo mv /tmp/new /opt/tweetstream/upstream-go/upstream-go",
  "sudo chmod 600 /etc/tweetstream/pump/pump.env",
  "echo 3 | sudo tee /proc/sys/vm/drop_caches",
  "sudo strace -p 2464677",
  "sudo gdb -p 2464677",
  "sudo perf probe --add tcp_v4_syn_recv_sock",
  "sudo flock /var/lib/tweetstream/pump/lock true",
  "redis-cli KEYS '*'",
  "redis-cli -p 6380 MONITOR",
  "redis-cli CONFIG SET maxmemory 1gb",
  "redis-cli DEL session:1",
  "redis-cli --bigkeys",
  "printf 'GET a\\nDEL a\\n' | redis-cli",
  "sudo docker restart cli-proxy-api",
  "sudo docker stop tweetstream-ocr-ocr-1",
  "sudo docker system prune -f",
  "sudo sysctl -w net.core.somaxconn=4096",
  "sudo iptables -A INPUT -p tcp --dport 80 -j DROP",
  "sudo ip route add default via 10.0.0.1",
  "sudo tc qdisc add dev eth0 root netem delay 10ms",
  "sudo apt-get install -y htop",
  "sudo services/upstream-go/deploy/deploy-sidecar.sh pump",
  "cd /var/tmp/r && sudo -n bash services/upstream-go/deploy/deploy-sandbox.sh --binary x",
  "bun run go:smoke:live",
  "cd /etc/tweetstream && sudo tee pump.env",
  "cd /etc && sudo sh -c 'echo x > tweetstream/pump.env'",
  "sudo systemctl --host localhost restart tweetstream-pump",
  "sudo ip -6 route add default via 10.0.0.1",
  "sudo sh -c 'kill -TERM 1234'",
  "sudo env FOO=1 kill 1234",
  "sudo docker compose -p tweetstream-ocr stop ocr",
  "cd /srv/data/tmp/ubuntu/r/services/ocr && docker compose --env-file /etc/tweetstream/upstream-go/upstream-go-green.env down",
  "sudo install -t /etc/tweetstream /tmp/a",
  "sudo cp --target-directory=/etc/tweetstream /tmp/a",
  "sudo firewall-cmd --reload",
  "docker compose -ptweetstream-ocr stop ocr",
  "docker compose --project-name=tweetstream-ocr down",
  "cd -P /etc/tweetstream && echo x > pump.env",
  "sudo env FOO=1 services/upstream-go/deploy/deploy-sidecar.sh pump",
  "sudo env FOO=1 bun run go:smoke:live",
], true)

describe("hook output", () => {
  const input = (tool_input: object) => JSON.stringify({ tool_name: "Bash", tool_input, cwd: "/tmp" })
  test("asks with the reason and the override", () => {
    const out = JSON.parse(handle(input({ command: "sudo systemctl restart tweetstream-pump" }), {}, inspect)!)
    expect(out.hookSpecificOutput.permissionDecision).toBe("ask")
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain("AGENT_PROD_OK=1")
  })
  test("prints nothing for a read", () => expect(handle(input({ command: "sudo journalctl -u tweetstream-pump" }), {}, inspect)).toBeUndefined())
  test("AGENT_PROD_OK=1 turns it off", () => expect(handle(input({ command: "sudo reboot" }), { AGENT_PROD_OK: "1" }, inspect)).toBeUndefined())
  test("asks for an Edit or Write of a production file", () => {
    expect(handle(input({ file_path: "/etc/tweetstream/pump/pump.env" }), {}, inspect)).toContain('"ask"')
    expect(handle(input({ file_path: "/home/ubuntu/x.ts" }), {}, inspect)).toBeUndefined()
  })
  test("the script reads hook JSON from stdin", () => {
    const run = spawnSync("bun", ["--no-env-file", `${import.meta.dir}/prod-guard.ts`], { input: input({ command: "sudo reboot" }), encoding: "utf8", env: { ...process.env, AGENT_PROD_OK: "" } })
    expect(JSON.parse(run.stdout).hookSpecificOutput.permissionDecision).toBe("ask")
  })
})
