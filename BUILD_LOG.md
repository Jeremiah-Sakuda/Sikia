# Build Log

This append-only log records each user prompt, the resulting actions, and the key decisions made. Add an entry after every prompt and before sending the final response.

## 2026-07-15 — Codex CLI spike

### Prompt

> Create a standalone Node + TypeScript script at scripts/spike.ts. It should:
>
> Create a throwaway directory ./spike-target containing a minimal Vite + React app (one App.tsx that renders "Hello" and a tokens.ts exporting { background: "#ffffff", textSize: 14 }), and git init it with an initial commit.
> Spawn codex exec as a child process with cwd pinned to ./spike-target, passing the instruction: "Change the background token to a warm cream (#faf6f0) and textSize to 18."
> Stream and parse the JSONL event output, printing each event type and a one-line summary to the console as it arrives.
> When the process exits, run git diff --name-only in the target and print which files changed, then print the full diff.
> Repeat the run once more with the same instruction written in Swahili: "Badilisha rangi ya nyuma iwe cream (#faf6f0) na ukubwa wa maandishi uwe 18." Log whether the resulting diff is equivalent.
>
> Add an npm script "spike": "tsx scripts/spike.ts". Keep it under 150 lines, no abstractions — this is a disposable probe. Document in comments: the exact codex CLI flags used, the JSONL event types observed, and anything surprising about non-English handling.

### Actions

- Added `scripts/spike.ts`, a 73-line Node/TypeScript probe that creates and initializes `spike-target`, runs both prompts, streams JSONL summaries, and prints and compares diffs.
- Added the `spike` npm script, ESM package configuration, `tsx` and TypeScript development dependencies, and the generated lockfile.
- Installed dependencies, syntax-checked the script, and ran the probe end to end. English changed only `tokens.ts`; Swahili also changed `App.tsx` and `main.tsx`, so the diffs were not equivalent.

### Key decisions

- Reset the generated repository to its initial commit between runs so both prompts start from an identical baseline.
- Used the exact flags `codex exec --json --ephemeral --sandbox workspace-write <instruction>` with the child process `cwd` set to `spike-target`.
- Compared the complete diff strings rather than only filenames or final token values, exposing the Swahili run's extra edits.

## 2026-07-15 — Add an ongoing build log

### Prompt

> I want us to make a build log cataloging the specific prompts I use, the actions you take, and 2-3 key decisions made to be updated after each prompt

### Actions

- Created this chronological `BUILD_LOG.md` and backfilled the preceding implementation prompt and outcome.
- Added a workspace instruction in `AGENTS.md` requiring an entry after every user prompt and before each final response.

### Key decisions

- Preserve each prompt verbatim so the log captures the specific request rather than a paraphrase.
- Keep the log append-only and chronological, correcting old entries only when they are factually wrong.
- Limit each entry to concise actions and 2–3 decisions so the log remains useful as the project grows.

## 2026-07-15 — Scaffold the Sprint 1 kernel

### Prompt

