# Meeting Notes Distiller Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public repo containing a working bilingual meeting-notes distiller with FE/BE/test/E2E separation, Word/Excel deliverables and all assignment artifacts.

**Architecture:** React/Vite SPA talks to an Express/TypeScript backend whose extraction pipeline is pure TS (normalize → extract → flag → group); the same result object is rendered in the browser and serialised to `.docx`. Unit tests call the pure functions directly; Playwright drives the real servers.

**Tech Stack:** Node 20, TypeScript, npm workspaces, Express + multer, React 19 + Vite, Vitest, Playwright, `docx`, `exceljs`.

**Spec:** `docs/superpowers/specs/2026-11-16-meeting-notes-distiller-design.md`

**Execution method:** Native (Monarch implements in-session), chosen by the user's blanket approval 2026-11-16.

## Global Constraints

- No LLM/API key; extraction is rule-based and deterministic (spec D1).
- `CLAUDE.md`, `.claude/skills/**`, `README.md` are mandatory submission artifacts.
- Missing values are `null` and render as `—`, never `0` (spec D12).
- ≥4 transcript formats (EN + TH) must parse without crashing (spec §6).
- `samples/*.txt` are verbatim copies of the Lark Drive fixtures (spec D9).
- No `git push` in this session (spec D13).
- Every deviation (D7, D8, D10, D11) must appear in README design decisions.

## Review Focus

1. A completely unknown `.txt` (random bytes / empty) → app returns a `plain`/`parse-error` meeting, never a 500 → test in Task 3.
2. Mixed batch (some files non-`.txt`, some valid) → valid ones still processed, skipped ones reported → test in Task 5.
3. Action item with no owner → `owner: null`, appears in unassigned list, never silently dropped → test in Task 3.
4. Meeting with zero decisions → `no-decision` flag with evidence → test in Task 4.
5. Two different dates for the same subject → `conflicting-action-items` flag with both evidence lines → test in Task 4.

---

### Task 1: Repo scaffold & contracts

**Files:** `package.json`, `tsconfig.json`, `.gitignore`, `backend/package.json`, `backend/tsconfig.json`, `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`, `backend/src/types.ts`, `backend/src/patterns.ts`, `tests/tsconfig.json`, `vitest.config.ts`, `e2e/playwright.config.ts`

**Interfaces:** Produces `MeetingSummary`, `ActionItem`, `Decision`, `Topic`, `Flag`, `ProcessResponse`, `TranscriptFormat` exactly as in spec §5; `patterns.ts` exports `DECISION_MARKERS`, `NEGATION_MARKERS`, `OWNER_PATTERNS`, `DUE_PATTERNS`, `SUBJECT_KEYWORDS`, `PARTICIPANT_LABELS`.

- [ ] Step 1: write root workspace manifest + shared TS config + `.gitignore` (`node_modules`, `dist`, `test-results`, `*.env`).
- [ ] Step 2: write `types.ts` and `patterns.ts` (bilingual constants, each block commented `// GUESS (mine) — tune with owner`).
- [ ] Step 3: `npm install` at root; verify exit 0.
- [ ] Step 4: `npx tsc -p tsconfig.json --noEmit` → PASS.
- [ ] Step 5: commit `chore: scaffold workspaces and shared contracts`.

### Task 2: Normalization (format detection)

**Files:** `backend/src/pipeline/normalize.ts`, `tests/normalize.test.ts`

**Interfaces:** `normalize(fileName: string, raw: string): NormalizedTranscript` where `NormalizedTranscript = { fileName, format, title, date, lines, participants, speakers }`.

- [ ] Step 1: failing tests — detect all 4 formats from the real fixtures; unknown input → `plain`; empty input → `plain` + no throw.
- [ ] Step 2: run → FAIL (module missing).
- [ ] Step 3: implement `normalize` (strip `\r`, split lines, title = first non-empty line, date via EN/TH regex, participants from `ppl:`/`Attendees:`/`Facilitator:`/`คนเข้าร่วม:`/`ผู้เข้าร่วม:`, speakers from `Name:` lines).
- [ ] Step 4: `npm test -- normalize` → PASS.
- [ ] Step 5: commit `feat(backend): normalize transcripts and detect formats`.

### Task 3: Extraction (topics, decisions, action items)

**Files:** `backend/src/pipeline/extract.ts`, `tests/extract.test.ts`

**Interfaces:** `extract(n: NormalizedTranscript): Pick<MeetingSummary,'topics'|'decisions'|'actionItems'>`.

- [ ] Step 1: failing tests — `02` yields 3 topics + decisions + 3 owned actions; `01` yields no decisions; **edge case** unassigned action → `owner === null`; `04` Thai owner `คุณโก้` resolved; due values from `due Friday` / `ภายในวันที่ 20`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement topic grouping, negated-decision filter, owner/due resolution; never invent an owner for an unresolved line.
- [ ] Step 4: `npm test -- extract` → PASS.
- [ ] Step 5: commit `feat(backend): rule-based extraction with bilingual heuristics`.

