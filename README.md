# Meeting Notes Distiller Web

A small, fully offline web app that turns raw meeting-note `.txt` transcripts into a structured summary: **topics, participants, per-topic decisions, action items (who / what / by when), and flagged problems** — then lets you download the same result as **MS Word**.

Built for the assignment [Assignment - Meeting Notes Distiller Web.docx](https://sky-group.sg.larksuite.com/file/C8fpbRswIoRImBx81QnlgurlgG0).

> Deterministic **rule-based / heuristic** extraction. No LLM, no API key, no network call at runtime. English and Thai transcripts.

---

## 1. Run it on your local computer (after clone)

Requires **Node 20+** and npm.

```bash
git clone https://github.com/bn0q/ONE-SKY-AI-Next.git
cd ONE-SKY-AI-Next
npm install
npm run dev
```

Open **http://localhost:5273**. The API runs on **http://localhost:3101** (Vite proxies `/api` to it).

> Ports 3101 / 5273 are intentional — 3001 / 5173 are occupied by other projects on the author's machine. If either port is busy on yours, set `PORT=xxxx` for the API and change `server.port`/`proxy` in `frontend/vite.config.ts`.

**One-command production mode:**

```bash
npm run build && npm start   # serves the built SPA + API together on :3101
```

**All commands** (also in `CLAUDE.md`):

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (npm workspaces) |
| `npm run dev` | API (:3101) + Vite (:5273) with hot reload |
| `npm start` | Serve the production build on :3101 |
| `npm run build` | Real Vite production build of the frontend |
| `npm test` | Vitest unit suite (38 tests) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` static analysis |
| `npm run test:e2e` | Playwright E2E (first time: `npx playwright install chromium`) |
| `npm run docs` | Regenerate the SRS `.docx` and the test-case `.xlsx` files |

---

## 2. What the app does (functions)

1. **Upload** — choose one or more `.txt` files at once, or add more across several rounds; the staged list accumulates (duplicates by name+size are ignored).
2. **Process** — press **Process N files**; the backend parses every file together and returns one combined result.
3. **Extract** — per meeting: title, date, participants, topics with per-topic summaries, decisions, and action items with owner / task / deadline.
4. **Flag problems** — `no-decision` meetings, action items with **no owner**, and **conflicting / inconsistent action items** (e.g. two go-live dates with no decision choosing one). Every flag keeps the source lines as evidence.
5. **Display** — three sections: meeting summaries (one card per meeting), action items **grouped by owner** (plus an explicit `Unassigned` bucket), and unassigned / inconsistent items.
6. **Download** — **Download as MS Word** produces `meeting-summary.docx` containing exactly the three displayed sections.
7. **Tests** — unit tests for extraction logic including the two assignment edge cases, plus Playwright E2E covering the whole browser flow.

### API

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/health` | — | `{ ok: true }` |
| `POST /api/process` | `multipart/form-data`, field `files` (N `.txt`) | `ProcessResponse` |
| `POST /api/export` | JSON `ProcessResponse` | `meeting-summary.docx` stream |

Non-`.txt` files are skipped with a `warnings[]` entry; empty files produce a `parse-error` flag; unknown content degrades to the `plain` format. The batch never throws on bad input.

### Supported transcript formats (≥3, bilingual)

| Format | Detected by | Fixture |
|---|---|---|
| `bullet-notes` | `ppl:` + `-` bullets | `samples/01_no_decisions_brainstorm.txt` (EN) |
| `structured-markdown` | `##` / `### Topic N:` + `Attendees:` | `samples/02_structured_with_followups.txt` (EN) |
| `thai-notes` | `คนเข้าร่วม:` + `-` bullets | `samples/03_thai_no_decisions_roadmap.txt` (TH) |
| `dialogue` | `[บันทึกการประชุม]` / repeated `Speaker: ` turns | `samples/04_thai_conflicting_launch.txt` (TH) |
| `plain` | fallback — never crashes | anything else |

The four `.txt` files in `samples/` are **verbatim copies** of the assignment's Lark Drive fixtures ([folder](https://sky-group.sg.larksuite.com/drive/folder/GJizfPTIql5xSjdFokOlfNykgJg)); see `samples/README.md`.

---

## 3. Project layout (Complexity Bar: 4 parts)

```
backend/     Back end — Express + multer, pure TS extraction pipeline, docx builder
frontend/    Front end — React 19 + Vite SPA
tests/       Test suite — Vitest unit tests (imports the real pure functions)
e2e/         E2E — Playwright, starts the real API + real Vite server
samples/     Assignment fixtures
docs/        SRS .docx, Unit-Test-Cases .xlsx, SIT-UAT-Cases .xlsx, spec + plan
scripts/     generate-docs.mjs (builds the Office deliverables from the code)
.claude/skills/  Project skill(s)
CLAUDE.md    Project conventions (Part 2)
```

The assignment's Complexity Bar says "at least 3 parts" but lists 4 — all 4 are delivered.

---

## 4. Design decisions (Part 1)

Recorded here as required by the assignment ("สิ่งที่ไม่ได้กำหนดเป็น scope ... ให้ระบุใน design decision") and by the working method (decisions, guesses and mistakes belong in the open).

| # | Decision | Why |
|---|---|---|
| D1 | **Rule-based / heuristic extraction**, no LLM | Chosen by the user. Deterministic, unit-testable without mocks, runs offline immediately after `clone`, no secret to ship. A single `extract()` interface is kept so an LLM adapter could replace it later; **no adapter is built** (YAGNI). |
| D2 | TypeScript + Node 20, npm workspaces | One language for FE/BE/tests; the cloned repo was empty, so there was no existing convention to follow. |
| D3 | `backend/` Express 4 + `multer` memory storage | Only 2 endpoints are needed. No database, no persistence: uploads live in the request only. |
| D4 | `frontend/` React 19 + Vite, plain CSS | One page, no router, no UI kit. Vite dev proxy → API. |
| D5 | `docx` for Word, `exceljs` for Excel | Pure-JS, no LibreOffice/Python dependency (`python-docx`/`openpyxl` are not installed in this environment). |
| D6 | Vitest (unit) + Playwright (E2E) | TS-native; E2E starts the real servers rather than mocking the boundary. |
| D7 | **E2E is implemented** although §Submit says `E2E (optional)` | §Complexity Bar requires it. The contradiction is recorded here instead of being silently resolved. |
| D8 | "At least 3 parts" but 4 bullets listed → **all 4** delivered | Failing safely on the stricter reading. |
| D9 | `samples/*.txt` copied verbatim from Lark Drive | Real fixtures keep the ≥3-format + multilingual requirement grounded in the provided data. |
| D10 | Repo used = `bn0q/ONE-SKY-AI-Next`, **provided by the user** | **Deviation**: the assignment says "สร้าง GitHub repository แบบ public ... และ clone". The user supplied the public repo instead. |
| D11 | Implementation by **Monarch**, not the `claude` CLI; SRS/PRD also authored by Monarch | **Deviation**: user explicitly skipped "รันคำสั่ง claude" (2026-11-16) because Monarch does the work. `CLAUDE.md` and `.claude/skills/` keep their required names regardless of which agent wrote them. |
| D12 | Values that cannot be extracted are `null` → rendered `—` | A missing value is not a measurement; `0` would be indistinguishable from a real zero. |
| D13 | **No `git push` in this session** | The active GitHub account has `pull` only on this repo; switching accounts is an outward action needing a separate go. |
| D14 | Ports **3101 / 5273** instead of 3001 / 5173 | Those defaults were already occupied by other local projects; we did not kill someone else's process. |
| D15 | All EN/TH keyword lists live in `backend/src/patterns.ts`, marked `GUESS (mine)` | These lists were derived from the 4 fixtures, not from the assignment text. Keeping guesses in one named place makes them reviewable and tunable. |
| D16 | Thai owner names are canonicalised (`คุณโก้`, not a duplicate bare `โก้`) | Without Thai word boundaries a regex over-captures; resolving against names actually seen in the transcript avoids inventing owners and avoids splitting one person into two groups. |
| D17 | Unassigned flags are capped at 2 per meeting; conflicts at 2 | Keeps the flag list readable. **Nothing is dropped** — every unassigned item still appears in the `Unassigned` bucket. |

### Deviations from the assignment (submission transparency)

1. The repo was supplied by the user rather than created by the implementer (D10). It is confirmed `PUBLIC`.
2. The `claude` CLI was not run; Monarch implemented the project (D11). The SRS/PRD document was likewise authored by Monarch rather than Claude.
3. E2E was built despite being marked optional in one section (D7).

No other requirement was narrowed. Anything not specified (ports, UI design, exact heuristic keywords, Office libraries, doc structure) was defined here.

### Guesses still open for the owner to tune

- The keyword lists in `backend/src/patterns.ts` (decision markers, negation markers, owner patterns, subject keywords) are inferred from the 4 fixtures. They are conservative by design.
- A meeting with zero explicit decision markers is flagged `no-decision`, including `04_thai_conflicting_launch.txt` (whose own closing line says "หลายเรื่องยังไม่ได้ข้อสรุป").
- Topic grouping in free-form bullet notes starts a new topic on cue phrases ("kicked off talking about", "คุยเรื่อง", …). Different meeting styles may need different cues.

---

## 5. The project Skill (Part 3) — why it exists

**Skill:** [`.claude/skills/meeting-notes-format/SKILL.md`](<.claude/skills/meeting-notes-format/SKILL.md>)

It standardises **"add support for a new transcript format"** — fixture → detection → topic builder → bilingual keywords → owner resolution → flags → tests → verification → design-decision update → regenerate docs.

**Why this one:** during this assignment that exact workflow was repeated **four times** (bullet notes, structured markdown, Thai notes, dialogue), and each repetition touched the same 5 files in the same order. A skill makes the next format predictable and prevents two easy mistakes: scattering regexes outside `patterns.ts`, and inventing an owner when the transcript does not name one. It is committed with the repository as required, and its guardrails encode the two assignment edge cases.

---

## 6. CLAUDE.md change log (Part 2)

`CLAUDE.md` was **created once** at the repo root at the start of implementation and **was not modified afterwards**. Therefore there are no `CLAUDE.md` amendments to explain here. If it is ever edited, the reason must be appended to this section (assignment Part 2).

---

## 7. Deliverables

| Item | Location |
|---|---|
| Working project | `backend/`, `frontend/` |
| Unit tests | `tests/` (38 tests) |
| E2E tests | `e2e/` (2 Playwright specs) |
| README (design decisions + skill rationale) | `README.md` |
| Project conventions | `CLAUDE.md` |
| Skills | `.claude/skills/meeting-notes-format/SKILL.md` |
| SRS / PRD (MS Word) | `docs/SRS-Meeting-Notes-Distiller.docx` |
| Unit Test Case (MS Excel) | `docs/Unit-Test-Cases.xlsx` |
| SIT + UAT Case (MS Excel, optional) | `docs/SIT-UAT-Cases.xlsx` |
| Design spec | `docs/superpowers/specs/2026-11-16-meeting-notes-distiller-design.md` |
| Implementation plan | `docs/superpowers/plans/2026-11-16-meeting-notes-distiller.md` |
| Sample transcripts | `samples/*.txt` |

`npm run docs` regenerates the three Office files **from the repository itself** (SRS from the design spec + requirements; test cases from the actual `it()`/`test()` names in `tests/` and `e2e/`). They are not hand-maintained lists that can drift.

---

## 8. Verification actually run

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **38 passed** (5 files) |
| Typecheck / lint | `npm run typecheck`, `npm run lint` | pass |
| Production build | `npm run build` | pass (Vite, 31 modules) |
| E2E | `npm run test:e2e` | **2 passed** (real API + real Vite + real Chromium) |
| Real API | `curl -F files=@samples/... /api/process` | 4 meetings, 8 owner groups, 0 warnings |
| Real Word export | `POST /api/export` | HTTP 200, valid OOXML zip with `word/document.xml` |
| Real browser | Playwright screenshot at 1440×900 + full page | both result columns visible, no clipping, no blank frame |
| Failing-first proof | mutate `resolveOwner` to invent an owner | the "no owner" edge-case test **failed** (`null` vs `"INVENTED"`), then passed after restore |
| Office files | `exceljs` + `jszip` read-back | all 3 files open, correct sheets / `word/document.xml` |

**How much of this was written by whom:** the entire repository (code, tests, docs, spec, plan, checklist) was generated by **Monarch** in one session, at the user's direction. No part was copied from another project. The four sample transcripts are the only third-party content (the assignment's own fixtures, copied verbatim). Verification commands above were executed by Monarch, not taken from a report.

**Known limitations / not done:** no persistence, auth, deployment or LLM adapter; heuristic accuracy depends on the keyword lists in `patterns.ts`; local ports must be free; **the work has not been pushed to GitHub** (see D13).

---

## 9. References

- Assignment: https://sky-group.sg.larksuite.com/file/C8fpbRswIoRImBx81QnlgurlgG0
- Assignment folder (samples + docx): https://sky-group.sg.larksuite.com/drive/folder/PUMgf5qndlP6z8dc4SElMEFVg9g
- Sample subfolder: https://sky-group.sg.larksuite.com/drive/folder/GJizfPTIql5xSjdFokOlfNykgJg
- Repo: https://github.com/bn0q/ONE-SKY-AI-Next
