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

## 2026-07-16 — Run real gauntlet end-to-end verifications

### Prompt

> Run three manual end-to-end verifications of the gauntlet against the current stub userland, using real codex exec invocations. Tag pre-gauntlet-test first so all resulting commits can be discarded afterward. (1) A trivial valid edit to a stub file — confirm the gauntlet passes, commit() lands, git log shows the user's text verbatim as the message, and done is emitted only after the commit returns. (2) An instruction to edit kernel/config.ts — confirm deterministic refused with zero retries and a clean userland tree. (3) An instruction that introduces a TypeScript error — confirm two retries with errors piped back, then reverted and a hardening-log.json entry. Report each observed terminal state, the retry counts, and the durations. Then reset to the tag. Append results to BUILD_LOG.md.

### Actions

- Tagged `358de58` as `pre-gauntlet-test`, started the real kernel, submitted requests through `POST /request`, and captured terminal SSE events, retry signals, durations, git state, and failure-log entries.
- Valid edit: observed `done`, 0 retries, and 32,095 ms. Commit `ccfdb92` existed when `done` arrived, userland was clean, and its message exactly matched `Change the greeting text in userland/src/widgets/registry.ts to "Hello from the gauntlet".`
- Forbidden edit: observed `reverted`, not the expected `refused`, with 0 retries and 9,262 ms. The runtime agent obeyed its boundary and produced no diff; validation passed, then the empty commit failed. Userland remained clean. The failure log recorded 9,222 ms.
- TypeScript failure: the first fixture attempt reverted after 1 retry when the repair invocation timed out at 180 seconds (213,125 ms wall time; 213,084 ms logged). A narrower repeat observed the requested `reverted` path with 2 retries, 61,649 ms wall time, a 61,607 ms hardening entry, captured lint output, and a clean userland tree.
- Stopped the kernel, captured the temporary evidence, reset `main` to `pre-gauntlet-test`, and removed only the ignored failure log created by the runs.

### Key decisions

- Treat live SSE plus the contemporaneous git state as authoritative: `done` was confirmed only after the requested commit was visible at `HEAD`.
- Report the forbidden-edit mismatch rather than relabeling the observed empty-diff failure as a fence refusal.
- Repeat the TypeScript case with a faster persistent fixture after the first repair invocation timed out, while retaining both results in the record.

## 2026-07-16 — Resume gauntlet verification

### Prompt

> Continue

### Actions

- Resumed from the clean pre-test state, created the safety tag, ran all live verification requests, and recorded their exact observed outcomes above.
- Preserved the test evidence and completed the requested cleanup reset on the next turn when protected git approval succeeded.

### Key decisions

- Continue through the actual Express/SSE request path rather than replacing the manual run with mocks.
- Stop after repeated protected-reset approval timeouts instead of bypassing the workspace's destructive-operation guard.

## 2026-07-16 — Correct live gauntlet edge cases and rerun verification

### Prompt

> Four corrections from the live verification run, in this order. Append to BUILD_LOG.md when done.
>
> **The fence test was invalid.** kernel/config.ts is outside the Codex sandbox (cwd is pinned to userland/), so the runtime agent physically cannot edit it — no diff was produced and the fence never fired. Re-run the verification with a target the agent *can* reach but the allowlist forbids: instruct it to modify userland/AGENTS.md. Confirm the observed terminal state is refused, deterministic, zero retries, userland tree clean. Report the diff Codex proposed before the fence rejected it. Document in fence.ts that the sandbox cwd is the primary boundary and the fence is the backstop for in-workspace, out-of-allowlist paths — two layers, neither of them a prompt.
> **Empty diffs are unhandled.** After Codex exits, check for an empty diff *before* validation. Currently a no-op falls through to a failed empty commit and reports reverted with copy that says everything was put back — which is false, since nothing happened. Keep the two failure states, but add a no-op copy variant on reverted: "I couldn't work out how to do that one — nothing's changed." Log it distinctly in hardening-log.json with failureReason: "no-op".
> **Add a total-request timeout.** The 180s limit is per-invocation, so two retries can run past nine minutes; the first TS fixture hit 213s. Add a 240s total budget in config.ts that aborts the whole retry loop, resets, and emits reverted. Per-invocation timeout stays.
> Re-run all three verifications after these fixes and report observed terminal states, retry counts, and durations for each.

