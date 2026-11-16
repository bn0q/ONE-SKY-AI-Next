# Meeting Notes Distiller Web — Design Spec

> Status: approved by user 2026-11-16 (blanket approval: spec → plan → implementation, no intermediate gates)
> Source of truth: [Assignment - Meeting Notes Distiller Web.docx](https://sky-group.sg.larksuite.com/file/C8fpbRswIoRImBx81QnlgurlgG0)
> Sample data: [Lark Drive folder](https://sky-group.sg.larksuite.com/drive/folder/PUMgf5qndlP6z8dc4SElMEFVg9g) → `Sample-MeetingNotes/` (4 `.txt` files)

## 1. Intent & success criteria

Build a web app that turns raw meeting-note `.txt` transcripts into a structured, downloadable summary. A user uploads one or more files (in one go or across several rounds), presses **Submit**, sees the analysis in the browser, and can download the same content as MS Word.

Success = every item in `ASSIGNMENT_CHECKLIST.md` §6 is ticked: public repo with working project, tests, `README.md`, `CLAUDE.md`, `.claude/skills/`, plus the SRS/PRD `.docx` and test-case `.xlsx` documents.

## 2. Constraints (from the assignment, verbatim intent)

- Upload `.txt`; more than 1 file at once OR several upload rounds, processed together.
- A `submit` action starts processing; at least **3 transcript formats** must work without crashing; sample transcripts provided are bilingual (EN/TH).
- Per meeting extract: topics, participants, per-topic summary, per-topic decisions, action items (who / what / by when, grounded in the transcript).
- Flag: **no-decision meetings** and **conflicting / inconsistent action items** (the assignment's example: two possible go-live dates with no chosen one).
- Browser display: per-meeting summary, action items grouped by owner, and unassigned / inconsistent items.
- Download the displayed result as **MS Word**.
- **Unit tests** for extraction logic, at least one edge case (unassigned action item, no-decision meeting).
- **Complexity bar**: source split into Front end / Back end / Test suite / E2E (Playwright or Robot Framework).
- README explains functions, local run after clone, and design decisions.
- `CLAUDE.md` at repo root; every later edit to it must be explained in README.
- `.claude/skills/<name>/SKILL.md` committed with a rationale.
- SRS/PRD as `.docx`, Unit Test Case as `.xlsx`, optional SIT/UAT as `.xlsx`.
- Anything not specified may be defined by the implementer **but must be recorded in the design decision**.

## 3. Decisions (mine, recorded per assignment's "อื่นๆ")

| # | Decision | Rationale |
|---|---|---|
| D1 | **Rule-based / heuristic extraction**, no LLM call | Chosen by user. Deterministic, unit-testable, runs offline right after `clone`, no API key/secret to ship. A single `Extractor` interface is kept so an LLM adapter could replace it later; no adapter is built (YAGNI). |
| D2 | TypeScript + Node 20, npm workspaces | One language across FE/BE/tests; repo was empty, so no existing convention to follow. |
| D3 | `backend/` Express + `multer` (memory storage) | Only 2 endpoints needed; no database, no persistence — uploads live in the request only. |
| D4 | `frontend/` React 19 + Vite | Small SPA, one page, no router needed. Vite dev proxy → backend. |
| D5 | `docx` (npm) for Word, `exceljs` for Excel | Pure JS, no LibreOffice/Python dependency; `python-docx`/`openpyxl` are not installed in this environment. |
| D6 | Vitest for unit tests, Playwright for E2E | Both are TS-native and CI-friendly; E2E starts the real servers. |
| D7 | E2E **is implemented** even though §Submit says `E2E (optional)` | §Complexity Bar requires it. Conflict recorded here rather than silently resolved. |
| D8 | Complexity Bar says "at least 3 parts" but lists 4 → **all 4** delivered | Failing safely on the stricter reading. |
| D9 | Sample transcripts are copied verbatim from the Lark Drive folder into `samples/` | They are the assignment's provided fixtures; using them keeps the ≥3-format + multilingual requirement grounded in real data. |
| D10 | Repo was provided by the user (`bn0q/ONE-SKY-AI-Next`) instead of created by the implementer | User sent the URL. Deviation from "สร้าง GitHub repository แบบ public" — recorded here. |
| D11 | Implementation is done by **Monarch**, not the `claude` CLI; SRS/PRD also authored by Monarch | User explicitly skipped the `claude` step (2026-11-16). Deviation from "รันคำสั่ง claude" and "สร้างเอกสาร ... ด้วย Claude" — recorded here. `CLAUDE.md` and `.claude/skills/` keep their required names. |
| D12 | Date / owner / decision values that cannot be extracted render as **null → "—" (dash)**, never `0`/empty-string | A missing value is not a measurement (agent working method §2). |
| D13 | No push to GitHub in this session | `adithep-tha_skyaidev` has `pull` only on this repo; switching to `bn0q` is an outward action requiring a separate go. |

## 4. Architecture

```
Browser (React/Vite SPA)
   │  POST /api/process  (multipart, N .txt files)
   │  POST /api/export   (JSON result → .docx stream)
   ▼
Express backend
   ├── pipeline.ts      orchestrates: normalize → extract → flag → group
   ├── normalize.ts     format detection + title/date/participants/line model
   ├── extract.ts       topics, per-topic summary, decisions, action items
   ├── flag.ts          no-decision + conflict detection
   ├── groups.ts        group action items by owner; collect unassigned
   ├── patterns.ts      all EN/TH keyword constants (single place for guesses)
   └── docx.ts          MS Word builder
   ▲
tests/ (Vitest, pure functions)   e2e/ (Playwright, real servers)
```

Pure functions are separated from I/O so unit tests exercise the real extraction logic with no mocks. The API layer only wires `multer` bytes → pipeline → JSON.

## 5. Data model

```ts
type TranscriptFormat = 'bullet-notes' | 'structured-markdown' | 'thai-notes' | 'dialogue' | 'plain';

interface ActionItem { id: string; owner: string | null; task: string; due: string | null; sourceLine: string; }
interface Decision   { topic: string; text: string; sourceLine: string; }
interface Topic      { title: string; summary: string; sourceLines: string[]; }
interface Flag       { kind: 'no-decision' | 'conflicting-action-items' | 'unassigned-action-item'; meeting: string; detail: string; evidence: string[]; }
interface MeetingSummary {
  fileName: string; format: TranscriptFormat; title: string; date: string | null;
  participants: string[]; topics: Topic[]; decisions: Decision[]; actionItems: ActionItem[]; flags: Flag[];
}
interface ProcessResponse { meetings: MeetingSummary[]; groupedActions: Record<string, ActionItem[]>; }
```

## 6. Format handling (≥3 formats, EN + TH)

| Format | Detected by | Sample |
|---|---|---|
| `bullet-notes` | `ppl:` + `- ` bullets, no headings | `01_no_decisions_brainstorm.txt` (EN) |
| `structured-markdown` | `##` / `### Topic N:` + `Attendees:` | `02_structured_with_followups.txt` (EN) |
| `thai-notes` | Thai `คนเข้าร่วม:` + `- ` bullets | `03_thai_no_decisions_roadmap.txt` (TH) |
| `dialogue` | `[บันทึกการประชุม]` / repeated `Speaker: ` lines | `04_thai_conflicting_launch.txt` (TH) |
| `plain` | fallback — never throws | any unknown `.txt` |

Unknown input must degrade to `plain`, never crash. Non-UTF8 / empty files produce a meeting with an explicit `parse-error` flag rather than an exception.

## 7. Heuristics (rule-based)

- **Topics**: explicit `### Topic N: X` / `## X` headings win; otherwise consecutive bullet lines are grouped into one topic whose title is the first clause of the first bullet. Dialogue transcripts use the first line of each speaker exchange cluster.
- **Decisions**: line matches a decision marker (`Decision —`, `decided`, `DONE.`, `ตกลง`, `ตัดสินใจ`, `สรุปแล้ว`) **and** is not negated (`nobody`, `??`, `no conclusion`, `ไม่ได้ข้อสรุป`, `ไม่มีใครรับ`, `ยังไม่ได้ข้อสรุป`, `เดี๋ยว...ค่อยกลับมาคุย`).
- **Action items**: line contains an owner pattern (`X owns it`, `X will …`, `X, write …`, `คุณX ทำ…`, `คุณX จะ…`, `X to research`) and/or a deadline (`due Friday`, `by Thursday`, `ภายในวันที่ 20`, `วันที่ 25`). `owner` is `null` when no owner can be resolved; `due` is `null` when no deadline is stated. Both are surfaced, not guessed.
- **No-decision flag**: `decisions.length === 0`, or an explicit "no conclusion" marker appears.
- **Conflict flag**: two distinct dates attached to the same subject keyword (`go-live`, `เปิดตัว`, `launch`, `freeze`, `dashboard`) with no decision resolving them; plus two action items on the same subject with different `due` values. Evidence lines are kept.
- All keyword lists live in `patterns.ts` with a comment marking them as **my guesses**, open for the owner to tune (working method §7).

## 8. Error handling

- Empty upload → 400 with a clear message; FE shows it.
- Non-`.txt` file → skipped with a warning per file, others still processed.
- A file that fails decoding → `plain` format + `parse-error` flag; the batch still returns 200.
- Backend unreachable → FE shows an error state, not a blank frame.

## 9. Testing

- Vitest: format detection for all 4 fixtures; EN + TH extraction; **edge case: action item with no owner**; **edge case: no-decision meeting**; conflict detection (two go-live dates); plain-fallback no-crash; docx is a valid OOXML zip.
- Playwright E2E: start Vite + Express, upload 2 files across 2 rounds, submit, assert per-meeting summary / grouped actions / flagged issues / `.docx` download.
- Verification: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and a manual `curl` against `/api/process`.

## 10. Out of scope

Persistence/database, authentication, LLM calls, deployment, i18n of the UI chrome, editing transcripts in the browser. Anything added later must be appended to §3.
