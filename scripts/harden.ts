import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT_DIR } from "../kernel/config.js";
import { appendHardeningEntry, runGauntlet, toHardeningEntry } from "../kernel/gauntlet.js";

const taxonomyPath = resolve(ROOT_DIR, "scripts/taxonomy.json");
const parsed: unknown = JSON.parse(await readFile(taxonomyPath, "utf8"));

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === "string");
}

if (!isStringArray(parsed)) {
  throw new Error("scripts/taxonomy.json must contain an array of request strings");
}

for (const request of parsed) {
  console.log(`Running: ${request}`);
  const result = await runGauntlet(request, (event) => {
    if (event.message !== undefined) console.log(`${event.type}: ${event.message}`);
    else if (event.files !== undefined) console.log(`${event.type}: ${event.files.join(", ")}`);
  });
  if (result.outcome !== "reverted") await appendHardeningEntry(toHardeningEntry(result));
  console.log(`Outcome: ${result.outcome} (${result.retries} retries, ${result.durationMs}ms)`);
}
