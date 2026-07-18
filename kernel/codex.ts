import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { CODEX_TIMEOUT_MS } from "./config.js";

const TRANSLATION_MODEL = process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-5.4-nano";

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

function responseText(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.output)) return undefined;
  for (const item of value.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        return content.text.trim();
      }
    }
  }
  return undefined;
}

export async function instructionForCodex(instruction: string, signal?: AbortSignal): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.length === 0) throw new Error("OPENAI_API_KEY is required to prepare requests");

  // Sprint 3 and Phase 3 evidence: direct Swahili runs planned correctly but
  // stalled after 180.105s and 180.111s with no changes. Normalize every request
  // once so Latin-script languages need no heuristic; git receives untouched userText.
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TRANSLATION_MODEL,
      instructions: "If this text is not English, translate it to English preserving intent exactly; if it is English, return it verbatim.",
      input: instruction,
      max_output_tokens: 160,
      store: false,
    }),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new Error(`Translation request failed with status ${response.status}`);
  const translated = responseText(await response.json());
  if (translated === undefined || translated.length === 0) throw new Error("Translation response contained no text");
  return translated;
}

function stringAt(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function summarizeChanges(item: Record<string, unknown>): string | undefined {
  if (!Array.isArray(item.changes)) return undefined;
  const changes = item.changes.flatMap((value) => {
    if (!isRecord(value)) return [];
    const path = stringAt(value, "path");
    if (path === undefined) return [];
    return [`${stringAt(value, "kind") ?? "change"} ${path}`];
  });
  return changes.length === 0 ? undefined : changes.join("\n");
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
    ?? summarizeChanges(item)
    ?? stringAt(value, "message")
    ?? stringAt(error, "message")
    ?? (type === "unknown" ? `Unknown event: ${originalType}` : originalType);
  return itemType === undefined ? { type, summary, raw: value } : { type, summary, itemType, raw: value };
}

export async function* runCodex(instruction: string, cwd: string, signal?: AbortSignal): AsyncGenerator<CodexEvent> {
  if (signal?.aborted) throw new Error("Codex request aborted");
  const effectiveInstruction = await instructionForCodex(instruction, signal);
  const child = spawn("codex", ["exec", "--json", "--ephemeral", "--sandbox", "workspace-write", effectiveInstruction], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let timedOut = false;
  let aborted = false;
  const abortChild = () => {
    aborted = true;
    child.kill("SIGTERM");
  };
  signal?.addEventListener("abort", abortChild, { once: true });
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
    if (aborted) throw new Error("Codex request aborted");
    if (timedOut) throw new Error(`Codex timed out after ${CODEX_TIMEOUT_MS / 1_000}s`);
    if (code !== 0) throw new Error(`Codex exited with code ${code}: ${stderr.trim()}`);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortChild);
  }
}