> Read AGENTS.md in the repo root first — it defines the architecture, the nine invariants, and the dependency budget. Then scaffold the Sikia repository exactly per its layout section.
>
> Build the kernel skeleton in kernel/:
>
> server.ts: Express app serving the shell's static files, plus routes: POST /request (accepts { text: string }), GET /events (SSE stream emitting status | plan | diff | done | refused | reverted events), POST /revert/:sha, GET /log (JSON of git history: sha, message, date, files touched).
> codex.ts: runCodex(instruction: string, cwd: string) — spawns codex exec with cwd pinned to the userland path, parses the JSONL event stream (event types documented in scripts/spike.ts), and exposes an async iterator of typed events.
> git.ts: commit(message), revert(sha), log(), diffNames(), resetHard() via child_process.execFile — no git libraries.
> fence.ts: checkFence(changedFiles: string[]): { ok: boolean; violations: string[] } against the allowlist in config.ts (allowlist: everything under userland/src/ plus userland/AGENTS.md is NOT allowed — only userland/src/**).
> config.ts: allowlist globs, retry limit (2), codex timeout (180s).
> Single-flight lock: a module-level mutex; POST /request during an active run returns 409 with a friendly busy message.
>
> For now, POST /request should run Codex and then STOP before validation (Sprint 2 adds the gauntlet) — just log the changed files and reset. Use a stub userland/ directory with two dummy files so the fence has something to check. TypeScript strict, no any in kernel code.

### Actions

- Built strict TypeScript modules for configuration, typed Codex JSONL streaming with a 180-second timeout, git operations through `execFile`, fence inspection, and the Express/SSE server with all four routes and six event names.
- Added a static shell that keeps controls outside an iframe, a minimal Vite userland with two dummy source files, and runtime instructions in `userland/AGENTS.md` outside the mutation allowlist.
- Added budget-approved Express, Vite, ESLint, and Vitest tooling; added fence and cross-boundary smoke tests; verified typecheck, lint, five tests, a production Vite build, and both local development servers.

### Key decisions

- Kept Sprint 1 pre-gauntlet: inspect and report proposed files, enforce the fence, then reset all uncommitted work without committing or retrying.
- Treat only `userland/src/**` as mutable; `userland/AGENTS.md`, the shell, and the kernel are rejected by deterministic path inspection.
- Implement single-flight as a module-level boolean covering mutations, with requests returning immediately and progress flowing over SSE.

## 2026-07-15 — Restore build-log rule and resume

### Prompt

> Agents.md should be updated now with the new instructions, re-add the old build log request and proceed

### Actions

- Reread the newly populated root `AGENTS.md` before resuming and appended the prior build-log requirement without replacing any architecture guidance.
- Corrected the interrupted scaffold's strict TypeScript route-parameter errors and reconciled the implementation with the nine invariants.
- Completed and verified the kernel scaffold, runtime fence, isolated userland, development runner, smoke tests, lint, typecheck, and localhost endpoint checks.

### Key decisions

- Preserve the architecture document verbatim and add the build-log contract as its own final section.
- Replace shell-visible implementation jargon with warm product language while retaining the required SSE protocol event names.
- Resolve failures as exactly one `refused` fence outcome or one `reverted` operational outcome; successful Sprint 1 proposals are reset and reported as `done`.

## 2026-07-15 — Add the validation gauntlet and hardening runner

### Prompt

> Continue in this repo. Read AGENTS.md again — invariants 2, 4, 6, and 9 are the subject of this sprint. Append to the build log when done.
>
> First, a semantic correction to Sprint 1. Sprint 1 ran Codex, inspected the proposed files, reset all uncommitted work, and reported done. That stub branch must be deleted, not extended. After this sprint, done is emitted only after commit() returns successfully — it means the harness committed, never "Codex produced something plausible." The only terminal states are done, refused, and reverted; there is no path where the userland resets and the user is told the change is theirs.
>
> Implement kernel/gauntlet.ts and wire it into POST /request:
>
> Fence first: after Codex finishes, run diffNames() → checkFence(). Any violation: resetHard(), emit refused with a plain-language explanation naming no internals ("That part isn't mine to change — it keeps everything else safe"), and stop. No retries on fence violations — refusal is deterministic.
> Then in order: tsc --noEmit scoped to userland, eslint scoped to userland, vitest smoke suite. On any failure: capture the tool's error output, feed it back to Codex in the same working directory as a follow-up instruction ("Your change failed validation with these errors: … Fix them without expanding the scope of the change"), and re-run the full gauntlet. Maximum 2 retries, then resetHard(), emit reverted ("That one didn't work — I've put everything back the way it was"), and write a failure entry to hardening-log.json.
> On pass: commit(userText) — the user's words verbatim as the message, whatever language they're in — then emit done. Vite HMR handles the live swap; the kernel does nothing to trigger it.
>
> Create the smoke suite at userland/src/**tests**/smoke.test.tsx (runs against the stub for now): every widget in the registry renders in jsdom without throwing; App.tsx has a default export; a static check that no userland file imports from kernel/ or shell/ paths.
>
> Then add scripts/harden.ts (npm run harden): reads an array of test requests from scripts/taxonomy.json, runs each through the full request pipeline sequentially, and appends { request, outcome: done|refused|reverted, retries, durationMs, failureReason? } to hardening-log.json. Seed taxonomy.json with three placeholder requests.
>
> Also, the github repo is [Jeremiah-Sakuda/Sikia](https://github.com/Jeremiah-Sakuda/Sikia) commit frequently and push at the end of each turn

### Actions

- Replaced the Sprint 1 reset-and-done branch with `kernel/gauntlet.ts`, enforcing fence → userland typecheck → userland lint → smoke suite, up to two error-fed retries, commit-only success, deterministic refusal, and logged reversion.
- Added the jsdom smoke suite, a stub widget registry, scoped userland commands, three-request taxonomy, and sequential `npm run harden` runner with the required JSON log schema.
- Initialized the supplied GitHub repository, created frequent checkpoint commits, and verified strict typechecking, both lint scopes, 13 tests, the scoped gauntlet commands, and production userland compilation.

### Key decisions

- Make `commit(userText)` the final fallible harness operation before returning `done`; it receives the user's text unchanged and is never called from the server directly.
- Restart the entire ordered gauntlet after each follow-up, while fence violations always reset and refuse immediately with zero retries.
- Keep `hardening-log.json` ignored so operational logging cannot contaminate later fence diffs; the hardener avoids duplicating reverted entries already written by the gauntlet.
