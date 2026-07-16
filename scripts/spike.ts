import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const target = resolve("spike-target");
const english = "Change the background token to a warm cream (#faf6f0) and textSize to 18.";
const swahili = "Badilisha rangi ya nyuma iwe cream (#faf6f0) na ukubwa wa maandishi uwe 18.";

rmSync(target, { recursive: true, force: true });
mkdirSync(resolve(target, "src"), { recursive: true });
const files: Record<string, string> = {
  "package.json": JSON.stringify({
    private: true,
    scripts: { dev: "vite" },
    dependencies: { "@vitejs/plugin-react": "latest", vite: "latest", react: "latest", "react-dom": "latest" },
    devDependencies: { typescript: "latest", "@types/react": "latest", "@types/react-dom": "latest" },
  }, null, 2) + "\n",
  "index.html": '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n',
  "src/main.tsx": 'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
  "src/App.tsx": 'export default function App() { return <main>Hello</main>; }\n',
  "src/tokens.ts": 'export const tokens = { background: "#ffffff", textSize: 14 };\n',
  "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true } }, null, 2) + "\n",
  "vite.config.ts": 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n',
};
for (const [name, contents] of Object.entries(files)) writeFileSync(resolve(target, name), contents);

const git = (...args: string[]) => execFileSync("git", args, { cwd: target, encoding: "utf8" });
git("init", "-q");
git("add", ".");
git("-c", "user.name=Codex Spike", "-c", "user.email=spike@example.invalid", "commit", "-qm", "initial");

function oneLine(event: any): string {
  const item = event.item ?? {};
  const changes = item.changes?.map((change: any) => `${change.kind} ${change.path}`).join(", ");
  const text = item.text ?? item.command ?? changes ?? event.message ?? event.error?.message ?? "";
  if (event.type === "thread.started") return event.thread_id ?? "thread created";
  if (event.type === "turn.started") return "turn began";
  if (event.type === "item.started" || event.type === "item.completed") return `${item.type ?? "item"}: ${String(text).replace(/\s+/g, " ").slice(0, 120)}`;
  if (event.type === "turn.completed") return `usage: ${JSON.stringify(event.usage ?? {})}`;
  return String(text).replace(/\s+/g, " ").slice(0, 120) || "-";
}

async function run(label: string, instruction: string) {
  console.log(`\n=== ${label} ===`);
  // Exact CLI flags: codex exec --json --ephemeral --sandbox workspace-write <instruction>.
  // Observed JSONL types: thread.started, turn.started, item.started, item.completed,
  // and turn.completed (the parser also tolerates turn.failed, error, and unknown types).
  const child = spawn("codex", ["exec", "--json", "--ephemeral", "--sandbox", "workspace-write", instruction], {
    cwd: target,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.pipe(process.stderr);
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    try {
      const event = JSON.parse(line);
      console.log(`${event.type ?? "unknown"}: ${oneLine(event)}`);
    } catch { console.log(`non-json: ${line.slice(0, 120)}`); }
  });
  const code = await new Promise<number | null>((done) => child.on("close", done));
  const changed = git("diff", "--name-only").trim();
  const diff = git("diff");
  console.log(`exit: ${code}\nchanged: ${changed || "(none)"}\n${diff || "(no diff)"}`);
  return diff;
}

const first = await run("English", english);
git("reset", "--hard", "-q", "HEAD");
const second = await run("Swahili", swahili);
// Surprising: Swahili was understood, but that run also wired tokens into App/main while English
// changed only tokens.ts, so the observed diffs were not equivalent despite identical token values.
console.log(`\nEquivalent diffs: ${first === second}`);
