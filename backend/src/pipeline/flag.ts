import type { ActionItem, Extracted, Flag, NormalizedTranscript } from '../types';
import { extractDateTokens, SUBJECT_KEYWORDS } from '../patterns';

const NO_CONCLUSION_EVIDENCE = [
  /no conclusion/i,
  /not decided/i,
  /nobody/i,
  /not sure/i,
  /ไม่ได้ข้อสรุป/,
  /ไม่มีใคร/,
  /ไม่แน่ใจ/,
  /ยังไม่ได้ข้อสรุป/,
];

function conflictFlags(n: NormalizedTranscript, actionItems: ActionItem[]): Flag[] {
  const flags: Flag[] = [];
  const seen = new Set<string>();

  for (const subject of SUBJECT_KEYWORDS) {
    const matchedLines = n.lines.filter(
      (line) => subject.re.test(line) && extractDateTokens(line).length > 0,
    );
    const dates = new Set<string>();
    for (const line of matchedLines) {
      for (const token of extractDateTokens(line)) dates.add(token);
    }
    if (matchedLines.length >= 2 && dates.size >= 2 && !seen.has(subject.key)) {
      seen.add(subject.key);
      flags.push({
        kind: 'conflicting-action-items',
        meeting: n.fileName,
        detail: `${subject.key} is referenced with ${dates.size} different dates (${[...dates].sort().join(', ')}) and no decision resolves which one applies.`,
        evidence: matchedLines.map((line) => line.trim()).slice(0, 4),
      });
    }

    const relevantActions = actionItems.filter(
      (item) => item.due !== null && subject.re.test(item.task),
    );
    const dueValues = new Set(relevantActions.map((item) => item.due as string));
    if (dueValues.size >= 2 && !seen.has(`due:${subject.key}`)) {
      seen.add(`due:${subject.key}`);
      flags.push({
        kind: 'conflicting-action-items',
        meeting: n.fileName,
        detail: `Action items about "${subject.key}" carry inconsistent deadlines: ${[...dueValues].join(', ')}.`,
        evidence: relevantActions.map((item) => item.sourceLine).slice(0, 4),
      });
    }
  }

  // Date-based conflicts come first; cap the list so a single messy meeting
  // does not drown out the other flags.
  return flags.slice(0, 2);
}

/** Detect no-decision meetings, unassigned actions and inconsistent action items. */
export function flag(n: NormalizedTranscript, extracted: Extracted): Flag[] {
  const flags: Flag[] = [];
  const meeting = n.fileName;

  if (extracted.decisions.length === 0) {
    const evidence = n.lines
      .filter((line) => NO_CONCLUSION_EVIDENCE.some((re) => re.test(line)))
      .map((line) => line.trim())
      .slice(0, 4);
    flags.push({
      kind: 'no-decision',
      meeting,
      detail: 'No decision was recorded for this meeting (no-decision meeting).',
      evidence: evidence.length > 0 ? evidence : [n.title],
    });
  }

  // Keep the flag list readable; every unassigned item is still shown in the
  // "Unassigned" bucket of groupedActions, so none is silently dropped.
  const unassigned = extracted.actionItems.filter((item) => item.owner === null);
  for (const item of unassigned.slice(0, 2)) {
    flags.push({
      kind: 'unassigned-action-item',
      meeting,
      detail: `Action item has no owner: "${item.task}"${unassigned.length > 2 ? ` (+${unassigned.length - 2} more)` : ''}`,
      evidence: [item.sourceLine],
    });
  }

  flags.push(...conflictFlags(n, extracted.actionItems));
  return flags.slice(0, 12);
}
