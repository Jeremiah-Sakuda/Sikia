import express, { type Request, type Response } from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SHELL_DIR, USERLAND_DIR } from "./config.js";
import { runGauntlet } from "./gauntlet.js";
import { log, resetHard, revert } from "./git.js";

type SseType = "status" | "plan" | "diff" | "done" | "refused" | "reverted";
const clients = new Set<Response>();
let active = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shellSafe(message: string): string {
  return message
    .replaceAll(/codex/gi, "assistant")
    .replaceAll(/validation/gi, "checks")
    .replaceAll(/patch/gi, "change")
    .replaceAll(/diff/gi, "changes");
}

function send(response: Response, type: SseType, data: unknown): void {
  response.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(type: SseType, data: unknown): void {
  for (const client of clients) {
    try { send(client, type, data); }
    catch (error: unknown) { clients.delete(client); console.error("Event stream failed:", error); }
  }
}

async function processRequest(text: string): Promise<void> {
  broadcast("status", { message: "Heard you — working on it." });
  try {
    const result = await runGauntlet(text, (event) => {
      if (event.files !== undefined) broadcast("diff", { files: event.files });
      else broadcast(event.type, { message: shellSafe(event.message ?? "Working on it.") });
    });
    if (result.outcome === "done") broadcast("done", { message: "Done.", files: result.files });
    else if (result.outcome === "refused") broadcast("refused", { message: "That part isn't mine to change — it keeps everything else safe" });
    else if (result.failureReason === "no-op") broadcast("reverted", { message: "I couldn't work out how to do that one — nothing's changed." });
    else broadcast("reverted", { message: "That one didn't work — I've put everything back the way it was" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown request failure";
    try { await resetHard(); } catch (resetError: unknown) { console.error("Reset failed:", resetError); }
    console.error("Request failed:", message);
    broadcast("reverted", { message: "That one didn't work — I've put everything back the way it was" });
  } finally {
    active = false;
  }
}

export const app = express();
app.use(express.json({ limit: "16kb" }));
app.use("/userland", express.static(resolve(USERLAND_DIR, "dist")));
app.use(express.static(SHELL_DIR));

app.get("/events", (_request: Request, response: Response) => {
  response.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  response.flushHeaders();
  clients.add(response);
  send(response, "status", { message: "Event stream connected" });
  response.on("close", () => clients.delete(response));
});

app.post("/request", (request: Request, response: Response) => {
  const body: unknown = request.body;
  const textValue = isRecord(body) ? body.text : undefined;
  const text = typeof textValue === "string" ? textValue.trim() : "";
  if (text.length === 0) { response.status(400).json({ error: "Please provide a non-empty text request." }); return; }
  if (active) { response.status(409).json({ error: "Sikia is busy with another request. Please try again shortly." }); return; }
  active = true;
  void processRequest(text);
  response.status(202).json({ accepted: true });
});

app.post("/revert/:sha", async (request: Request, response: Response) => {
  if (active) { response.status(409).json({ error: "Sikia is busy. Please wait before reverting." }); return; }
  const shaValue = request.params.sha;
  const sha = Array.isArray(shaValue) ? shaValue[0] : shaValue;
  if (sha === undefined || !/^[0-9a-f]{7,40}$/i.test(sha)) { response.status(400).json({ error: "Invalid commit SHA." }); return; }
  active = true;
  try {
    await revert(sha);
    broadcast("reverted", { message: "I've put that change back the way it was.", sha });
    response.json({ reverted: sha });
  } catch (error: unknown) {
    broadcast("reverted", { message: "That one didn't work — I've put everything back the way it was" });
    response.status(500).json({ error: error instanceof Error ? error.message : "Revert failed" });
  } finally { active = false; }
});

app.get("/log", async (_request: Request, response: Response) => {
  try { response.json(await log()); }
  catch (error: unknown) { response.status(500).json({ error: error instanceof Error ? error.message : "Log failed" }); }
});

const entrypoint = process.argv[1] === undefined ? "" : resolve(process.argv[1]);
if (entrypoint === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => console.log(`Sikia listening on http://localhost:${port}`));
}
