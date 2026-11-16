/**
 * Generates the assignment's Office deliverables FROM THE ACTUAL REPO CONTENT:
 *  - docs/SRS-Meeting-Notes-Distiller.docx  (SRS / PRD)
 *  - docs/Unit-Test-Cases.xlsx             (derived from tests/**, real test names)
 *  - docs/SIT-UAT-Cases.xlsx               (derived from e2e/** + requirement checklist)
 *
 * Run: npm run docs
 */
import { readFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const ROOT = resolve(process.cwd());
const DOCS = resolve(ROOT, 'docs');
mkdirSync(DOCS, { recursive: true });

const SPEC_PATH = resolve(DOCS, 'superpowers/specs/2026-11-16-meeting-notes-distiller-design.md');
const spec = readFileSync(SPEC_PATH, 'utf8');

function collectTests(directory, pattern) {
  const cases = [];
  const dir = resolve(ROOT, directory);
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.test.ts') || name.endsWith('.spec.ts'))) {
    const source = readFileSync(resolve(dir, file), 'utf8');
    const regex = /(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      cases.push({ file, name: match[1], line });
    }
  }
  return cases;
}

const unitCases = collectTests('tests');
const e2eCases = collectTests('e2e/tests');

if (unitCases.length === 0 || e2eCases.length === 0) {
  throw new Error('No test cases found — refusing to generate empty test-case documents.');
}

// ---------------------------------------------------------------- SRS / PRD
function heading(text, level) {
  return new Paragraph({ text, heading: level });
}
function para(text, bold = false) {
  return new Paragraph({ children: [new TextRun({ text, bold })] });
}
function bullet(text) {
  return new Paragraph({ text: `• ${text}` });
}

const functionalRequirements = [
  ['FR-1 Upload', 'Upload meeting notes as .txt; more than one file in one request OR across several upload rounds; process the accumulated set together.'],
  ['FR-2 Process', 'A submit action starts processing; at least 3 transcript formats must be handled without crashing; provided samples are EN and TH.'],
  ['FR-3 Extract', 'Per meeting: topics, participants, per-topic summary, per-topic decisions, and action items (owner / task / deadline, grounded in the transcript).'],
  ['FR-4 Flag problem', 'Identify no-decision meetings and conflicting or inconsistent action items (example: two possible go-live dates with no chosen one).'],
  ['FR-5 Display', 'In the browser: per-meeting summary, action items grouped by owner, and unassigned / inconsistent items.'],
  ['FR-6 Export', 'Produce the displayed result as an MS Word file downloadable from the browser.'],
  ['FR-7 Tests', 'Unit tests for the extraction logic, at least one edge case (unassigned action item; no-decision meeting).'],
  ['FR-8 Complexity bar', 'Source split into Front end / Back end / Test suite / E2E (Playwright).'],
  ['FR-9 Documentation', 'README with functions, local run instructions and design decisions; CLAUDE.md at repo root; .claude/skills committed with rationale.'],
];

const nonFunctional = [
  'Deterministic and offline: no LLM call, no API key, no network dependency at runtime.',
  'Bilingual input: English and Thai transcripts (4 provided fixture formats).',
  'Unknown / empty / non-.txt input degrades gracefully with an explicit warning or flag, never a 500.',
  'A value that cannot be extracted renders as a dash (—), never as 0 or an empty string.',
  'Runs on Node 20+ after `npm install`; no external services, database or credentials.',
];

const assumptions = spec
  .split('\n')
  .filter((line) => /^\| D\d+ /.test(line))
  .map((line) => line.replace(/^\|\s*/, '').replace(/\s*\|$/, ''));

const srsChildren = [
  heading('Software Requirement Specification', HeadingLevel.TITLE),
  para('Meeting Notes Distiller Web'),
  para(`Generated from the repository on ${new Date().toISOString().slice(0, 10)} by scripts/generate-docs.mjs`),
  para('Source: Assignment - Meeting Notes Distiller Web.docx (Lark Docs) · design spec: docs/superpowers/specs/2026-11-16-meeting-notes-distiller-design.md'),

  heading('1. Purpose', HeadingLevel.HEADING_1),
  para('Turn raw meeting-note .txt transcripts into a structured, reviewable and downloadable summary, highlighting decisions, owners, deadlines and unresolved conflicts.'),

  heading('2. Scope', HeadingLevel.HEADING_1),
  para('In scope: upload, processing, rule-based extraction, flagging, browser display, Word export, unit + E2E tests, project documentation.'),
  para('Out of scope: persistence, authentication, LLM calls, deployment, UI i18n, editing transcripts.'),

  heading('3. Functional requirements', HeadingLevel.HEADING_1),
  ...functionalRequirements.flatMap(([id, text]) => [para(id, true), para(text)]),

  heading('4. Non-functional requirements', HeadingLevel.HEADING_1),
  ...nonFunctional.map((text) => bullet(text)),

  heading('5. Data model', HeadingLevel.HEADING_1),
  para('MeetingSummary { fileName, format, title, date, participants, topics, decisions, actionItems, flags }'),
  para('ActionItem { id, owner: string | null, task, due: string | null, sourceLine }'),
  para('ProcessResponse { meetings, groupedActions, warnings }'),
  para('See backend/src/types.ts for the authoritative TypeScript definitions.'),

  heading('6. Design decisions and deviations (recorded per assignment)', HeadingLevel.HEADING_1),
  ...assumptions.map((row) => bullet(row)),

  heading('7. Acceptance criteria', HeadingLevel.HEADING_1),
  bullet('npm install && npm run dev serves the app on http://localhost:5273 (API on 3101).'),
  bullet('npm test passes; npm run typecheck and npm run build pass; npm run test:e2e passes.'),
  bullet('Uploading the 4 provided samples produces 4 meeting summaries, grouped action items and flagged issues.'),
  bullet('Download yields a valid .docx containing all three display sections.'),
  bullet('All §6 Submission gate items of ASSIGNMENT_CHECKLIST.md are satisfied.'),

  heading('8. References', HeadingLevel.HEADING_1),
  bullet('Assignment docx: https://sky-group.sg.larksuite.com/file/C8fpbRswIoRImBx81QnlgurlgG0'),
  bullet('Sample data folder: https://sky-group.sg.larksuite.com/drive/folder/PUMgf5qndlP6z8dc4SElMEFVg9g'),
  bullet('README.md, CLAUDE.md, docs/superpowers/plans/2026-11-16-meeting-notes-distiller.md'),
];

