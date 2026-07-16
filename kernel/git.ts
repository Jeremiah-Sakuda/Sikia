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

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd: ROOT_DIR, encoding: "utf8" });
  return stdout;
}

export async function commit(message: string): Promise<string> {
  await git(["add", "--", "userland/src"]);
  await git(["commit", "-m", message]);
  return (await git(["rev-parse", "HEAD"])).trim();
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

export async function diffNames(): Promise<string[]> {
  const [tracked, untracked] = await Promise.all([
    git(["diff", "--name-only", "HEAD"]),
    git(["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...new Set(`${tracked}\n${untracked}`.split("\n").filter(Boolean))].sort();
}

export async function resetHard(): Promise<void> {
  await git(["reset", "--hard", "HEAD"]);
  await git(["clean", "-fd", "--", "userland"]);
}
