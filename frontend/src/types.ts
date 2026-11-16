export type TranscriptFormat =
  | 'bullet-notes'
  | 'structured-markdown'
  | 'thai-notes'
  | 'dialogue'
  | 'plain';

export interface ActionItem {
  id: string;
  owner: string | null;
  task: string;
  due: string | null;
  sourceLine: string;
}

export interface Decision {
  topic: string;
  text: string;
  sourceLine: string;
}

export interface Topic {
  title: string;
  summary: string;
  sourceLines: string[];
}

export type FlagKind =
  | 'no-decision'
  | 'conflicting-action-items'
  | 'unassigned-action-item'
  | 'parse-error';

export interface Flag {
  kind: FlagKind;
  meeting: string;
  detail: string;
  evidence: string[];
}

export interface MeetingSummary {
  fileName: string;
  format: TranscriptFormat;
  title: string;
  date: string | null;
  participants: string[];
  topics: Topic[];
  decisions: Decision[];
  actionItems: ActionItem[];
  flags: Flag[];
}

export interface ProcessResponse {
  meetings: MeetingSummary[];
  groupedActions: Record<string, ActionItem[]>;
  warnings: string[];
}

export const UNASSIGNED_KEY = 'Unassigned';

/** A value we could not measure renders as a dash, never as 0. */
export function show(value: string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : value;
}
