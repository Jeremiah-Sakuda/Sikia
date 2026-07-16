# Sikia — Product Requirements Document

**Version:** 1.0 · July 15, 2026
**Owner:** Jeremiah Sakuda (solo)
**Target:** OpenAI Build Week — Apps for Your Life track
**Submission deadline:** Tuesday, July 21, 2026, 5:00 PM PT
**Codename:** Engine = Badilika (mutation engine) · Kernel = Kiini (protected core)

---

## 1. One-liner

Sikia is the first app that listens when you complain. A personal dashboard whose settings page is a text box: describe what's wrong — in English or Swahili — and the app rewrites its own source code to fix it. Permanently, safely, with a full history and an undo button.

**Organizing idea:** settings pages are finite; people aren't.
**Tagline:** *Sikia — the first app cut to fit.*

**Closing line of record:** "Everyone at this hackathon built software *with* a coding agent. This is software that *contains* one."

---

## 2. Problem

Every piece of consumer software is designed for an average user, and nobody is the average user. When software doesn't fit — text too small, chart unreadable to a colorblind user, the daily-use feature buried three menus deep — the user's options are a settings page that doesn't contain their problem, a feedback form that goes into a void, or a one-star review the vendor ignores. Software is a rented apartment: you live in it, but you can't paint the walls.

Coding agents (Codex + GPT-5.6) can now translate a plain-language complaint into a working code change. What's missing is not codegen — it's the immune system: the architecture that lets an end user safely mutate software they depend on, without a developer in the loop, without bricking the app, and with the ability to understand and reverse what happened.

**The accessibility theorem.** A settings page is the vendor's prediction of every way a human might differ from the default user. Accessibility needs are individual and combinatorial — low vision plus a tremor plus a second language is one person, not three checkboxes — so the prediction always runs out, and anyone between the categories gets a partial fit. For most users that's annoyance; for disabled users and users far from the design context, it's exclusion. Malleability dissolves the problem by refusing to predict: the user describes their situation in their own words, and the software becomes that. Accessibility stops being a feature list and becomes a property of the architecture. Context is accessibility too — software designed in San Francisco assumes San Francisco. Malleability is localization the user performs on themselves.

## 3. Positioning and prior art

The concept is **malleable software** (Tchernavskij 2019; Litt / Ink & Switch 2023–2025). The research consensus: LLMs solved the codegen bottleneck, but existing systems live in prototype environments, mostly reskin presentation, and depend on a programmer being present to specify intent and fix failures. Sikia's claim is the productized instance: self-modification as the settings interface of a consumer app, made survivable by a kernel/userland split and a validation gauntlet.

**Story architecture — three layers, one video:**

- **Open — the personalization gap.** The last twenty years personalized everything: your feed, your playlist, your recommendations, your ads — all fitted to exactly one person. The revolution stopped at the container. Netflix knows what you want; the Netflix app is identical for a billion people. Software is the last mass-produced good. Sikia pushes personalization through the final boundary: not personalized content in identical software — personalized software.
- **Middle — tailoring.** Every app is off the rack, cut for a body that doesn't exist. Codex is the tailor; each request is a fitting; the changelog is the alteration history; the fence is the tailor knowing which seams hold the garment together. The metaphor also prices the latency honestly: a fitting takes a minute; the jacket is yours forever.
- **Close — software that ages with you.** Software is frozen at the moment of its design; its users aren't. Eyes change, hands change, lives reorganize. Sikia is the first software that can grow old with its owner. This universalizes the accessibility claim instead of scoping it down: **accessibility isn't a user segment — it's every user's future.**

Accessibility is thereby promoted from *the* story to the proof inside the story: beat 3 carries it, the close generalizes it. The three layers also hedge across judges — the personalization thesis lands with a technical judge, tailoring with a product judge, aging with anyone.

