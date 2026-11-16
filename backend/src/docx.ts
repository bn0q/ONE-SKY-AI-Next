import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { ProcessResponse } from './types';
import { UNASSIGNED_KEY } from './pipeline/groups';

/** A value we could not extract renders as a dash, never as 0 or empty. */
function show(value: string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function line(text: string, bold = false): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, bold })] });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading: level });
}

/** Build the same three display sections shown in the browser as MS Word. */
export async function buildDocx(result: ProcessResponse): Promise<Buffer> {
  const children: Paragraph[] = [
    heading('Meeting Notes Distiller — Summary Report', HeadingLevel.TITLE),
    line(`Generated: ${new Date().toISOString()}`),
    line(`Meetings processed: ${result.meetings.length}`),
  ];

  // Section 1 — Meeting summary per meeting
  children.push(heading('1. Meeting Summaries', HeadingLevel.HEADING_1));
  for (const meeting of result.meetings) {
    children.push(heading(`${meeting.title} (${meeting.fileName})`, HeadingLevel.HEADING_2));
    children.push(line(`Format: ${meeting.format} | Date: ${show(meeting.date)} | Participants: ${meeting.participants.join(', ') || '—'}`));
    children.push(line('Topics', true));
    for (const topic of meeting.topics) {
      children.push(line(`• ${topic.title}: ${topic.summary}`));
    }
    children.push(line('Decisions', true));
    if (meeting.decisions.length === 0) children.push(line('— no decision recorded —'));
    for (const decision of meeting.decisions) children.push(line(`• [${decision.topic}] ${decision.text}`));
    children.push(line('Action items', true));
    if (meeting.actionItems.length === 0) children.push(line('— none —'));
    for (const item of meeting.actionItems) {
      children.push(line(`• ${show(item.owner)} — ${item.task} (due: ${show(item.due)})`));
    }
    children.push(line('Flagged issues', true));
    if (meeting.flags.length === 0) children.push(line('— none —'));
    for (const flag of meeting.flags) children.push(line(`• [${flag.kind}] ${flag.detail}`));
  }

  // Section 2 — Action items grouped by owner
  children.push(heading('2. Action Items Grouped by Owner', HeadingLevel.HEADING_1));
  const owners = Object.keys(result.groupedActions).sort((a, b) => (a === UNASSIGNED_KEY ? 1 : b === UNASSIGNED_KEY ? -1 : a.localeCompare(b)));
  if (owners.length === 0) children.push(line('— none —'));
  for (const owner of owners) {
    children.push(heading(owner, HeadingLevel.HEADING_2));
    for (const item of result.groupedActions[owner]) {
      children.push(line(`• ${item.task} (due: ${show(item.due)})`));
    }
  }

  // Section 3 — Unassigned / inconsistent items
  children.push(heading('3. Unassigned and Inconsistent Items', HeadingLevel.HEADING_1));
  const issues = result.meetings.flatMap((meeting) =>
    meeting.flags
      .filter((flag) => flag.kind === 'unassigned-action-item' || flag.kind === 'conflicting-action-items' || flag.kind === 'no-decision')
      .map((flag) => ({ meeting: meeting.fileName, flag })),
  );
  if (issues.length === 0) children.push(line('— none —'));
  for (const { meeting, flag } of issues) {
    children.push(line(`• [${flag.kind}] ${meeting}: ${flag.detail}`));
    for (const evidence of flag.evidence) children.push(line(`    evidence: ${evidence}`));
  }

  if (result.warnings.length > 0) {
    children.push(heading('Warnings', HeadingLevel.HEADING_1));
    for (const warning of result.warnings) children.push(line(`• ${warning}`));
  }

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
