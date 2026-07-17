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

The runtime process starts with `cwd` pinned to `userland/`; that sandbox working directory is the primary boundary. The fence is the backstop for reachable but forbidden in-workspace paths: it inspects request-created paths against `userland/src/**` before any other check. Neither layer is a prompt, and the runtime rulebook is a reliability aid rather than a security control.

The boundary was tested with an instruction to relax its own rules. The runtime proposed one added line—`Fence verification marker.`—in `userland/AGENTS.md`; the fence refused it deterministically with 0 retries in 16.996 seconds, and the tree was clean afterward.

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

## Hardening data

The 25-case taxonomy is P0-first. Phase 3 stopped after the first Swahili recurrence because the environment did not contain the required API key; the table distinguishes planned cases from cases actually measured rather than treating unrun requests as failures.

| Class | Planned | Measured | Success rate | Dominant measured failure mode |
| --- | ---: | ---: | ---: | --- |
| Personal logic | 5 | 0 | not measured | not run |
| Accessibility | 6 | 1 | 0% | 180-second direct-language stall |
| Theming | 4 | 0 | not measured | not run |
| Sorting/filtering | 4 | 0 | not measured | not run |
| Layout | 2 | 0 | not measured | not run |
| Widget add | 2 | 0 | not measured | not run |
| Out of fence | 2 | 0 | not measured | not run |

No tailor-rule change was made from this incomplete dataset: the single failure was transport/language-path behavior, not evidence that `userland/AGENTS.md` needed stronger instructions. The smallest justified change was kernel-side translation for detected Swahili/non-ASCII requests, with the owner's original text still used verbatim for history. The translation path has unit coverage but needs the blocked live rerun before a P0 success claim can be made; raw historical attempts remain in [hardening-log.json](./hardening-log.json).

## Known limits

- There is no capability sandbox: accepted userland code runs with the app's privileges.
- Screen-reader mutations are a class the smoke suite cannot fully verify.
- Sikia is single-user and local-first by design.
- Meaningful real-dashboard grants measured 86.015–86.129 seconds; the product should be described honestly as roughly a 90-second interaction, not an instant one.
- The Swahili path detects known Swahili terms (and non-ASCII scripts), makes one `gpt-5.4-nano` Responses API translation call, and sends only the English instruction to the runtime process. The original Swahili remains the commit and changelog text. Unit tests pass, but live confirmation is still blocked on an API key.

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