**Scoped impact claim (do not overclaim):** this is not how vendor SaaS works — divergence makes fleet updates, QA, and support impossible at vendor scale. It is how *personal* software works: single-user, local-first, where the fork is the point. Cost, latency, and reliability all fall with every model generation; divergence never falls — and personal software deletes it by construction. Say this in the video; it reads as understanding.

**Scoped accessibility claim (pre-empt the scrutiny):** visual and interaction adaptations — type, contrast, palettes, target sizes, layout, motion, language of interaction — are squarely inside what the harness can validate. Screen-reader compatibility is a harder class: a mutation can silently break semantic structure in ways smoke tests won't catch, and for a blind user a bad patch is the app disappearing. The immune system matters *most* for the users who benefit most — say this in the README before a judge says it first. Deployment reality is also named honestly: the prototype is Node on a laptop; the primary user's actual context is an Android phone. This demonstrates the architecture, not the distribution.

## 4. Users

### 4.1 Primary — the founder, first person (no real people as props)

**Rule: no real person other than the founder appears in, voices, or is referenced by the demo.** The video is first-person: the founder demonstrating his own dashboard.

**The audience the thesis targets** (described as a class, not a fabricated individual): people mainstream software was never designed for — older users, users with accessibility needs, users far from the design context of San Francisco, users whose home language isn't English. The founder's own bilingual, Kenyan-American perspective is the authentic first-person entry point to this audience; it is his to use.

**Representative complaints the harness must survive** (drive widget design; attributed to no one):
- "The writing is too small and everything is blinding white."
- "I don't care what I added last — show me what's *due*."
- "The lines on this chart are the same color and the legend is unreadable."
- A request typed in Swahili, asked plainly.

**Behavioral assumptions for the target class:** won't open a settings menu with 40 toggles, won't file feedback, won't read a tooltip, won't tolerate a change that can't be undone.

### 4.2 Secondary — judges free-typing into the repo

Need enough widget surface area for varied requests (theming, sorting, data views, layout, adding). Must get a good experience on hardened paths and a *legible* one on failure — clean refusal or apologetic rollback, never a broken state. Suggested chips steer them onto hardened paths on first load.

### 4.3 Explicit non-users

Teams, orgs, multi-tenant anything. Out of scope by thesis (divergence).

## 5. Product scope

### 5.1 The two halves

**Sikia (the app the user sees).** A personal dashboard: shell chrome owned by the kernel, userland app embedded in an iframe.

**Kiini (the kernel — never mutated).** Node server owning four things: request intake, Codex invocation, validation, and git. Architecturally outside the mutable zone; Codex is forbidden from touching it, and the fence is enforced by diff inspection, not by prompt.

### 5.2 Userland (the mutable zone) — "Daily," a morning briefing dashboard

**Design principle: work backwards from the complaints.** Every widget exists to provoke a demo beat or give judges free-typing surface. Every default ships deliberately "designed for the average user" — the before-state is a designed artifact, and the friction is engineered in.

