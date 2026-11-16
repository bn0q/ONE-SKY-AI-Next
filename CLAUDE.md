# CLAUDE.md — Meeting Notes Distiller

Project conventions for this repository. Read before changing code.

## Tech stack

- Node 20+, TypeScript (strict), npm workspaces
- Backend: Express 4 + `multer` (memory storage), run with `tsx` (no compile step)
- Frontend: React 19 + Vite 6, plain CSS (no UI framework, no Tailwind)
- Word export: `docx` · Excel deliverables: `exceljs`
- Unit tests: Vitest (node environment) · E2E: Playwright (Chromium)
- Extraction: **rule-based / heuristic only** — no LLM, no API key, no network at runtime

## Coding style

- ESM everywhere (`"type": "module"`); relative imports are **extensionless**
- Prefer small pure functions; all extraction logic is pure and I/O-free
- `null` means "could not be determined"; render it as `—`, never `0` or `''`
- One responsibility per file; keyword heuristics live **only** in `backend/src/patterns.ts`
- Bilingual (EN/TH) regexes use Unicode property escapes with the `u` flag
- No `@ts-ignore`, no skipped tests, no catch-and-ignore
- Comments explain *why*; guessed constants are labelled `GUESS (mine)`

## Directory layout

```
backend/src/            Express app, Word builder, extraction pipeline (pure TS)
  types.ts              shared data contracts
  patterns.ts           ALL heuristic keywords (single place for guesses)
  pipeline/normalize.ts format detection + line model
  pipeline/extract.ts   topics / decisions / action items
  pipeline/flag.ts      no-decision + conflict detection
  pipeline/groups.ts    group action items by owner
  pipeline/index.ts     orchestration
  docx.ts               MS Word generation
frontend/src/           React SPA (upload → submit → results → download)
tests/                  Vitest unit suite (imports backend pure functions)
e2e/                    Playwright config + specs (starts real servers)
samples/                verbatim assignment fixtures (4 .txt transcripts, EN + TH)
docs/                   SRS .docx, Unit-Test-Cases .xlsx, SIT-UAT-Cases .xlsx, spec + plan
scripts/generate-docs.mjs  regenerates the Office deliverables from the code
.claude/skills/         project skill(s)
```

## Commands

| Purpose | Command |
|---|---|
| Install | `npm install` |
| Dev (API :3101 + web :5273) | `npm run dev` |
| Production build | `npm run build` |
| Production serve (serves built SPA) | `npm start` |
| Unit tests | `npm test` |
| Watch unit tests | `npm run test:watch` |
| Typecheck / lint (static analysis) | `npm run typecheck` (= `npm run lint`, `tsc --noEmit`) |
| E2E | `npm run test:e2e` (first time: `npx playwright install chromium`) |
| Regenerate Office docs | `npm run docs` |

Ports are **3101 / 5273** on purpose — 3001 / 5173 are used by other local projects on this machine. Do not "fix" them to the defaults without checking `lsof`.

## Rules

**Always**
- Run `npm test`, `npm run typecheck`, `npm run build` before saying work is done
- Add a unit test for every new heuristic, including its edge case
- Keep `samples/*.txt` byte-for-byte identical to the Lark Drive fixtures
- Record every design decision / deviation in README §Design decisions
- Regenerate `docs/*.docx` and `docs/*.xlsx` with `npm run docs` after changing tests
- Verify UI changes in a real browser (a passing build is not visual proof)

**Never**
- Add an LLM call, an API key, or a runtime network dependency
- Commit `.env`, secrets, `node_modules/`, `dist/`, `test-results/`
- Guess an owner when the transcript does not name one — keep `owner: null`
- Change `CLAUDE.md` without recording the reason in README (assignment Part 2)
- `git push` without the user's explicit go (this repo's active account has pull-only)
