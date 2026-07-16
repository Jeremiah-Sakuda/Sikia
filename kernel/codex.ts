import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { CODEX_TIMEOUT_MS } from "./config.js";

export type CodexEventType =
  | "thread.started"
  | "turn.started"
  | "item.started"
  | "item.completed"
  | "turn.completed"
  | "turn.failed"
  | "error"
  | "unknown";

export interface CodexEvent {
  type: CodexEventType;
  summary: string;
  itemType?: string;
  raw: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringAt(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function parseEvent(value: unknown): CodexEvent {
  if (!isRecord(value)) return { type: "unknown", summary: "Non-object JSONL event", raw: {} };
  const originalType = stringAt(value, "type") ?? "unknown";
  const knownTypes: readonly string[] = ["thread.started", "turn.started", "item.started", "item.completed", "turn.completed", "turn.failed", "error"];
  const type: CodexEventType = knownTypes.includes(originalType) ? originalType as CodexEventType : "unknown";
  const item = isRecord(value.item) ? value.item : {};
  const itemType = stringAt(item, "type");
  const error = isRecord(value.error) ? value.error : {};
  const summary = stringAt(item, "text")
    ?? stringAt(item, "command")
    ?? stringAt(value, "message")
    ?? stringAt(error, "message")
    ?? (type === "unknown" ? `Unknown event: ${originalType}` : originalType);
  return itemType === undefined ? { type, summary, raw: value } : { type, summary, itemType, raw: value };
}

export async function* runCodex(instruction: string, cwd: string): AsyncGenerator<CodexEvent> {
  const child = spawn("codex", ["exec", "--json", "--ephemeral", "--sandbox", "workspace-write", instruction], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let timedOut = false;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });
  const exit = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, CODEX_TIMEOUT_MS);
  timer.unref();

  try {
    for await (const line of createInterface({ input: child.stdout })) {
      try {
        const parsed: unknown = JSON.parse(line);
        yield parseEvent(parsed);
      } catch {
        yield { type: "unknown", summary: `Invalid JSONL: ${line.slice(0, 120)}`, raw: { line } };
      }
    }
    const code = await exit;
    if (timedOut) throw new Error(`Codex timed out after ${CODEX_TIMEOUT_MS / 1_000}s`);
    if (code !== 0) throw new Error(`Codex exited with code ${code}: ${stderr.trim()}`);
  } finally {
    clearTimeout(timer);
  }
}