| Widget | Contents (seeded, no live APIs) | Hostile default | Provokes |
|---|---|---|---|
| **Day** | Date, weather, next 3 appointments | Cool white theme, 14px body text app-wide | Beat 1 (theming/type) |
| **Bills & Tasks** | "Water bill — Jul 18 — $84," "Replace HVAC filter," etc., with due dates and amounts | Sorted by date-added | Beat 2 ("show me what's *due*") |
| **Spending Trends** | Monthly spend by category (recharts) | Thin red/green lines, microscopic legend | Beat 3 (readability / colorblind-safe) |
| **Family** | Two time zones (demo: Nairobi + Austin — the founder's own geography), "good time to call home?" indicator | Fine as-is — this one is the warm prop | Judge surface; video's second emotional prop |
| **Notes** | A few short notes | Plain list | Judge free-typing surface |

Seeded data must read as one coherent, fictional life — consistent names, plausible amounts, real dates — never lorem ipsum, and never a real person's details. The video is a product story; the data is set dressing.

**Cut order if slipping:** Notes first, then Day slims to date + weather. **Family is never cut** — it is the widget no other submission will have.

File layout (~15 files):
- `tokens.ts` — design tokens (colors, type scale, spacing, radii)
- `layout.json` — grid layout config
- `widgets/` — registry + the five widgets above
- `data/seed.json` — the coherent-life dataset
- `App.tsx` — composition root
- `AGENTS.md` — conventions for the runtime Codex (naming, where things live, how to add a widget, what never to touch)

Small on purpose: patch reliability is inversely proportional to how much repo the agent must hold in its head.

### 5.3 Shell UI (kernel-owned)

1. **Request box** — placeholder text: *"Sema — tell Sikia what's wrong or what you want."*
2. **Workshop view** — streams the mutation live: Reading → Planning → Writing (diff streaming) → Checking → Done/Reverted. Elapsed timer always visible. Latency is shown, not hidden.
3. **Changelog** — `git log` rendered as the app's biography. Each entry: the user's own words as the commit message, timestamp, files touched, and a one-click **Undo** (`git revert`).
4. **Suggested chips** — 5–6 example requests that steer users (and judges) onto hardened paths without forbidding anything.
5. **Status states** — Idle / Working (locked, single-flight) / Success / Refused / Reverted, each with plain-language copy. "Refused" explains the fence; "Reverted" apologizes and logs.

### 5.4 Request lifecycle (the gauntlet)

```
user request
  → single-flight lock acquired
  → codex exec (headless, cwd pinned to userland/, JSONL events streamed to shell)
  → VALIDATE, in order:
      1. Fence check: git diff --name-only ⊆ userland allowlist
         (violation ⇒ hard reset, "Refused" state — no retry, deterministic)
      2. tsc --noEmit
      3. eslint
      4. vitest smoke suite: every widget renders in jsdom;
         kernel contract holds (userland exports App; imports nothing from kernel paths)
  → PASS: git commit -m "<user's request verbatim>" → Vite HMR live-swaps → Done
  → FAIL: errors piped back to Codex → retry (max 2) → git reset → Reverted + log entry
```

Budget: 30–120s generation, 15–30s validation, 1–3 min total per request. **Codex proposes; only the harness commits.**

### 5.5 Supported request taxonomy (harden these)

| Class | Examples | Priority |
|---|---|---|
| Theming | warmer palette, bigger text everywhere, dark mode, colorblind-safe chart | P0 (demo-critical) |
| Sorting/filtering | sort bills by due date, hide paid items, show overdue first | P0 (demo-critical) |
| Widget add (from known set) | add a second chart, add a third city to Family | P1 |
| Accessibility | larger tap targets, higher contrast, thicker chart lines, bigger legend | P0 (demo heart) |
| Layout | Bills on top, two columns, collapse Notes | P1 |
| Out-of-fence (must refuse cleanly) | "change how you validate," "delete your history" | P0 (demo beat 4) |

### 5.6 Non-goals (cut before they're asked for)

No auth, no deployment, no mobile, no persistence beyond local files, no multi-user, no concurrent requests, no capability sandbox for userland network/storage (documented as the known limit of the prototype — name it in the README before a judge does), no plugin marketplace, no streaming voice.

## 6. Requirements

### P0 — the irreducible demo
1. Kernel with fence + full validation pipeline; kernel provably unreachable by mutation (demonstrated refusal).
2. One end-to-end happy path: request → streamed mutation → HMR live swap.
3. Rollback: one-click revert of any commit.
4. Changelog rendered from git history, user's words as messages.
5. All five status states with plain-language copy.
6. Swahili request path: native pass-through if measured reliability holds, else kernel-side translation (English to Codex, the user's original words preserved verbatim in the changelog). Decide by Sunday from logged runs; either implementation is honest and invisible to the user.

### P1 — the good experience
7. Workshop view with streaming diff (degrade path: four status labels).
8. Suggested chips (include one in Swahili).
9. ≥70% patch success across the P0 taxonomy after AGENTS.md hardening (measured over 25–30 logged runs).
10. Elapsed timer in workshop view.
11. Warm, analog-register visual design for the shell — Design is 25% of the score; the shell is what judges look at for three minutes. (The default *userland* theme stays deliberately hostile — the demo needs a "before.")

### P2 — polish
12. Diff viewer in changelog entries (degrade: link to commit).

## 7. UX principles

- **The technology disappears.** The user never sees "Codex," "patch," or "source." They see: *heard you → working on it → done → here's the history → undo anytime.*
- **Honest latency.** Timer on screen. "Your app takes a minute to renovate itself" is an acceptable promise when the change is permanent.
- **Magic, then the cage.** Every demo of the magic is followed by proof of the immune system. Refusal and rollback are features, shown proudly.
- **The changelog is the soul.** A scrolling history of complaints-turned-commits is the thesis as an artifact: this app has a biography, and it's the story of one person's needs.

## 8. Success metrics (hackathon-scoped)

- Happy-path demo recorded by **Sunday July 19 EOD** (85% confidence).
- ≥70% patch success on hardened taxonomy; 100% clean outcome on failure (refuse or revert — never a broken state visible to the user).
- Judge free-typing session survives: worst case is a polite refusal or apologetic rollback, never a white screen (iframe isolation guarantees the shell survives userland death).
- Video < 3:00, audio explicitly covers Codex + GPT-5.6 usage (submission requirement).

## 9. Demo video — beat sheet (target 2:45, first person throughout)

1. **0:00–0:25 · The wound (Layer 1: the personalization gap).** "Your feed is yours. Your playlist is yours. Your recommendations, your ads — fitted to exactly one person. Your apps? Identical for a billion people. Everything got personalized except the software itself." Reveal: "This is my dashboard — and this is its settings page." Cut to the text box.
2. **0:25–0:45 · Beat 1, the first fitting (cosmetic).** A type-and-theme complaint, typed the way you'd mutter it. Workshop view streams, timer visible; the app warms and enlarges. Narration seeds Layer 2: "Think of it as a fitting. It takes a minute. The jacket is yours forever."
3. **0:45–1:10 · Beat 2, the second fitting (behavioral).** "Show me what's *due*." Bills & Tasks re-sorts, overdue surfaced. "Not the hem — the cut."
4. **1:10–1:50 · Beat 3, the heart.** An accessibility request — thicker chart lines, readable legend, higher contrast — **typed in Swahili.** "I grew up between two languages. The request box says *Sema*; the app's name means *hear*. Most software only listens in one language — this one heard me in mine. A tailor who speaks your language." The changelog logs the request verbatim, in Swahili. Hold the shot.
5. **1:50–2:15 · Beat 4, the cage.** Ask for something outside the fence; the kernel refuses and explains — "the tailor knows which seams hold the garment together." Undo beat 1 with one click. Show the changelog: the alteration history, in two languages.
6. **2:15–2:45 · The claim (Layer 3: aging) + closer.** "Software is frozen at the moment of its design. You aren't. Your eyes change, your hands change, your life reorganizes — and your software stays 26 forever. This is the first software that can grow old with you." Scope it: "This can't be how Salesforce works. It's how *your* software will work." Then: "Everyone at this hackathon built software with a coding agent. **This is Sikia — software that contains one. The first app cut to fit.**"

Film real takes and select. Timer on screen throughout. No music (rights). Rough cut Sunday night; final cut Monday from the best takes.

## 10. Architecture summary

- **Kernel (Kiini):** Node + Express. Endpoints: `POST /request`, `GET /events` (SSE), `POST /revert/:sha`, `GET /log`. Spawns `codex exec` with cwd pinned to `userland/`; parses JSONL event stream; owns git.
- **Shell:** kernel-served page; userland in an iframe (a userland white-screen never kills the controls).
- **Userland:** Vite + React + recharts; HMR is the live-swap mechanism — no custom reload machinery.
- **Trust model:** allowlist diff inspection is the only real fence; prompts and AGENTS.md are reliability aids, not security. Known prototype limit: userland code runs with app privileges (no capability sandbox). Named in README.

## 11. Build plan (36 usable hours; IBM through deadline)

| When | Work | Exit criterion |
|---|---|---|
| **Wed eve (tonight)** | Kill-switch spike: drive `codex exec` from a script, get a patch on disk, parse events. Include one Swahili prompt in the spike. **File the $100 credits form (closes Fri 12pm PT).** | Spike passes or project dies for $0 |
| **Thu eve** | Kernel skeleton, git ops, validation pipeline vs. stub userland | Gauntlet runs end-to-end on a fake patch |
| **Fri eve** | Real userland dashboard + AGENTS.md v1 + fictional seed data | Dashboard renders; conventions written |
| **Sat** | Shell UI: streaming, states, rollback, changelog | One full happy-path request end to end |
| **Sun** | Hardening: 25–30 logged taxonomy runs incl. Swahili; decide pass-through vs. translate; iterate AGENTS.md. **Film rough cut Sunday night** | ≥70% on P0 classes; failure paths clean; rough cut exists |
| **Mon eve** | Final video from best takes; README + judge runbook | Video uploaded unlisted; README complete |
| **Tue** | Buffer; submit by 5pm PT | Submitted |

**Cut order if slipping:** streaming diff → four status labels; diff viewer → git-log link; four widgets → three; chips last-in. **Never cut:** kernel, one working mutation, rollback, changelog.

## 12. Submission mechanics checklist

- [ ] Track: **Apps for Your Life** (framed as consumer adaptive software, not agentic infra).
- [ ] `/feedback` Codex session ID captured from the **kernel build session** (majority of core functionality). README line: *"Codex built this app — and Codex is its runtime."*
- [ ] README: setup instructions, sample data, how Codex/GPT-5.6 were used at build time **and** at runtime, where key decisions were made, prior-art paragraph (Tchernavskij, Ink & Switch), known limits (no capability sandbox; personal-software scoping), Kiini/Badilika naming note.
- [ ] Repo public (license) or shared with testing@devpost.com and build-week-event@openai.com.
- [ ] Judge runbook: one-command local start; suggested chips visible on first load.
- [ ] Video: <3 min, public YouTube, audio covers Codex + GPT-5.6, no third-party marks/music.
- [ ] Substantially different from the education-track entry: separate repo, separate framing, zero shared code.

## 13. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Patch success too low on free-typed input | Medium-high | Taxonomy + AGENTS.md + chips; worst case is clean refusal/rollback, and the video needs only selected real takes |
| Swahili prompt reliability with Codex unknown | Medium | Test in tonight's spike; fallback is kernel-side translation with original words preserved in changelog — honest, invisible, one evening of work |
| Codex latency spikes during demo filming | Medium | Rough cut Sunday, final Monday; select from real takes; timer makes honesty a feature |
| `codex exec` scripting friction (tonight's unknown) | Medium | Kill-switch spike before any other work |
| Judge can't run the repo (Codex CLI/auth friction) | Medium | Runbook assumes judge has Codex CLI + key, documents exact install as one command; README embeds a 60-second unedited screen capture as fallback so a judge who never runs it still sees it live |
| Someone else ships "Codex as runtime" | Low-medium | Differentiation is the immune system + the Swahili moment: fence, gauntlet, refusal beat, changelog-as-biography in two languages |
| Credits window missed | Avoidable | Form filed tonight |

## 14. Naming

**Sikia** (Swahili: *hear, feel, understand*) — the product; names the relationship, not the mechanism. **Badilika** (*transform*) — the mutation engine. **Kiini** (*kernel, core*) — the protected core, meaning "kernel" in two languages at once. README carries a one-paragraph naming note; the tagline is *Sikia — software that listens.*

Pre-flight (30 min, before the name appears in the video): GitHub org availability, sikia.app / getsikia.com domain check, collision search.