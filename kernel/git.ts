import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { ROOT_DIR } from "./config.js";

const execFile = promisify(execFileCallback);

export interface GitLogEntry {
  sha: string;
  message: string;
  date: string;
  files: string[];
}

function statusPath(line: string): string | undefined {
  if (line.length < 4) return undefined;
  const raw = line.slice(3).split(" -> ").at(-1) ?? "";
  if (!raw.startsWith('"')) return raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : undefined;
  } catch {
    return raw;
  }
}

export function changedPathsSince(baseline: readonly string[], current: readonly string[]): string[] {
  const original = new Set(baseline);
  return [...new Set(current.filter((line) => !original.has(line)).flatMap((line) => statusPath(line) ?? []))].sort();
}

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd: ROOT_DIR, encoding: "utf8" });
  return stdout;
}

export async function commit(message: string): Promise<void> {
  await git(["add", "--", "userland/src"]);
  await git(["commit", "-m", message]);
}

export async function revert(sha: string): Promise<void> {
  await git(["revert", "--no-edit", sha]);
}

export async function log(): Promise<GitLogEntry[]> {
  const output = await git(["log", "--date=iso-strict", "--pretty=format:%x1e%H%x1f%s%x1f%cI", "--name-only"]);
  return output.split("\x1e").filter(Boolean).map((record) => {
    const [header = "", ...fileLines] = record.trim().split("\n");
    const [sha = "", message = "", date = ""] = header.split("\x1f");
    return { sha, message, date, files: fileLines.filter(Boolean) };
  });
}

export async function statusPorcelain(): Promise<string[]> {
  return (await git(["status", "--porcelain=v1", "--untracked-files=all"])).split("\n").filter(Boolean);
}

export async function diffNames(baseline: readonly string[] = []): Promise<string[]> {
  return changedPathsSince(baseline, await statusPorcelain());
}

export async function resetHard(): Promise<void> {
  await git(["restore", "--source", "HEAD", "--staged", "--worktree", "--", "userland"]);
  await git(["clean", "-fd", "--", "userland"]);
}

export async function recoverUserland(): Promise<string[]> {
  const dirty = (await diffNames()).filter((path) => path === "userland" || path.startsWith("userland/"));
  if (dirty.length > 0) await resetHard();
  return dirty;
}
