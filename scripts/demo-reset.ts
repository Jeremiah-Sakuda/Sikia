import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { ROOT_DIR } from "../kernel/config.js";

const execFile = promisify(execFileCallback);
const demoTag = "demo-start";

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd: ROOT_DIR, encoding: "utf8" });
  return stdout.trim();
}

await git(["rev-parse", "--verify", `refs/tags/${demoTag}`]);
const dirty = (await git(["status", "--porcelain=v1", "--untracked-files=all"]))
  .split("\n")
  .filter(Boolean);
const protectedChanges = dirty.filter((line) => {
  const path = line.slice(3).split(" -> ").at(-1) ?? "";
  return path !== "userland" && !path.startsWith("userland/");
});

if (protectedChanges.length > 0) {
  throw new Error(`Demo reset stopped: preserve these non-userland changes first:\n${protectedChanges.join("\n")}`);
}

await git(["reset", "--hard", demoTag]);
await git(["clean", "-fd", "--", "userland"]);
console.log(`Sikia is back at ${demoTag}. The workshop is ready.`);