const srs = new Document({ sections: [{ children: srsChildren }] });
writeFileSync(resolve(DOCS, 'SRS-Meeting-Notes-Distiller.docx'), await Packer.toBuffer(srs));

// ---------------------------------------------------------------- Workbooks
function styleWorkbook(workbook, sheet, headers, widths) {
  sheet.columns = headers.map((header, index) => ({ header, key: `c${index}`, width: widths[index] }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6F5C' } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  workbook.created = new Date();
}

const unitWb = new ExcelJS.Workbook();
const unitSheet = unitWb.addWorksheet('Unit Test Cases');
styleWorkbook(unitWb, unitSheet,
  ['Case ID', 'Test Suite', 'Test Case (from code)', 'Precondition / Steps', 'Expected Result', 'Source'],
  [10, 34, 62, 46, 40, 34]);
unitCases.forEach((testCase, index) => {
  unitSheet.addRow({
    c0: `UT-${String(index + 1).padStart(3, '0')}`,
    c1: testCase.file.replace(/\.(test|spec)\.ts$/, ''),
    c2: testCase.name,
    c3: 'Run `npm test`; fixtures loaded from samples/*.txt',
    c4: 'PASS — assertion(s) in the named test hold',
    c5: `tests/${testCase.file}:${testCase.line}`,
  });
});
unitSheet.eachRow((row) => { row.alignment = { wrapText: true, vertical: 'top' }; });
await unitWb.xlsx.writeFile(resolve(DOCS, 'Unit-Test-Cases.xlsx'));

const sitWb = new ExcelJS.Workbook();
const sitSheet = sitWb.addWorksheet('SIT & UAT Cases');
styleWorkbook(sitWb, sitSheet,
  ['Case ID', 'Type', 'Scenario (from code / requirements)', 'Steps', 'Expected Result', 'Source'],
  [10, 12, 62, 52, 48, 40]);

let sitIndex = 0;
for (const testCase of e2eCases) {
  sitIndex += 1;
  sitSheet.addRow({
    c0: `SIT-${String(sitIndex).padStart(3, '0')}`,
    c1: 'SIT (E2E)',
    c2: testCase.name,
    c3: 'Run `npm run test:e2e` (Playwright starts real API + real Vite server)',
    c4: 'PASS — browser flow completes',
    c5: `e2e/tests/${testCase.file}:${testCase.line}`,
  });
}

const uatScenarios = [
  ['Upload one .txt file', 'Choose one sample → Process', 'One meeting summary is displayed'],
  ['Upload >1 file at once', 'Choose 2+ samples in one picker action → Process', 'All selected meetings are displayed together'],
  ['Upload in several rounds', 'Choose 2 samples, choose 2 more → Process', 'All 4 accumulated meetings are processed together'],
  ['Submit starts processing', 'Stage files, press Process N files', 'Results section appears; no blank frame'],
  ['3+ transcript formats', 'Process all 4 provided samples', '4 different formats parsed, no crash'],
  ['Extract fields', 'Inspect any meeting card', 'Topics, participants, per-topic summary, decisions, action items visible'],
  ['Flag no-decision', 'Inspect 01 / 03 / 04', 'no-decision flag shown with evidence lines'],
  ['Flag conflict', 'Inspect 04', 'conflicting-action-items flag shown with both dates'],
  ['Group by owner', 'Inspect Action items by owner', 'Owners + an explicit Unassigned bucket shown'],
  ['Download Word', 'Press Download as MS Word', 'meeting-summary.docx downloads and opens in MS Word'],
  ['Invalid file', 'Upload a .pdf → Process', 'Clear error message; app stays usable'],
  ['Null value display', 'Inspect an item with no deadline', 'Renders as — , never 0'],
];
for (const [scenario, steps, expected] of uatScenarios) {
  sitIndex += 1;
  sitSheet.addRow({
    c0: `UAT-${String(sitIndex - e2eCases.length).padStart(3, '0')}`,
    c1: 'UAT (manual)',
    c2: scenario,
    c3: steps,
    c4: expected,
    c5: 'Assignment Required Functionality + README',
  });
}
sitSheet.eachRow((row) => { row.alignment = { wrapText: true, vertical: 'top' }; });
await sitWb.xlsx.writeFile(resolve(DOCS, 'SIT-UAT-Cases.xlsx'));

console.log(`Generated: SRS-Meeting-Notes-Distiller.docx, Unit-Test-Cases.xlsx (${unitCases.length} cases), SIT-UAT-Cases.xlsx (${e2eCases.length} E2E + ${uatScenarios.length} UAT cases)`);