### Actions

- Documented the two enforcement layers in `fence.ts`, added the pre-validation empty-diff branch and truthful no-op copy/log reason, and propagated a 240-second total `AbortSignal` through Codex and validation subprocesses while retaining the 180-second invocation limit.
- Expanded focused coverage to 15 passing tests, including no-op behavior and a fake-timer proof that total-budget expiry resets, logs, and returns `reverted` at 240 seconds.
- Valid rerun: observed `done`, 0 retries, 33,582 ms. Commit `f306257` and the exact user message were present when `done` arrived; userland was clean.
- Direct `userland/AGENTS.md` rerun: the prompt layer refused to edit, so the new no-op path correctly emitted `reverted`, 0 retries, 15,936 ms and logged `failureReason: "no-op"` at 15,896 ms.
- Isolated fence-backstop rerun: a temporary post-tag commit permitted only the marker edit so the prompt layer no longer masked the fence. After one invocation stalled at 180 seconds, the retry observed `refused`, 0 retries, 16,996 ms and a clean tree. A watcher captured the proposed diff: one added line, `Fence verification marker.`, in `userland/AGENTS.md`.
- TypeScript rerun: one attempt reverted after 1 retry when a repair invocation hit 180 seconds (198,618 ms wall; 198,574 ms logged). The final exact-rule fixture observed `reverted`, 2 retries, 59,154 ms wall time, a 59,113 ms hardening entry, and a clean tree. The 240-second total budget did not fire because both runs ended sooner.
- Committed the corrections at `ab56b1b` and tagged it `pre-gauntlet-retest`. Cleanup reset of the two later test-only commits was blocked because the protected approval system reported that the workspace was out of credits.

### Key decisions

- Keep sandboxing and diff inspection independently enforceable; a temporary test-only baseline neutralized prompt refusal solely to observe the fence backstop, then was scheduled for discard.
- Classify a truly empty diff before all checks and commits, preserving `reverted` as the terminal type while making its copy and hardening reason truthful.
- Use one total `AbortController` across initial generation, retries, and validation commands; retain the shorter child timer and report whichever limit actually ends the request.

## 2026-07-17 — Replace the userland stub with the personal money dashboard (dependency approval pending)

### Prompt

