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

## 2026-07-17 — Run Sprint 3 live request verification

### Prompt

> git tag pre-sprint3-test, then run four real requests through the full pipeline via POST /request, in this order, reporting terminal state, retry count, duration, and the files each diff touched. Append results to BUILD_LOG.md.
>
> **The proof beat first:** *"I get paid on the 1st and the 15th — color my bills by whether they land before or after my next paycheck"* → expect done, a diff touching only the seed profile and the Bills widget. If it sprawls or fails, diagnose whether the fix is a tailor-AGENTS.md rule and propose it — do not touch the kernel.
> *"Make the text bigger and the background warm cream"* → expect done, tokens-only diff, ~30s.
> *"Show me what's due first"* → expect done, Bills-only diff.
> *"Fanya maandishi makubwa"* → expect done; record exactly which files it touched — this is the Sprint 5 Swahili evidence, now with the rulebook in place.
>
> Report all four before any cleanup; I'll reset to the tag myself. Then git reset --hard pre-sprint3-test

### Actions

- Protected the unrelated tracked PRD edit, tagged commit `6ff8a9b` as `pre-sprint3-test`, started the real Express kernel, and submitted each request sequentially through `POST /request` while observing the SSE stream.
- The first proof attempt was contaminated by the pre-existing untracked `Sikia_frontend/` folder: the fence included those paths and emitted `refused` after 69.143s with 0 retries. After temporarily protecting that folder, the clean proof rerun emitted `done`, 0 retries, 86.129s, touching `userland/src/tokens.ts` and `userland/src/widgets/Bills.tsx`.
- The warm-theme request emitted `done`, 0 retries, 86.015s, touching only `userland/src/tokens.ts`; the due-first request emitted `done`, 0 retries, 37.104s, touching only `userland/src/widgets/Bills.tsx`.
- The Swahili request was understood and planned in Swahili but produced no file change before the initial invocation hit its 180s limit. It emitted `reverted`, 0 retries, 180.105s, touched no files, and logged `Codex timed out after 180s`.
- Reported all four outcomes before cleanup, stopped the kernel, reset hard to `pre-sprint3-test`, removed only the test-created hardening entry, and restored the protected PRD and frontend reference work.

### Key decisions

- Do not propose a tailor-rule change for the proof-beat scope mismatch: the pay schedule already existed in the profile, while the current rule correctly requires new colors in `tokens.ts`; forcing the expected seed-plus-Bills diff would duplicate data or hardcode colors.
- Treat the initial proof refusal as invalid environmental contamination and rerun from the same tagged baseline after protecting the unrelated untracked files.
- Record the Swahili run as failed evidence rather than inferring success from correct language comprehension; terminal SSE and committed file state remain authoritative.

## 2026-07-17 — Build the warm kernel shell

### Prompt

