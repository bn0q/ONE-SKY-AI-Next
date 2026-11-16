import type { InputFile, MeetingSummary, ProcessResponse } from '../types';
import { normalize } from './normalize';
import { extract } from './extract';
import { flag } from './flag';
import { groupActions } from './groups';

export function summarize(file: InputFile): MeetingSummary {
  const normalized = normalize(file.fileName, file.content);
  const extracted = extract(normalized);
  const flags = flag(normalized, extracted);

  if (file.content.trim().length === 0) {
    flags.unshift({
      kind: 'parse-error',
      meeting: file.fileName,
      detail: 'The file is empty; nothing could be extracted.',
      evidence: [],
    });
  }

  return {
    fileName: normalized.fileName,
    format: normalized.format,
    title: normalized.title,
    date: normalized.date,
    participants: normalized.participants,
    topics: extracted.topics,
    decisions: extracted.decisions,
    actionItems: extracted.actionItems,
    flags,
  };
}

/** Process every accepted file together. Unknown files are reported, never fatal. */
export function processTranscripts(files: InputFile[]): ProcessResponse {
  const warnings: string[] = [];
  const accepted: InputFile[] = [];

  for (const file of files) {
    if (!/\.txt$/i.test(file.fileName)) {
      warnings.push(`Skipped "${file.fileName}": only .txt meeting notes are supported.`);
      continue;
    }
    accepted.push(file);
  }

  const meetings = accepted.map(summarize);
  return {
    meetings,
    groupedActions: groupActions(meetings.flatMap((meeting) => meeting.actionItems)),
    warnings,
  };
}
