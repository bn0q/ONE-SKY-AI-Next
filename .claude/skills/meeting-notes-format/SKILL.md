---
name: meeting-notes-format
description: Add support for a new meeting-notes transcript format to the rule-based extraction pipeline (detection, topics, decisions, owners, deadlines, flags) with a fixture and tests.
whenToUse: When a new .txt transcript shape must be handled, when extraction heuristics need new EN/TH markers, or when adding a new sample transcript.
---

# Add a new transcript format

Use this when a transcript does not fit `bullet-notes`, `structured-markdown`, `thai-notes`, `dialogue`, or `plain`.
The pipeline is deterministic and offline — never solve a new format by adding an LLM call.

## Steps

1. **Fixture first.** Put a verbatim copy of the real transcript in `samples/` with a numbered name (`05_*.txt`). Never edit an existing fixture.
2. **Detect.** Add a `TranscriptFormat` literal to `backend/src/types.ts`, then a detection rule in `detectFormat()` (`backend/src/pipeline/normalize.ts`). Order matters: more specific markers before generic speaker/participant checks.
3. **Topics.** Add a `buildXxxTopics()` branch in `backend/src/pipeline/extract.ts`. Every topic needs a `title`, a non-empty `summary` and its `sourceLines` (used for evidence).
4. **Keywords.** Add EN/TH markers only in `backend/src/patterns.ts`. Mark every new constant `GUESS (mine) — tune with owner`. Do not scatter regexes across files.
5. **Owners.** Prefer explicit owner patterns; for languages without word boundaries (Thai) resolve against names found in the transcript via `buildNameAliases()` so one person gets one canonical name. An unresolved owner stays `null` — never invent one.
6. **Flags.** If the format introduces a new kind of inconsistency, extend `backend/src/pipeline/flag.ts` and `FlagKind` in `types.ts`, with evidence lines.
7. **Tests.** Add to `tests/normalize.test.ts` (format detected) and `tests/extract.test.ts` (fields extracted, plus an edge case). Add the fixture to `tests/fixtures.ts` `SAMPLE_FILES`.
8. **Verify.** `npm test && npm run typecheck && npm run build && npm run test:e2e`.
9. **Record.** Add the new format to `docs/superpowers/specs/...-design.md` §6 and to README §Design decisions; run `npm run docs` to regenerate the SRS and test-case workbooks.

## Guardrails

- A missing value is `null` → renders `—`, never `0`.
- An unknown/empty/binary file must degrade to `plain` + `parse-error`, never throw.
- Never silence a failing test; if a heuristic is wrong, fix the heuristic.
- Check `.claude/skills/` is committed (it is a submission requirement).