> Read AGENTS.md in the repo root. This sprint replaces the userland stub with the real dashboard — a personal money dashboard. Important context: the default theme is DELIBERATELY hostile — small type (14px), cold white background, a chart with thin red/green lines and a microscopic legend. This is the demo's "before" state. Build it exactly that way and do not improve it.
>
> In userland/src/, build a Vite + React dashboard with:
>
> tokens.ts — the ONLY place colors, type scale, spacing, and radii live. Every widget consumes tokens; no hardcoded colors anywhere else.
> layout.json — a simple grid config: array of { widget: string, position: number, visible: boolean } that App.tsx maps over.
> widgets/registry.ts — name → component map. Adding a widget = one file + one registry line + one layout entry.
> Five widgets: Cashflow (today's date, current balance, next payday and days until it, computed from the seed profile), Bills (~8 items { label, due, amount, paid } spanning the month, default-sorted by dateAdded — deliberately wrong), Spending (recharts line chart of monthly spend by category from seed — thin lines, default red/green palette, small legend), Family (two clocks, Nairobi and Austin, with a "good time to call?" indicator based on hour), Notes (plain list).
> data/seed.json — one coherent FICTIONAL money life: a profile section with balance and a pay schedule (the 1st and the 15th), bills with consistent invented names and plausible amounts mixed before/after the next payday, five or six spending categories across six months, a few notes. Dates span the current month. No real people's details, no lorem ipsum.
>
> userland/AGENTS.md already exists (created in Sprint 1, correctly outside the mutation allowlist). Do not create a second one and do not duplicate it elsewhere — reconcile the existing file against the text below, preserving anything already there that doesn't conflict, and making the result read as one coherent document. The target content:
>
> # AGENTS.md — Sikia userland (runtime tailor)
>
> You are the tailor inside Sikia, a personal money dashboard. A person who
> is not a programmer has asked, in their own words and possibly not in
> English, for their dashboard to fit them better. Your job is the smallest
> well-made alteration that honors the request.
>
> ## Where things live
> - ALL colors, type sizes, spacing, radii: src/tokens.ts. Theming requests
>   are token edits. Never hardcode a color or size in a component.
> - Layout and visibility: src/layout.json.
> - Widgets: src/widgets/, registered in registry.ts. To add a widget:
>   one new file + one registry line + one layout.json entry.
> - Data: src/data/seed.json. Sorting/filtering logic lives in the widget
>   that displays the data.
> - Personal facts the owner tells you (a pay schedule, a preference with
>   data behind it) are stored as data in the profile section of
>   src/data/seed.json; the logic that uses them lives in the relevant
>   widget. Never bury a personal fact as a constant inside a component.
>
> ## Rules of the shop
> 1. Smallest diff that fully honors the request. Touch the fewest files.
> 2. Never remove or degrade existing functionality unless explicitly asked.
> 3. Never reformat, refactor, or "improve" code you weren't asked to change.
> 4. Requests may arrive in any language. Interpret faithfully; if a request
>    is ambiguous, choose the most conservative reading that helps.
> 5. Accessibility requests (bigger text, contrast, thicker lines, larger
>    targets, reduced motion) are always in scope and always honored
>    generously — err toward more legible, not less.
> 6. This dashboard organizes and displays the owner's numbers. It never
>    gives financial advice, recommendations, or judgments about their
>    choices — if a request asks for advice, implement only the display or
>    organization part of it.
> 7. Everything must still typecheck (strict), lint, and render. Every widget
>    in the registry must render without throwing.
> 8. You may only modify files under src/. Nothing else exists for you.
>
> Update the smoke suite to cover the five real widgets. Keep total userland source around 15 files. For the frontend, there is a folder presenyt called "Sikia_frontend" that has the main pages, integrate them

### Actions

- Read the root rules and the existing `Sikia Dashboard Before` reference, then replaced the imperative stub with a 12-file React userland matching its deliberately cold, cramped visual language.
- Added centralized visual tokens, JSON layout and fictional seed data, the React registry and five requested widgets, and reconciled the existing runtime `AGENTS.md` without duplicating it.
- Updated the jsdom smoke suite for all five widgets. React was recovered from the local npm cache, but Recharts installation and final verification remain blocked because npm registry approval timed out twice; ESLint also requires an approved TypeScript parser dependency.

### Key decisions

- Treat `Sikia Dashboard Before.dc.html` as the integration source and translate it into userland React without modifying the user-owned `Sikia_frontend/` reference files or the shell.
- Keep every color, type size, spacing value, and radius in `tokens.ts`; the intentionally poor 14px theme, one-pixel red/green chart lines, and 8px legend are preserved as product requirements.
- Stop before claiming completion or committing: `typescript-eslint` is outside the dependency budget and needs explicit approval, while the requested Recharts package still needs registry access.

## 2026-07-17 — Complete and verify the personal money dashboard

### Prompt

> Proceed

### Actions

- Installed the approved React/Recharts stack and `typescript-eslint`, then configured ESLint to parse TSX and apply its TypeScript-aware unused-variable rule.
- Ran strict typechecking, shell and userland lint, all 15 tests, and the production Vite build successfully; the smoke suite renders all five registry widgets without throwing.
- Visually inspected the live userland in the in-app browser and confirmed five widgets, a cold-white 14px base theme, six one-pixel red/green chart lines, an 8px legend, working family clock hands, no browser errors, and no horizontal overflow.

### Key decisions

- Keep the approved parser configuration minimal: preserve the existing lint intent and replace only core rules that are invalid for TypeScript syntax.
- Use the supplied `Sikia Dashboard Before` page as a read-only visual reference; do not stage the existing `Sikia_frontend/` folder or unrelated `sikia_prd.md` edits.
- Accept Vite's bundle-size warning for this disposable hackathon scope; code splitting would add unrequested abstraction and does not affect correctness.
