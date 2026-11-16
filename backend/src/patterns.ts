/**
 * All heuristic keywords live here so guesses stay in one named place.
 *
 * GUESS (mine) — these lists were derived from the 4 provided sample transcripts,
 * not from the assignment text. They are deliberately conservative and are meant
 * to be tuned with the owner. See design spec §3 (D1) and §7.
 */

export const PARTICIPANT_LINE = /^(?:ppl|Attendees|Facilitator|คนเข้าร่วม|ผู้เข้าร่วม)\s*:\s*(.+)$/i;

/** Labels that look like `Name:` but are metadata, not a speaker turn. */
export const NON_SPEAKER_LABELS = new Set([
  'date', 'facilitator', 'attendees', 'ppl', 'วันที่', 'คนเข้าร่วม', 'ผู้เข้าร่วม',
  'topic', 'subject', 'time', 'location', 'next sync',
]);

export const SPEAKER_LINE = /^([\p{L}][\p{L}\p{M}\p{N} .'-]{0,28}):\s+(.+)$/u;

export const DATE_PATTERNS: RegExp[] = [
  /\b(\d{4}-\d{2}-\d{2})\b/,
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
  /(?:วันที่|Date)\s*:\s*([^\n]+)/i,
  /(?:ภายใน)?วันที่\s*(\d{1,2}\s*[ก-๙A-Za-z]+\s*\d{4})/,
];

export const DECISION_MARKERS: RegExp[] = [
  /\bDecision\b/i,
  /\bdecided\b/i,
  /\bDONE\.?\b/i,
  /\bas planned\b/i,
  /ตกลง/,
  /ตัดสินใจ/,
  /สรุปแล้ว/,
  /ยืนยันแล้ว/,
];

/** A line matching a decision marker AND any of these is NOT a decision. */
export const NEGATION_MARKERS: RegExp[] = [
  /\bnobody\b/i,
  /\?\?/,
  /no conclusion/i,
  /not decided/i,
  /didn't/i,
  /not sure/i,
  /no deadline/i,
  /waiting on/i,
  /ไม่ได้ข้อสรุป/,
  /ไม่มีใคร/,
  /ยังไม่ได้/,
  /ไม่แน่ใจ/,
  /เดี๋ยว/,
  /ไว้คุยต่อ/,
  /ขัดกับ/,
  /ไหน/,
  /ยังไง/,
  /หรือ/,
];

export const OWNER_PATTERNS: RegExp[] = [
  /\b([\p{Lu}][\p{L}\p{M}'-]+)\s+owns?\s+it\b/u,
  /\b([\p{Lu}][\p{L}\p{M}'-]+)\s+will\b/u,
  /\b([\p{Lu}][\p{L}\p{M}'-]+),\s*(?:write|draft|please)\b/iu,
  /\b([\p{Lu}][\p{L}\p{M}'-]+)\s+to\s+(?:research|draft|review|investigate)\b/iu,
  /\b([\p{Lu}][\p{L}\p{M}'-]+)\s+confirmed\b/u,
];

export const DUE_PATTERNS: RegExp[] = [
  /\bdue\s+([^,.;]+)/i,
  /\bby\s+((?:next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/i,
  /(?:ภายในวันที่|วันที่)\s*(\d{1,2})/,
  /\b(\d{4}-\d{2}-\d{2})\b/,
];

export const ACTION_MARKERS: RegExp[] = [
  /\bowns?\s+it\b/i,
  /\bwill\b/i,
  /\bdue\b/i,
  /\bconfirmed\b/i,
  /\bto\s+(?:research|draft|review|investigate)\b/i,
  /\bshould\b/i,
  /\bDONE\.?\b/i,
  /\bshipped\b/i,
  /\bfreeze\b/i,
  /ควร|ต้องการ|ทำให้เสร็จ|จะออก|ออกประกาศ|ดึง|หามา|เพิ่ม|ส่ง|ทำให้ทัน|จ้าง/i,
];

/** Lines mentioning any of these subjects are grouped to detect date conflicts. */
export const SUBJECT_KEYWORDS: { key: string; re: RegExp }[] = [
  { key: 'go-live / launch date', re: /go-live|เปิดตัว|launch|กำหนดเปิด/i },
  { key: 'feature freeze', re: /freeze/i },
  { key: 'analytics dashboard', re: /dashboard/i },
  { key: 'press release', re: /press release|สื่อ|สำนักข่าว/i },
  { key: 'mobile vs API priority', re: /mobile|API redesign|มือถือ/i },
  { key: 'hiring', re: /hiring|จ้าง/i },
];

/** In bullet-note formats a matching line starts a new topic cluster. */
export const TOPIC_START_MARKERS: RegExp[] = [
  /kicked off talking about/i,
  /talked about/i,
  /brought up/i,
  /showed/i,
  /เปิดประเด็น/i,
  /คุยเรื่อง/i,
  /พูดขึ้นมาว่า/i,
  /เอา .*มาโชว์/i,
  /หมดเวลา/i,
];

/** Extract comparable date tokens from one line. */
export function extractDateTokens(line: string): string[] {
  const tokens = new Set<string>();
  for (const m of line.matchAll(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/g)) {
    tokens.add(m[1]);
  }
  for (const m of line.matchAll(/(?:วันที่|ภายในวันที่|due|by)\s*(\d{1,2})\b/gi)) {
    tokens.add(`day-${Number(m[1])}`);
  }
  return [...tokens];
}
