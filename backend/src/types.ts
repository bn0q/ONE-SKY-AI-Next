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

export interface InputFile {
  fileName: string;
  content: string;
}

export interface NormalizedTranscript {
  fileName: string;
  format: TranscriptFormat;
  title: string;
  date: string | null;
  lines: string[];
  participants: string[];
  speakers: string[];
}

export interface Extracted {
  topics: Topic[];
  decisions: Decision[];
  actionItems: ActionItem[];
}
