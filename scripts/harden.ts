import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT_DIR } from "../kernel/config.js";
import { appendHardeningEntry, runGauntlet, toHardeningEntry, type RequestOutcome } from "../kernel/gauntlet.js";

interface TaxonomyRequest {
  class: string;
  priority: "P0" | "P1";
  request: string;
}

const taxonomyPath = resolve(ROOT_DIR, "scripts/taxonomy.json");
const parsed: unknown = JSON.parse(await readFile(taxonomyPath, "utf8"));

function isTaxonomyRequest(value: unknown): value is TaxonomyRequest {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.class === "string"
    && (record.priority === "P0" || record.priority === "P1")
    && typeof record.request === "string";
}

if (!Array.isArray(parsed) || !parsed.every(isTaxonomyRequest)) {
  throw new Error("scripts/taxonomy.json must contain valid taxonomy request records");
}

const outcomes = new Map<string, RequestOutcome[]>();
for (const item of parsed) {
  console.log(`Running [${item.priority} / ${item.class}]: ${item.request}`);
  const result = await runGauntlet(item.request, (event) => {
    if (event.message !== undefined) console.log(`${event.type}: ${event.message}`);
    else if (event.files !== undefined) console.log(`${event.type}: ${event.files.join(", ")}`);
  }, item.class);
  if (result.outcome !== "reverted") await appendHardeningEntry(toHardeningEntry(result));
  const classOutcomes = outcomes.get(item.class) ?? [];
  classOutcomes.push(result.outcome);
  outcomes.set(item.class, classOutcomes);
  console.log(`Outcome: ${result.outcome} (${result.retries} retries, ${result.durationMs}ms)`);
}

console.log("\nPer-class results:");
for (const [requestClass, classOutcomes] of outcomes) {
  const done = classOutcomes.filter((outcome) => outcome === "done").length;
  console.log(`${requestClass}: ${done}/${classOutcomes.length} done (${Math.round(done / classOutcomes.length * 100)}%)`);
}