### Task 4: Flagging & grouping

**Files:** `backend/src/pipeline/flag.ts`, `backend/src/pipeline/groups.ts`, `tests/flag.test.ts`

**Interfaces:** `flag(n: NormalizedTranscript, extracted: Extracted): Flag[]`; `groupActions(items: ActionItem[]): Record<string, ActionItem[]>`; `collectUnassigned(items): ActionItem[]`.

- [ ] Step 1: failing tests — **edge case** no-decision meeting (`01`, `03`) → `no-decision`; `04` → `conflicting-action-items` with both date lines; `02` → no `no-decision`; unassigned item surfaced; grouping key `"Unassigned"` for `owner === null`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement subject-keyword date collision + differing-due detection, evidence arrays, grouping.
- [ ] Step 4: `npm test -- flag` → PASS.
- [ ] Step 5: commit `feat(backend): flag no-decision and conflicting action items`.

### Task 5: API + Word export

**Files:** `backend/src/pipeline/index.ts`, `backend/src/docx.ts`, `backend/src/app.ts`, `backend/src/index.ts`, `tests/api.test.ts`, `tests/docx.test.ts`

**Interfaces:** `processTranscripts(files: {fileName:string, content:string}[]): ProcessResponse`; `buildDocx(result: ProcessResponse): Promise<Buffer>`; `POST /api/process` (multipart `files`), `POST /api/export` (JSON body), `GET /api/health`.

- [ ] Step 1: failing tests — batch of 4 real fixtures → 4 meetings; mixed non-`.txt` skipped; `buildDocx` returns a ZIP whose `word/document.xml` contains the meeting title.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement pipeline orchestration, `docx` document with the 3 display sections, multer memory upload, JSON limit, error handling, static serving of `frontend/dist` in production.
- [ ] Step 4: `npm test` → PASS; `curl -F files=@samples/01...txt localhost:3001/api/process` → 200 with JSON.
- [ ] Step 5: commit `feat(backend): process/export API and Word generation`.

### Task 6: Frontend

**Files:** `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api.ts`, `frontend/src/types.ts`, `frontend/src/styles.css`

**Interfaces:** consumes `ProcessResponse`; `POST /api/process` and `POST /api/export` via `fetch`.

- [ ] Step 1: build upload (multi-file + accumulate across rounds), submit, 3 result sections (per-meeting summary / grouped actions / flagged + unassigned), download button, error/empty states, `—` for nulls.
- [ ] Step 2: `npm run build -w frontend` → PASS (real production build).
- [ ] Step 3: open in Playwright browser, screenshot, confirm layout not clipped (working method §4).
- [ ] Step 4: commit `feat(frontend): upload, results and Word download UI`.

### Task 7: E2E

**Files:** `e2e/tests/distiller.spec.ts`, `scripts/generate-docs.mjs`, `docs/*.docx`, `docs/*.xlsx`

- [ ] Step 1: Playwright config `webServer` starts backend + Vite; test uploads 2 fixtures across 2 rounds, submits, asserts sections + download filename.
- [ ] Step 2: `npm run test:e2e` → PASS.
- [ ] Step 3: `generate-docs.mjs` writes SRS `.docx`, Unit-Test-Cases `.xlsx`, SIT-UAT-Cases `.xlsx` from the actual test names / spec sections.
- [ ] Step 4: verify files open as valid ZIP/OOXML.
- [ ] Step 5: commit `test(e2e): end-to-end flow and generated office deliverables`.

### Task 8: Submission artifacts & verification

**Files:** `README.md`, `CLAUDE.md`, `.claude/skills/meeting-notes-format/SKILL.md`, `samples/README.md`, `ASSIGNMENT_CHECKLIST.md` (workspace copy)

- [ ] Step 1: `CLAUDE.md` — tech stack, coding style, directory layout, test/lint commands, rules.
- [ ] Step 2: skill for the repeated "add a new transcript format" workflow + rationale in README.
- [ ] Step 3: README — functions, `npm install && npm run dev` after clone, design decisions D1–D13, skill rationale, deviations, verification commands.
- [ ] Step 4: `npm test && npm run typecheck && npm run build && npm run test:e2e` → all PASS; `git status` clean of secrets.
- [ ] Step 5: tick checklist §6, final diff review, commit. **No push.**

## Self-review

Spec §2 items map: upload→T6/T5, submit→T6, 3 formats→T2, extract→T3, flag→T4, display→T6, Word→T5, unit tests→T3/T4, complexity bar→T1/T6/T7, README→T8, CLAUDE.md→T8, skills→T8, office docs→T7. Review Focus 1–5 are pinned to T3/T4/T5. Type names are consistent (`ActionItem.owner`, `Flag.kind`, `ProcessResponse.groupedActions`). Plan is shorter than spec; no function bodies duplicated.
