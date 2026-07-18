import { execFile as execFileCallback } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ROOT_DIR } from "../kernel/config.js";

const execFile = promisify(execFileCallback);
const demoTag = "demo-start";
export const staleTagMessage = "demo-start is stale — it would erase engineering work. Re-plant it at the current tip with: git tag -f demo-start && git push -f origin demo-start";

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd: ROOT_DIR, encoding: "utf8" });
  return stdout.trim();
}

function lines(value: string): string[] {
  return value.split("\n").filter(Boolean);
}

export function assertResetSafe(statusLines: readonly string[], tagIsAncestor: boolean, changedFiles: readonly string[]): void {
  const protectedChanges = statusLines.filter((line) => {
    const path = line.slice(3).split(" -> ").at(-1) ?? "";
    return path !== "userland" && !path.startsWith("userland/");
  });
  if (protectedChanges.length > 0) {
    throw new Error(`Demo reset stopped: preserve these non-userland changes first:\n${protectedChanges.join("\n")}`);
  }
  if (!tagIsAncestor || changedFiles.some((path) => !path.startsWith("userland/src/"))) {
    throw new Error(staleTagMessage);
  }
}

async function isTagAncestor(): Promise<boolean> {
  try {
    await git(["merge-base", "--is-ancestor", demoTag, "HEAD"]);
    return true;
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === 1) return false;
    throw error;
  }
}

export async function runDemoReset(): Promise<void> {
  await git(["rev-parse", "--verify", `refs/tags/${demoTag}`]);
  const dirty = lines(await git(["status", "--porcelain=v1", "--untracked-files=all"]));
  const changedFiles = [...new Set(lines(await git(["log", "--format=", "--name-only", `${demoTag}..HEAD`])))];
  assertResetSafe(dirty, await isTagAncestor(), changedFiles);
  await git(["reset", "--hard", demoTag]);
  await git(["clean", "-fd", "--", "userland"]);
  console.log(`Sikia is back at ${demoTag}. The workshop is ready.`);
}

const entrypoint = process.argv[1] === undefined ? "" : resolve(process.argv[1]);
if (entrypoint === fileURLToPath(import.meta.url)) await runDemoReset();
