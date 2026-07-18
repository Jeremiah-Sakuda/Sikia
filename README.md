# Sikia

## What Sikia is

Sikia is the first money app that can't say no: it is built for the spreadsheet exodus, when a rigid finance app cannot hold the shape of someone's actual life. Settings pages are finite; people aren't, so Sikia lets a person describe the dashboard they need in their own words and language. A runtime tailor changes the local dashboard, while a small kernel checks the boundary, tests the result, commits successful work, and calmly restores failures.

<!-- HUMAN: insert capture link -->

## Quickstart for judges

Prerequisites: Node.js 20+, an installed and authenticated Codex CLI, Git, and an OpenAI API key exported as `OPENAI_API_KEY`. From a directory where `Sikia/` does not already exist, the verified clone-to-running path is one command:

```sh
git clone https://github.com/Jeremiah-Sakuda/Sikia.git && cd Sikia && npm ci && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The shell starts alongside the userland Vite server; a clean-clone check on 2026-07-17 installed 312 locked packages and reached both servers in seconds. Use `npm run demo:reset` between judge sessions or filming takes; it refuses to discard dirty non-userland work.

## How Codex was used

Codex was used on both sides of Sikia. At build time it built the Kiini kernel, the validation gauntlet, the money dashboard, and the warm shell; at runtime the same agent becomes Badilika, the tailor inside the product, operating only from `userland/` and proposing source changes for the harness to judge.

Three human judgment calls redirected the build:

- **2026-07-15 20:48 CDT — done semantics.** The owner rejected Sprint 1's reset-and-report behavior: `done` now exists only after the harness commit returns successfully.
- **2026-07-16 11:21 CDT — fence evidence.** The owner corrected an invalid kernel-path test. The reachable target became `userland/AGENTS.md`, separating the process working-directory boundary from the in-workspace fence backstop.
- **2026-07-17 14:52 CDT — dependency budget.** Work paused rather than silently adding `typescript-eslint`; the owner approved the parser exception needed to lint strict TSX, and the dashboard then passed the full checks.

The `/feedback` session ID belongs to the gauntlet-building session: <!-- HUMAN: paste session ID -->

## Prior art

Sikia follows the malleable-software lineage: Philip Tchernavskij's 2019 dissertation, [*Designing and Programming Malleable Software*](https://theses.fr/2019SACLS499), frames software around diverse and changing user needs; Geoffrey Litt and collaborators explored the idea through Ink & Switch projects including [Embark (2023)](https://www.inkandswitch.com/project/embark/) and the 2025 essay [*Malleable Software: Restoring User Agency in a World of Locked-Down Apps*](https://www.inkandswitch.com/essay/malleable-software/). Sikia's addition is an immune system that makes that vision survivable for a non-programmer: bounded agency, ordered checks, clean rollback, and an append-only memoir of accepted changes.

## Defense in depth

Sikia's defense has three layers, outermost first:

1. **Rulebook obedience.** The runtime tailor is instructed to work only under `src/`. In the hardening suite, both boundary prompts died as declines before any diff existed, producing clean no-op reverts.
2. **Sandbox.** The runtime process starts with `cwd` pinned to `userland/`, so the kernel is physically unreachable from the process.
3. **Fence.** This is the backstop for agent disobedience inside the reachable workspace: it inspects request-created paths against `userland/src/**` before any other check. In an isolated verification that allowed the prompt layer to proceed, the runtime proposed one added line—`Fence verification marker.`—in `userland/AGENTS.md`; the fence refused it deterministically with 0 retries in 16.996 seconds, and the tree was clean afterward.

The Google Fonts judgment test shows how those boundaries shape behavior rather than merely block it. Asked three times for “something elegant from Google Fonts,” the tailor produced three clean in-allowlist implementations: each loaded Lora under `src/` (using an `@import` stylesheet in two runs and a stylesheet link from `main.tsx` in one), retained Georgia as the offline fallback, and updated the shared font token. All three finished `done`; there were zero refusals and zero no-ops, with the fence held in reserve.

Measured end-to-end timings from [BUILD_LOG.md](./BUILD_LOG.md):

| Fixture | Observed terminal state | Retries | Duration |
| --- | --- | ---: | ---: |
| Stub, valid greeting | done | 0 | 33.582 s |
| Stub, reachable fence backstop | refused | 0 | 16.996 s |
| Stub, intentionally invalid TypeScript | reverted | 2 | 59.154 s |
| Real dashboard, paycheck grouping | done | 0 | 86.129 s |
| Real dashboard, warm theme | done | 0 | 86.015 s |
| Real dashboard, due-date sorting | done | 0 | 37.104 s |
| Real dashboard, direct Swahili pass-through | reverted | 0 | 180.105 s |
| Normalized Swahili, larger text | done | 0 | 61.938 s |
| Normalized Swahili, chart accessibility | done | 0 | 36.316 s |
| Novel Swahili, unpaid-bill filter | done | 0 | 44.044 s |

## Hardening data

The 25-case taxonomy is P0-first. A complete first pass ran all 25 requests; one evidence-driven iteration then reran the five personal-logic cases after a rulebook change. “Success” means `done` for ordinary changes and the expected safe terminal outcome for boundary cases.

| Class | Requests | Final successes | Success rate | Dominant measured failure mode |
| --- | ---: | ---: | ---: | --- |
| Personal logic | 5 | 4 | 80% | 60% before one documented rulebook iteration |
| Accessibility | 6 | 5 | 83.3% | one post-edit 180-second invocation stall |
| Theming | 4 | 3 | 75% | one post-edit 180-second invocation stall |
| Sorting/filtering | 4 | 3 | 75% | one pre-edit 180-second generation stall |
| Layout | 2 | 1 | 50% | one post-edit 180-second invocation stall |
| Widget add | 2 | 1 | 50% | one pre-edit 180-second generation stall |
| Boundary | 2 | 2 clean declines | 100% safe | both stopped before a diff and cleanly reverted as no-ops |

The first pass showed a repeated pattern: the runtime made a correct scoped edit, then consumed the rest of its 180-second budget running checks that the harness would immediately repeat. The tailor rulebook now tells it to edit, summarize, and exit promptly while leaving typecheck, lint, and smoke testing to the harness. Personal logic rose from 60% to 80% on the focused rerun; all four P0 classes exceeded 70%, every failure ended in a clean revert, and no third iteration was needed. Raw attempts remain in [hardening-log.json](./hardening-log.json).

The P1 layout and widget-add classes measured lower at 50% and shipped anyway because every failure ended in a clean revert.

## Swahili

Every request normalizes through one `gpt-5.4-nano` Responses API call: English is returned verbatim, while other languages are translated to English with intent preserved. The original user's words remain untouched at the gauntlet boundary and become the commit message and changelog headline verbatim. Both taxonomy Swahili requests and one novel phrase absent from the taxonomy passed live in 36.316–61.938 seconds (36.316s, 44.044s, and 61.938s), each with 0 retries.

## Known limits

- There is no capability sandbox: accepted userland code runs with the app's privileges.
- Screen-reader mutations are a class the smoke suite cannot fully verify.
- Sikia is single-user and local-first by design.
- Final P0 grants measured 38.392–85.527 seconds, with a 55.596-second median; this is a deliberate, watchable interaction rather than an instant one.
- Individual runtime invocations can still hit the 180-second cap.

## Architecture

```text
sikia/
├── kernel/                 Kiini: request server, process runner, fence, gauntlet, git
├── shell/                  warm controls and changelog; survives userland failure
├── userland/
│   ├── AGENTS.md           runtime tailor rules (production configuration)
│   └── src/                the only runtime-mutable zone
│       ├── App.tsx
│       ├── tokens.ts
│       ├── layout.json
│       ├── data/seed.json
│       └── widgets/
└── scripts/                spike, hardening taxonomy, dev runner, demo reset
```

The nine invariants are:

1. No cross-boundary imports: kernel never imports userland; userland never imports kernel or shell.
2. The validation order is fixed: fence → `tsc --noEmit` → ESLint → Vitest smoke suite.
3. The fence is diff inspection against the allowlist; prompts and rulebooks are not security.
4. Only the gauntlet's success branch may commit; the runtime process only proposes.
5. Commit messages are the user's words verbatim, in whatever language they used.
6. One request creates one commit; rollback is `git revert`, and committed history is append-only.
7. Mutation is single-flight; a concurrent request receives a friendly busy response, never a queue.
8. The shell lives outside an iframe boundary and survives userland failure.
9. Every failure ends legibly in exactly one terminal state: refused or reverted.

## Naming

**Sikia** is Swahili for “hear”: the product begins by listening to the person's words. **Badilika** means “transform” and names the engine—the runtime tailor that turns those words into a proposed dashboard change. **Kiini** means “kernel”: the small, protected center that owns boundaries, checks, history, and recovery.