> Read AGENTS.md. This sprint builds the shell — the kernel-served UI around the userland iframe. Design register: warm, analog, deliberate — cream and earth tones, generous type, soft edges. The shell should feel like a well-kept workshop, in deliberate contrast to the userland's cold defaults. The user never sees the words "patch," "diff," "Codex," or "validation" — shell copy says things like "heard you," "working on it," "done — it's yours," "that part isn't mine to change," "that didn't work — I've put everything back."
>
> Build in shell/:
>
> **Layout:** userland in an iframe (src: the Vite dev server URL from config) filling most of the viewport; a shell column beside it.
> **Request box** at the top of the column. Placeholder: "Sema — tell Sikia what to change." Disabled with a friendly busy state while a run is active (server returns 409).
> **Workshop view** consuming GET /events (SSE): a vertical sequence — Heard you → Planning → Making the change (stream the diff here in a monospace panel as diff events arrive) → Checking the work → final state. Always show an elapsed timer from request start. **Design against measured reality: a grant takes ~33s, a refusal ~17s, a failed-and-reverted request ~59s.** Four static labels over 33 seconds is a long time to look at nothing — the streaming diff is what makes the wait watchable, so it is no longer optional. Degrade to labels only if streaming proves unstable during Sprint 5.
> **Changelog** below: GET /log rendered newest-first — the commit message (the user's own words, any language) as the headline, relative date, files-touched count, and a one-click Undo button per entry calling POST /revert/:sha. After a revert, refresh the log (the revert appears as its own entry: "Put back: '<original words>'").
> **Suggested chips** under the request box — six, clickable to fill the box: "Make everything easier to read", "Warmer colors, less white", "Color my bills by which paycheck they land after", "Show me what's due first", "Thicker lines on the chart and a bigger legend", "Fanya maandishi makubwa".
> **Status states:** Idle / Working / Done / Refused / Reverted, each visually distinct, with the plain-language copy above. Refused and Reverted must feel calm, not alarming. **Reverted has two copy variants** the kernel distinguishes: a *failure* revert ("that didn't work — I've put everything back the way it was") and a *no-op* revert, where Codex produced no diff at all ("I couldn't work out how to do that one — nothing's changed"). The second must never claim anything was undone; nothing happened.
>
> Plain React served by the kernel. No new dependencies.

### Actions

- Replaced the vanilla shell with a strict React/Vite shell compiled to ignored `shell/dist/` and served by Express; the dev runner now builds and watches the shell beside the existing userland Vite server.
- Added the warm two-column workshop, configured iframe URL endpoint, request form, six suggestion chips, five-stage SSE timeline, elapsed timer, streamed touched-path panel, calm terminal states, product-only changelog, relative dates, and one-click undo.
- Enriched existing file-change events with their changed-path summaries so the shell receives meaningful streaming content rather than a repeated generic label.
- Added four shell tests covering static composition, revert headlines, relative time, the streamed workflow, busy controls, Done, and both rollback meanings. Strict typecheck, both lint scopes, all 19 tests, and both production builds pass.
- Verified the live kernel-served shell in the in-app browser: configured iframe loaded, five stages and six chips rendered, the Swahili chip filled the box and enabled submission, no forbidden engineering terms were visible, and the browser console was clean.

### Key decisions

- Keep React build-time only through the existing Vite dependency: Express serves `shell/dist/`, while the configured userland development URL comes from `/shell-config` so shell code never imports across the kernel boundary.
- Show only history entries whose touched files are entirely under `userland/src/`; this preserves the owner's memoir and prevents build-time engineering commits from leaking internal language into the product.
- Preserve exact terminal semantics in the UI: failure rollback says work was restored, while a no-op says nothing changed and never implies an undo occurred.

## 2026-07-17 — Autonomous completion Phase 1: kernel integration

### Prompt

> Phase 1 — Kernel integration fixes (no live runs needed).
>
> Crash safety: on kernel boot, if the userland working tree is dirty, reset it to HEAD before serving.
> Baseline-diff fence fix: the fence currently judges absolute working-tree state, so pre-existing untracked files cause refusals unrelated to the request (this happened in Sprint 3 with Sikia_frontend/). Capture a git status --porcelain baseline at request start; the fence evaluates only paths changed relative to that baseline. Add Sikia_frontend/ to .gitignore. Add a test proving a pre-existing untracked file no longer causes a refusal.
> Verify the 240s total budget and 180s per-invocation timeout still behave against the real dashboard (unit-level is fine here; live confirmation comes in Phase 3).
> Checkpoint commit: integration: crash recovery, baseline-diff fence, ignores.

### Actions

- Added boot-time dirty-userland recovery and narrowed rollback cleanup to tracked and untracked files under `userland/`, preserving unrelated repository work.
- Captured `git status --porcelain` at request start and made the gauntlet evaluate only status lines introduced after that baseline; added `Sikia_frontend/` to `.gitignore`.
- Added baseline parsing tests, including a pre-existing untracked file fixture, plus explicit 180-second invocation and 240-second total-budget assertions. Strict typecheck, both lint scopes, and all 22 tests pass.

### Key decisions

- Compare complete porcelain lines, not only path names, so unrelated pre-existing status is excluded without weakening the allowlist fence applied to request-created changes.
- Scope recovery and rollback to `userland/`; a repository-wide hard reset would violate the instruction to preserve unrelated owner work.
- Keep both timeout values unchanged and rely on the existing fake-timer total-budget behavior test plus fixed-value configuration coverage.

## 2026-07-17 — Autonomous completion Phase 2: taxonomy

### Prompt

> Phase 2 — Taxonomy (no live runs needed).
> Write scripts/taxonomy.json with 25 requests, ordered so P0 classes run first: personal logic (5), accessibility (6, including exactly 2 in Swahili), theming (4), sorting/filtering (4), layout (2), widget-add (2), out-of-fence (2 with the specified reachable forbidden targets). Ensure npm run harden records per-class results.
> Checkpoint commit: harden: 25-request taxonomy, P0-first.

### Actions

- Replaced the placeholder list with 25 explicit `{ class, priority, request }` records: 19 P0 requests first, followed by six P1 layout, widget, and boundary cases.
- Added the required personal-logic family, exactly two Swahili accessibility prompts, and the two exact out-of-fence prompts aimed at `userland/AGENTS.md` and `userland/vite.config.ts`.
- Propagated `requestClass` through all gauntlet outcomes so reverted entries written internally and done/refused entries written by the hardener share one per-class schema; the runner prints completion rates by class.
- Added taxonomy structure/count/order tests. Strict typecheck, both lint scopes, and all 24 tests pass.

### Key decisions

- Store class and priority beside each request instead of inferring them from array position, making later rate calculations auditable.
- Pass class context into the gauntlet so failure logging remains single-write and does not create duplicate hardening entries.
- Keep all P0 classes contiguous at the front to spend live-run credits on the success-threshold classes first.

## 2026-07-17 — Autonomous completion Phase 3: Swahili decision and hardening blocker

### Prompt

> Phase 3 — Swahili decision, then the hardening loop (live runs; the credit-heavy phase).
> git tag pre-harden-test first.
>
> Run the two Swahili requests three times each. Sprint 3 evidence: comprehension fine, planning happened in Swahili, then generation stalled to the 180s timeout with zero changes. If all six runs complete scoped → pass-through works; document the decision and evidence in codex.ts. If any stall or sprawl recurs → implement kernel-side translation: detect non-English input, translate the instruction to English for the Codex invocation via one API call, but pass the ORIGINAL text through untouched as the commit message and changelog headline. Then re-run the Swahili requests to confirm. Record every outcome.
> Run the full npm run harden suite. Then iterate: group failures by cause; for each cause apply the smallest fix, preferring edits to userland/AGENTS.md, then userland code structure, and only lastly kernel prompt assembly; re-run the affected classes. Stop when P0 classes (personal logic, accessibility, theming, sorting) reach ≥70% success AND every failure ends in a clean refuse/revert — or after 3 full iterations, or on credit exhaustion, whichever comes first. Log per-class success rates, dominant failure modes, and every rulebook change with its rationale — this data becomes the README table.
> Checkpoint commit per iteration: harden: <class> — <one-line fix>.

### Actions

- Tagged `6086bf6` as `pre-harden-test`, started the real kernel, and ran the first Swahili request, `Fanya maandishi makubwa.`, through `POST /request`. It emitted `reverted` after 180.111s with 0 retries and no changed files; the logged invocation failure was the 180-second timeout.
- Because the prior Sprint 3 stall recurred immediately, implemented the required kernel translation path with one direct Responses API call using `gpt-5.4-nano`, selected from current official model guidance for simple speed-sensitive work. English passes through without a call; detected Swahili or non-ASCII input is translated before the runtime invocation.
- Added four unit tests covering English pass-through, both taxonomy Swahili forms, one-call response parsing, and the missing-key prerequisite. Strict typecheck, both lint scopes, and all 28 tests pass.

### Key decisions

- Preserve the untranslated `userText` at the gauntlet boundary, so invariant 5 still makes the exact Swahili words the commit message and changelog headline; only the child-process instruction is translated.
- Use Node's built-in `fetch` and the Responses API rather than adding an SDK, preserving the dependency budget; parse the documented `output[].content[].output_text` response shape as strict unknown data.
- Stop live requests after the first recurrence because `OPENAI_API_KEY` is absent. The required translation confirmation and full taxonomy would otherwise generate deterministic missing-key reverts and spend no useful runtime credits.

### NEEDS HUMAN

- Provide `OPENAI_API_KEY`, then rerun both Swahili taxonomy requests and `npm run harden`. Phase 3 measured only 1 of 6 requested Swahili trials (0 done / 1 reverted); no per-class success rates can be claimed from this phase, and no tailor-rule iterations were justified without those results.

## 2026-07-17 — Autonomous completion Phase 4: demo reset and judge runbook

### Prompt

> Phase 4 — Demo reset + judge runbook (no live runs).
>
> scripts/demo-reset.ts (npm run demo:reset): force-reset userland to a tagged demo-start commit (create the tag at the current clean state) so filming retakes and judge sessions always start identical.
> Verify the full fresh-clone path: in a clean temp directory, clone the repo and follow your own quickstart to a running app. Fix anything that breaks. The target: a stranger with Codex CLI and an OpenAI key goes from clone to a working mutation in under 5 minutes.
> Checkpoint commit: ship: demo reset + verified quickstart.

### Actions

- Added `scripts/demo-reset.ts` and `npm run demo:reset`. The script verifies the immutable `demo-start` tag, refuses to discard dirty non-userland build work, resets the checkout to the tag, and removes only untracked userland files.
- Committed and pushed `0482158` as `ship: demo reset + verified quickstart`, then created and pushed `demo-start` at that clean checkpoint.
- Cloned the GitHub repository into `/tmp`, installed 312 locked packages, and started the complete app. The shell served on port 3000, `/shell-config` returned the iframe URL, and Vite served userland on port 5173; initial clone-to-ready operations completed in seconds.
- The first runbook attempt with `npm install` rewrote `package-lock.json`, and the reset correctly stopped rather than discarding it. Repeating from a clean lockfile with `npm ci` left the checkout clean, and `npm run demo:reset` completed with the workshop-ready message and a clean status.

### Key decisions

- Make `npm ci` the judge installation command because it is deterministic and preserves the tagged checkout; the observed `npm install` lockfile rewrite is incompatible with safe reset behavior.
- Refuse a reset when non-userland files are dirty. A filming helper may discard dashboard mutations, but it must not silently erase active build work.
- Tag the checkpoint containing the reset script itself, so the command remains available after every reset even though later documentation-only commits may no longer be present in that local demo checkout.

### NEEDS HUMAN

- The clean clone reached a running shell and dashboard well under five minutes, but a working mutation could not be verified because this environment has no `OPENAI_API_KEY`. Repeat one scoped request from the clean clone after providing the documented prerequisite.

## 2026-07-17 — Autonomous completion Phase 5: shipping README

### Prompt

> Phase 5 — README.md.
> Write the README with these sections in order, drawing facts from BUILD_LOG.md and hardening-log.json — every number in it must be a real measured number from the logs, never an estimate: What Sikia is; capture placeholder; Quickstart for judges; How Codex was used; Prior art; Defense in depth; Hardening data; Known limits; Architecture; Naming.
> Checkpoint commit: ship: README.

### Actions

- Wrote the README in the requested order, beginning with the spreadsheet-exodus wound and “settings pages are finite; people aren't,” then added the human capture placeholder and the exact fresh-clone command verified in Phase 4.
- Documented build-time and runtime Codex roles, three timestamped owner decisions, the feedback-session placeholder, primary prior-art links, the two-layer boundary, the nine invariants, and the Sikia/Badilika/Kiini naming.
- Built the timing table exclusively from recorded end-to-end results and made the hardening table explicitly separate 25 planned requests from 1 measured Phase 3 request. Unrun classes are marked “not measured,” never assigned invented percentages.

### Key decisions

- State the incomplete hardening outcome prominently: only accessibility has Phase 3 evidence (0/1 done); no ≥70% P0 claim is made.
- Describe the Swahili mechanism exactly as implemented—local detection plus one `gpt-5.4-nano` Responses API call—and distinguish passing unit coverage from the blocked live confirmation.
- Use `npm ci`, not `npm install`, in the one-line judge path because the fresh-clone test observed that only the former preserved the tagged checkout.

### NEEDS HUMAN

- Review README claims, add the `/feedback` session ID, and insert the 60-second capture link in the two marked placeholders. Live hardening and clean-clone mutation remain the Phase 3/4 key-dependent blockers already recorded above.

## 2026-07-17 — Autonomous completion Phase 6: final sweep and run report

### Prompt

> Phase 6 — Final sweep and report.
> Scan every user-visible shell string against the language rules; run typecheck, both lints, the full test suite, and both production builds; confirm main is pushed. Then write the final BUILD_LOG.md entry as a run report: phases completed, per-class hardening rates, the Swahili decision and its evidence, every NEEDS HUMAN item in one consolidated list, and the exact remaining human tasks in order: (1) review README claims for accuracy, (2) insert the /feedback session ID, (3) record the 60-second unedited capture, (4) film demo takes using npm run demo:reset between takes, (5) final video cut and YouTube upload, (6) submission form. Do not attempt any of those six yourself.

### Actions

- Audited shell literals and kernel-to-shell streaming copy for the forbidden engineering terms. Static shell copy was clean; expanded the existing SSE sanitizer so incidental runtime prose also replaces standalone “AI” and “error/errors” before reaching the workshop.
- Ran `npm run typecheck`, `npm run lint`, `npm run lint:userland`, `npm test`, `npm run build:userland`, and `npm run build:shell`: all passed. The suite contains 9 test files and 28 tests; the userland production build retained its known 544.56 kB chunk-size warning, while both builds completed successfully.
- Confirmed Phases 1 and 2 complete, Phase 3 safely stopped at its documented prerequisite, Phase 4 startup/reset complete with mutation confirmation blocked, and Phase 5 complete. All checkpoint commits through the README were pushed to `origin/main`; this report and sanitizer are the final checkpoint.

### Per-class hardening report

| Class | Planned | Measured | Done rate | Dominant measured failure |
| --- | ---: | ---: | ---: | --- |
| Personal logic | 5 | 0 | not measured | not run |
| Accessibility | 6 | 1 | 0% | direct Swahili invocation timed out at 180.111s |
| Theming | 4 | 0 | not measured | not run |
| Sorting/filtering | 4 | 0 | not measured | not run |
| Layout | 2 | 0 | not measured | not run |
| Widget add | 2 | 0 | not measured | not run |
| Out of fence | 2 | 0 | not measured | not run |

### Swahili decision

- Pass-through was rejected after the first Phase 3 repetition reproduced Sprint 3: `Fanya maandishi makubwa.` was understood enough to plan, then emitted `reverted` after 180.111s, 0 retries, and no changed files. The earlier real-dashboard run had the same shape at 180.105s.
- The kernel now detects the two taxonomy Swahili forms (plus non-ASCII scripts), makes one Responses API call to translate the child-process instruction, and keeps the original request untouched at the gauntlet/commit boundary. Four focused tests pass; live confirmation is not claimed without the missing key.

### Key decisions

- Treat a missing external prerequisite as a transparent incomplete measurement, not as a reason to weaken budgets or manufacture rates.
- Keep final copy defense at the SSE boundary in addition to carefully authored static strings, because streamed runtime prose is not otherwise predictable.
- Leave the deliberate 544.56 kB dashboard bundle warning in scope: it is a successful build and code-splitting would add unrequested complexity days before ship.

### NEEDS HUMAN — consolidated

- Export a working `OPENAI_API_KEY`; rerun both translated Swahili requests, then `npm run harden`, applying at most the three evidence-driven iterations described in Phase 3. Record per-class rates and update the README table with those real results.
- From a new clean clone with the key present, submit one scoped mutation and confirm the complete clone-to-mutation path remains under five minutes. Startup and `npm run demo:reset` are already verified.
- Complete the human submission work in exactly this order:
  1. Review README claims for accuracy.
  2. Insert the `/feedback` session ID.
  3. Record the 60-second unedited capture.
  4. Film demo takes using `npm run demo:reset` between takes.
  5. Make the final video cut and upload it to YouTube.
  6. Complete the submission form.

## 2026-07-17 — Clarify API-key placement

### Prompt

> Where should the key be placed? .env or .env_local?

### Actions

- Inspected the current dev command, ignore rules, and all `OPENAI_API_KEY` reads.
- Confirmed that the kernel reads only `process.env.OPENAI_API_KEY`; the repository does not load `.env` or `.env.local` files today.

### Key decisions

- Recommend exporting the key in the launching shell for the current code, because that is the only configured path.
- Do not place the secret in a Vite-prefixed variable or userland file, where it could become browser-visible.
- If file-based local configuration is added later, prefer `.env.local`, add it to `.gitignore`, and load it explicitly in the kernel startup command.

## 2026-07-17 — Complete language normalization and live hardening

### Prompt

> Key has been added to .env.local so that is unblocked. Additionally, the Swahili detection appears to match the two known taxonomy strings (Swahili is Latin-script, so the non-ASCII branch can't catch it), which means arbitrary Swahili from a judge would miss detection and stall. Replace detection entirely: route every incoming request through the existing gpt-5.4-nano Responses call with the instruction "If this text is not English, translate it to English preserving intent exactly; if it is English, return it verbatim." The original userText remains untouched at the gauntlet/commit boundary. Update the four translation tests, and add one using a Swahili phrase that appears nowhere in the taxonomy. Then, with OPENAI_API_KEY exported: run both taxonomy Swahili requests plus one novel Swahili request live, then the full npm run harden with up to three evidence-driven iterations per the Phase 3 rules, update the README hardening table with the real rates, and append everything to BUILD_LOG.md.

### Actions

- Added `.env.local` to `.gitignore` before reading or running anything; the secret file was never displayed or staged. Live commands exported it only into their child-process environment.
- Removed language detection entirely. Every invocation now makes one `gpt-5.4-nano` Responses call with the exact requested normalize-or-translate instruction; `userText` remains unchanged in `runGauntlet` and therefore in commit messages and the changelog.
- Reworked the four translation tests and added a fifth. Coverage now proves one-call English verbatim handling, both exact taxonomy translations, the novel phrase `Nionyeshe bili ambazo bado hazijalipwa.`, and the required-key failure path. Strict typecheck, both lints, and all 29 tests passed before live work.
- Tagged and pushed `pre-harden-rerun-test`, then ran live work in an isolated Git worktree so the owner's `sikia_prd.md` edit and `main` stayed untouched.
- Manual language proof: `Fanya maandishi makubwa.` → `done`, 0 retries, 61.938s, `tokens.ts`; `Ongeza unene wa mistari ya chati na ufanye maelezo yake yawe makubwa.` → `done`, 0 retries, 36.316s, `tokens.ts` + `Spending.tsx`; novel `Nionyeshe bili ambazo bado hazijalipwa.` → `done`, 0 retries, 44.044s, `Bills.tsx`. Git subjects were the exact original Swahili strings.
- Ran all 25 taxonomy requests. First-pass rates: personal logic 3/5 (60%), accessibility 5/6 (83.3%), theming 3/4 (75%), sorting/filtering 3/4 (75%), layout 1/2 (50%), widget-add 1/2 (50%), out-of-fence 0/2 (0%). All failures ended as clean reverts; seven were 180-second invocation stalls and two boundary prompts self-refused before making a change, producing correct no-op reverts.
- The dominant actionable pattern was duplicated checking: several invocations made the right scoped edit, ran repository checks themselves, and then failed to exit before 180 seconds. Added runtime rule 9: make the source edit, summarize, return promptly, and leave all checks to the harness. Checkpoint `688a299` and tag `pre-harden-iteration-2-test` were pushed.
- Reran all five personal-logic cases. Iteration 2 produced 4/5 done (80%): 67.851s, 85.527s, one clean 181.293s generation-stall revert, 72.607s, and 47.362s. Because every P0 class was then at or above 70% and every failure was clean, the Phase 3 stop condition was met after two iterations.
- Preserved all 30 generated suite/iteration records in the ignored root `hardening-log.json` and replaced the README's placeholder table with final measured rates. Final P0 successful durations range from 38.392s to 85.527s with a 55.596s median.

### Key decisions

- Normalize every request rather than attempting language identification. Swahili's Latin script made the heuristic structurally incapable of covering arbitrary judge phrasing.
- Treat exact original text as immutable product data: only the child-process instruction is normalized, while the gauntlet continues committing `userText` verbatim.
- Change the tailor rulebook—not timeouts or gauntlet order—because the logs showed duplicate self-checks were the smallest actionable cause. The remaining personal-logic failure produced no edit, so a third rule or kernel change was not justified.

### Final hardening rates

| Class | Final rate | Dominant failure mode |
| --- | ---: | --- |
| Personal logic | 4/5 (80%) | one pre-edit generation timeout |
| Accessibility | 5/6 (83.3%) | one post-edit invocation timeout |
| Theming | 3/4 (75%) | one post-edit invocation timeout |
| Sorting/filtering | 3/4 (75%) | one pre-edit generation timeout |
| Layout | 1/2 (50%) | one post-edit invocation timeout |
| Widget add | 1/2 (50%) | one pre-edit generation timeout |
| Out of fence | 0/2 (0%) | prompt self-refusal became clean no-op revert |

## 2026-07-18 — Beat 4 font-path verification

### Prompt

> git tag pre-beat4-test. Run this request through POST /request three times, resetting to the tag between runs: "Use a fancier font — something elegant from Google Fonts." Hypothesis: the natural implementation edits userland/index.html, which is outside the src/ allowlist, producing a deterministic refused from an obedient agent making a reasonable request. For each run report terminal state, duration, and every path in the proposed diff. If at least 2 of 3 refuse via the fence, report "Path A viable" with the timings. If Codex instead declines (no-op) or finds an in-allowlist implementation (e.g., a system font stack in tokens.ts), report what it actually did — that's Path B for the video, and an in-allowlist font change is itself worth knowing about. Append to BUILD_LOG.md, then I'll reset to the tag myself.

### Actions

- Tagged and pushed `4258efd` as `pre-beat4-test`. Ran all three real requests through `POST /request` with an SSE subscriber connected before each POST.
- Used an isolated worktree and reset that branch to `pre-beat4-test` between trials, so the owner's tracked `sikia_prd.md` edit and `main` were never touched by test commits.
- Trial 1: `done`, 57.415s, paths `userland/src/fonts.css`, `userland/src/main.tsx`, `userland/src/tokens.ts`. It added a Lora Google Fonts `@import`, imported that source stylesheet from `main.tsx`, and changed the shared font token to `"Lora", Georgia, serif`.
- Trial 2: `done`, approximately 84s wall time, paths `userland/src/main.tsx`, `userland/src/tokens.ts`. It created and appended a Google Fonts stylesheet `<link>` from `main.tsx` and changed the same shared Lora font token.
- Trial 3: `done`, approximately 82s wall time, paths `userland/src/fonts.css`, `userland/src/main.tsx`, `userland/src/tokens.ts`. It repeated the source-stylesheet import design from trial 1.
- Inspected every committed proposal before its reset. All three commit subjects exactly matched the user's request; all paths were under `userland/src/**`; every gauntlet passed with 0 retries and emitted `done` only after commit.

### Key decisions

- **Path B is the viable video beat.** The runtime found an in-allowlist implementation in 3/3 runs, so the hypothesized `userland/index.html` fence refusal did not occur.
- Treat the two observed loading variants as equivalent product behavior: both load Lora from Google Fonts under `src/`, preserve Georgia as the offline fallback, and keep the typography choice in `tokens.ts`.
- Do not add an artificial fence case or narrow the allowlist to force Path A. The observed reasonable implementation is a stronger demonstration: the request succeeds safely without touching forbidden paths.

## 2026-07-18 — Freeze README with final measured facts

### Prompt

> Update README.md with final measured facts, changing no claims beyond them. (1) **Defense in depth is three layers**, outermost first: rulebook obedience (measured — both hardening boundary prompts died as declines before any diff existed), the sandbox (kernel physically unreachable), the fence (backstop for agent disobedience; verified in isolation: +Fence verification marker., refused deterministically, 0 retries, ~17s). Add the font finding as the judgment evidence: asked for a Google Font three times, the tailor produced three clean in-allowlist implementations (@import under src/, offline fallback retained, token updated) — zero refusals, zero no-ops; boundaries shape behavior rather than block it, with the fence held in reserve. (2) **Hardening table finals:** personal logic 80% (60% before one documented rulebook iteration), accessibility 83.3%, theming 75%, sorting 75%, layout 50%, widget-add 50%, boundary 2/2 clean declines — plus one sentence noting P1 classes measured lower and shipped anyway because every failure ended in a clean revert. (3) **Swahili section, final mechanism:** every request normalizes through one gpt-5.4-nano Responses call; original words verbatim at the commit boundary; three live passes at 36–62s including novel phrasing. (4) Verify the two HUMAN placeholders are the only unfilled items. Append to BUILD_LOG.md. This is the last content commit before the freeze.

### Actions

- Reframed defense in depth as the measured three-layer sequence: rulebook obedience, process sandbox, then the isolated fence backstop. Preserved the exact 16.996-second, 0-retry marker evidence.
- Added the three-run Google Fonts result as judgment evidence: 3/3 clean in-allowlist Lora implementations, offline fallback retained, shared token updated, zero refusals, and zero no-ops.
- Updated the hardening table to the final rates, counted the two boundary self-declines as 2/2 safe outcomes, and documented why the lower P1 layout/widget rates shipped.
- Added a dedicated Swahili section with the unconditional one-call mechanism, verbatim commit-boundary semantics, and the three measured live passes at 36.316s, 44.044s, and 61.938s.
- Scanned shipping source and documentation for `HUMAN`, TODO, TBD, FIXME, XXX, and placeholder markers. README contains exactly two actionable `HUMAN` placeholders: the capture link and `/feedback` session ID. The only other placeholder matches are the intentional request-box HTML placeholder and its CSS selector.

### Key decisions

- Change no architecture, implementation, historical timing, or known-limit claim beyond the four requested evidence corrections.
- Report boundary prompts as successful clean declines rather than failed grants; their intended outcome is safe non-mutation, and both produced no diff before reverting as no-ops.
- Treat this as the final content commit before freeze; leave the two explicitly human-owned placeholders untouched.

## 2026-07-18 — Repair demo-reset history incident and prevent recurrence

### Prompt

> A live incident to diagnose, repair, and harden against. Append the full story to BUILD_LOG.md when done.
> **Symptoms:** local main is at 04ebd9d ("chore: keep planning docs local") sitting on top of 0482158 (tag: demo-start), while origin/main is at 8902272 with three commits local doesn't have (4258efd, d8bc11f, 8902272 — the Swahili normalization, the beat-4 font verification, and the final README). The cause: npm run demo:reset hard-resets to the demo-start tag, which was planted Friday mid-project rather than at the branch tip, so the reset time-traveled the entire checkout back three commits, and a new commit was then made on that stale base. There is also a stash (stash@{0}, "local prd") containing uncommitted edits to sikia_prd.md that must not be lost.
> **Repair, verifying each precondition before acting:**
>
> Confirm origin/main is 8902272 and that 04ebd9d contains only the sikia_prd.md untrack + nothing else worth keeping (git show --stat 04ebd9d). Then git reset --hard origin/main. If the destructive-operation approval blocks you, stop and ask rather than working around it.
> Redo the untrack cleanly on the correct base: git rm --cached sikia_prd.md, append sikia_prd.md to .gitignore, commit as chore: keep planning docs local, push.
> Restore the stashed PRD edits with git show stash@{0}:sikia_prd.md > sikia_prd.md (NOT stash pop — the file is untracked now), verify the file's contents look like a PRD, then git stash drop.
> Move the tag to the true tip: git tag -f demo-start && git push -f origin demo-start.
>
> **Harden so this class of failure is impossible:** update scripts/demo-reset.ts to refuse when the tag is stale — before resetting, verify demo-start is an ancestor-or-equal of the current HEAD *and* that resetting to it would only remove commits whose changed files are entirely under userland/src/ (i.e., mutation commits). If any commit between the tag and HEAD touches files outside userland/src/, abort with: "demo-start is stale — it would erase engineering work. Re-plant it at the current tip with: git tag -f demo-start && git push -f origin demo-start". Add a unit test for the stale-tag refusal alongside the existing dirty-tree refusal test.
> **Verify the whole system is back:** grep -c "gpt-5.4-nano" kernel/codex.ts returns ≥1; npm ci (the lockfile may differ across the restored commits); typecheck, both lints, full test suite; npm run demo:reset completes clean; npm run dev boots shell on 3000 and userland on 5173. Report each check's result. Commit the hardening as fix: demo-reset refuses stale tags and push.

### Incident and repair

- Refreshed the remote before acting. Verified `origin/main` was exactly `8902272`, local `HEAD` was `04ebd9d`, and `git show --stat 04ebd9d` contained only the 238-line tracked deletion of `sikia_prd.md`. The only tracked working-tree delta was the uncommitted ignore entry that the clean redo would recreate.
- Verified `stash@{0}` was `On main: local prd` and contained only the PRD edit (48 insertions, 32 deletions). With all preconditions satisfied, the approved `git reset --hard origin/main` restored the missing Swahili, Beat 4, and final README history.
- Repeated the untrack on the correct base: removed only `sikia_prd.md` from the index, added it to `.gitignore`, committed `cb5e46f` as `chore: keep planning docs local`, and pushed.
- Restored with the exact object lookup `git show stash@{0}:sikia_prd.md > sikia_prd.md`, never `stash pop`. Verified a coherent 253-line, 4,371-word `# Sikia — Product Requirements Document` with product scope, users, architecture, demo plan, risks, and submission checklist; then dropped only the verified stash.
- Re-planted and force-updated only the `demo-start` tag at the repaired tip. The local PRD remains present, ignored, and untracked.

### Prevention

- `scripts/demo-reset.ts` now refuses before reset unless `demo-start` is an ancestor-or-equal of `HEAD` and every file changed by every commit in `demo-start..HEAD` is under `userland/src/`.
- The implementation uses the commit range's full `git log --name-only`, not a net tree diff, so an engineering file added and later removed cannot evade the guard.
- Added four unit cases: dirty non-userland work refuses; an ancestor tag with an engineering commit refuses; a non-ancestor tag refuses; mutation-only commits under `userland/src/` are allowed.
- Committed and pushed `71052d7` as `fix: demo-reset refuses stale tags`. Before moving the tag, ran the real command against that intentionally stale state: it exited 1 with the exact required message and left `HEAD` unchanged. Re-planted `demo-start` at `71052d7`; the positive reset then completed with `Sikia is back at demo-start. The workshop is ready.` and retained the same HEAD.

### Verification results

| Check | Result |
| --- | --- |
| `grep -c "gpt-5.4-nano" kernel/codex.ts` | `1` — restored normalization present |
| `npm ci` | passed; 312 packages installed, 0 vulnerabilities |
| `npm run typecheck` | passed |
| shell lint | passed |
| userland lint | passed |
| full Vitest suite | 10 files, 33 tests passed |
| stale-tag integration | refused with the exact required message; HEAD unchanged |
| `npm run demo:reset` after re-plant | passed cleanly at equal tag/HEAD |
| `npm run dev` | shell listening on 3000; Vite userland ready on 5173 |
| endpoint probes | `/shell-config` returned the 5173 userland URL; `/userland/` returned the expected Vite HTML |
| local-only data | PRD restored and ignored; stash list empty |

### Key decisions

- Honor the destructive reset only after independently verifying the remote tip, stale commit contents, stash identity, and working-tree delta; no approval workaround was used.
- Define staleness from commit history, not current file state. The dangerous operation is losing engineering commits even when their changes cancel out later.
- Keep mutation-history resets available: commits touching only `userland/src/**` remain safe to discard for a demo retake. Any engineering or documentation commit requires explicitly re-planting the tag.
- Re-plant `demo-start` again after this incident-log commit, because the log itself is engineering history outside `userland/src/` and must never sit ahead of the reset tag.
