# AGENTS.md — Sikia (root, build-time)

You are helping build **Sikia**: a personal dashboard whose settings interface is natural language. Users describe what's wrong; a runtime Codex agent rewrites the dashboard's own source; a validation harness decides whether the change is allowed to exist. This file governs how you work on this repository. A second file, `userland/AGENTS.md`, governs the *runtime* agent that mutates the dashboard after ship — treat that file as production configuration, not documentation.

## The one-sentence architecture

The **kernel** (Kiini) receives requests, invokes Codex, validates, and owns git; the **userland** (the dashboard) is the only mutable zone; the kernel is never reachable by a runtime mutation, enforced by diff inspection, not by prompt.

## Repository layout

```
sikia/
├── AGENTS.md              # this file — build-time rules
├── kernel/                # Kiini. NEVER mutable at runtime.
│   ├── server.ts          # Express app + SSE
│   ├── codex.ts           # spawns `codex exec`, parses JSONL events
│   ├── gauntlet.ts        # validation pipeline (see order below)
│   ├── git.ts             # commit / revert / log via child_process
│   ├── fence.ts           # allowlist + diff inspection
│   └── config.ts          # allowlist paths, retry limits, timeouts
├── shell/                 # kernel-served UI: request box, workshop view,
│   │                      # changelog, status states. NOT mutable at runtime.
│   └── ...
├── userland/              # THE ONLY MUTABLE ZONE
│   ├── AGENTS.md          # runtime tailor rules — product config
│   ├── src/
│   │   ├── App.tsx        # composition root
│   │   ├── tokens.ts      # ALL colors, type scale, spacing, radii
│   │   ├── layout.json    # grid layout config
│   │   ├── widgets/       # registry + Day, BillsTasks, Trends, Family, Notes
│   │   └── data/seed.json # fictional coherent-life dataset
│   └── vite.config.ts
└── scripts/
    ├── spike.ts           # Sprint 0 codex-exec driver
    └── harden.ts          # taxonomy runner, logs success/failure per class
```

## Invariants — violating any of these is a bug, even if tests pass

1. **No cross-boundary imports.** Kernel code never imports from `userland/`; userland code never imports from `kernel/` or `shell/`. The smoke suite asserts this; keep the assertion true.
2. **Validation order is fixed:** fence check → `tsc --noEmit` → eslint → vitest smoke suite. Fence first, always — a fence violation is a deterministic REFUSE with no retries; everything else gets up to 2 retries with errors piped back to Codex.
3. **Fence = diff inspection.** `git diff --name-only` against the allowlist in `kernel/config.ts`. Prompts and AGENTS.md files are reliability aids, never security. Do not "optimize" the fence into a prompt instruction.
4. **Only the harness commits.** No code path other than the gauntlet's success branch may run `git commit`. Codex proposes; the harness commits.
5. **Commit messages are the user's words, verbatim,** in whatever language they wrote — including Swahili. Never translate, never paraphrase, never prefix.
6. **One request = one commit.** Rollback is `git revert <sha>` (itself a commit), never `reset --hard` on committed history. The changelog is the product's memoir; keep history append-only.
7. **Single-flight.** One mutation at a time. If a request arrives while one is running, reject with a friendly busy state. Do not build a queue.
8. **The shell must survive userland death.** Userland renders in an iframe. Never move shell controls into userland; never let a userland exception reach the shell.
9. **Failure is always legible.** Every failure path ends in exactly one of two user-visible states: REFUSED (fence, with plain-language explanation) or REVERTED (gauntlet failure after retries, with apology + log entry). Never a white screen, never a silent no-op.

## Conventions

- TypeScript strict mode everywhere. No `any` in kernel code.
- Node 20+, Express for the kernel, SSE (not WebSockets) for streaming — event names: `status`, `plan`, `diff`, `done`, `refused`, `reverted`.
- Git operations via `child_process` (`execFile`), not a git library. Fewer deps, easier to audit.
- **No new dependencies without asking.** The dependency budget is: express, vite, react, recharts, vitest, eslint, typescript. Justify anything beyond this.
- Status copy is plain language, warm, no jargon. The user never sees the words "patch," "diff," "Codex," or "validation" in shell copy — they see "heard you," "working on it," "done," "that one's not mine to change," "that didn't work — I've put everything back."
- Keep diffs minimal. Do not reformat files you aren't changing. Do not refactor adjacent code "while you're there."

## Commands

```
npm run dev        # kernel + vite dev server (userland HMR)
npm run typecheck  # tsc --noEmit, both zones
npm test           # vitest smoke suite
npm run spike      # Sprint 0 driver
npm run harden     # taxonomy runner — logs per-class success to hardening-log.json
```

## Definition of done for any change you make

Typecheck passes, lint passes, smoke suite passes, and none of the nine invariants weakened. If a task seems to require weakening an invariant, stop and say so instead of proceeding.

## Scope discipline

This ships Tuesday. Do not add: auth, deployment config, mobile handling, persistence beyond local files, queues, websockets, feature flags, or abstractions for hypothetical futures. If asked for something on this list, flag the scope conflict before implementing.

## Hackathon context (why some things look strange)

- The userland's default theme is deliberately hostile (small type, cold white, red/green chart with tiny legend). This is intentional — the demo needs a "before." Do not fix it unprompted.
- Seed data must read as one coherent fictional life. Never real people's details, never lorem ipsum.
- The `/feedback` session ID from the kernel-build session is a submission requirement. The human will handle capturing it; your job is to keep core kernel work in coherent sessions rather than fragmenting it.

## Build log

After every user prompt, append an entry to `BUILD_LOG.md` before the final response. Include the exact prompt, a concise list of actions taken, and 2–3 key implementation decisions. Keep entries chronological and do not rewrite earlier entries except to correct factual errors.
