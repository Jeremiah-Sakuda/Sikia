import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { runCodex, type CodexEvent } from "./codex.js";
import { HARDENING_LOG_PATH, RETRY_LIMIT, ROOT_DIR, USERLAND_DIR } from "./config.js";
import { checkFence } from "./fence.js";
import { commit, diffNames, resetHard } from "./git.js";

export type RequestOutcome = "done" | "refused" | "reverted";

export interface RequestResult {
  request: string;
  outcome: RequestOutcome;
  retries: number;
  durationMs: number;
  failureReason?: string;
  files: string[];
}

export interface HardeningEntry {
  request: string;
  outcome: RequestOutcome;
  retries: number;
  durationMs: number;
  failureReason?: string;
}

export interface ProgressEvent {
  type: "status" | "plan" | "diff";
  message?: string;
  files?: string[];
}

type ProgressListener = (event: ProgressEvent) => void;

interface ToolResult {
  ok: boolean;
  output: string;
}

const checks = ["typecheck:userland", "lint:userland", "test:userland"] as const;

function runTool(script: typeof checks[number]): Promise<ToolResult> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  return new Promise((resolve) => {
    execFile(npm, ["run", script], { cwd: ROOT_DIR, encoding: "utf8", maxBuffer: 1_048_576 }, (error, stdout, stderr) => {
      const output = `${stdout}\n${stderr}`.trim();
      resolve(error === null ? { ok: true, output } : { ok: false, output: output || error.message });
    });
  });
}

async function validate(): Promise<ToolResult> {
  for (const check of checks) {
    const result = await runTool(check);
    if (!result.ok) return result;
  }
  return { ok: true, output: "" };
}

function progressFromCodex(event: CodexEvent): ProgressEvent {
  const type = event.itemType === "agent_message" ? "plan" : event.itemType === "file_change" ? "diff" : "status";
  return { type, message: event.summary };
}

async function askCodex(instruction: string, onProgress: ProgressListener): Promise<void> {
  for await (const event of runCodex(instruction, USERLAND_DIR)) onProgress(progressFromCodex(event));
}

export function toHardeningEntry(result: RequestResult): HardeningEntry {
  const entry = { request: result.request, outcome: result.outcome, retries: result.retries, durationMs: result.durationMs };
  return result.failureReason === undefined ? entry : { ...entry, failureReason: result.failureReason };
}

export async function appendHardeningEntry(entry: HardeningEntry): Promise<void> {
  let entries: HardeningEntry[] = [];
  try {
    const parsed: unknown = JSON.parse(await readFile(HARDENING_LOG_PATH, "utf8"));
    if (Array.isArray(parsed)) entries = parsed.filter((item): item is HardeningEntry => typeof item === "object" && item !== null);
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  entries.push(entry);
  await writeFile(HARDENING_LOG_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

export async function runGauntlet(userText: string, onProgress: ProgressListener = () => undefined): Promise<RequestResult> {
  const started = Date.now();
  let retries = 0;
  let files: string[] = [];
  let failureReason: string | undefined;

  try {
    await askCodex(userText, onProgress);
    while (true) {
      files = await diffNames();
      onProgress({ type: "diff", files });
      const fence = checkFence(files);
      if (!fence.ok) {
        await resetHard();
        return { request: userText, outcome: "refused", retries, durationMs: Date.now() - started, failureReason: fence.violations.join(", "), files };
      }

      const result = await validate();
      if (result.ok) {
        await commit(userText);
        return { request: userText, outcome: "done", retries, durationMs: Date.now() - started, files };
      }

      failureReason = result.output;
      if (retries >= RETRY_LIMIT) break;
      retries += 1;
      onProgress({ type: "status", message: "That attempt needs a little more work. Trying again." });
      await askCodex(`Your change failed validation with these errors:\n${result.output}\nFix them without expanding the scope of the change`, onProgress);
    }
  } catch (error: unknown) {
    failureReason = error instanceof Error ? error.message : "Unknown request failure";
  }

  await resetHard();
  const reverted: RequestResult = {
    request: userText,
    outcome: "reverted",
    retries,
    durationMs: Date.now() - started,
    failureReason: failureReason ?? "The requested change did not pass its checks.",
    files,
  };
  await appendHardeningEntry(toHardeningEntry(reverted));
  return reverted;
}
