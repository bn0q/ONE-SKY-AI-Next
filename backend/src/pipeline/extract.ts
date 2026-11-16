import type { ActionItem, Decision, Extracted, NormalizedTranscript, Topic } from '../types';
import {
  ACTION_MARKERS,
  DECISION_MARKERS,
  DUE_PATTERNS,
  NEGATION_MARKERS,
  OWNER_PATTERNS,
  SUBJECT_KEYWORDS,
  TOPIC_START_MARKERS,
} from '../patterns';

const MAX_SUMMARY = 300;
const MAX_TASK = 220;

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

/** Strip list markers / headings but keep the speaker prefix (owner patterns need it). */
function cleanLine(line: string): string {
  return line.replace(/^[-*]\s*/, '').replace(/^#{1,6}\s*/, '').trim();
}

function meaningful(line: string): boolean {
  const cleaned = cleanLine(line);
  if (!cleaned) return false;
  if (/^\[[^\]]+\]$/.test(cleaned)) return false;
  return true;
}

function makeSummary(lines: string[]): string {
  const parts = lines.map(cleanLine).filter(meaningful).slice(0, 3);
  return truncate(parts.join(' ') || 'No detail recorded.', MAX_SUMMARY);
}

function topicTitleFromHeading(heading: string): string {
  return heading.replace(/^Topic\s*\d+\s*:\s*/i, '').trim();
}

function buildStructuredTopics(lines: string[]): Topic[] {
  const topics: Topic[] = [];
  let current: Topic | null = null;

  for (const line of lines) {
    const heading = line.match(/^#{2,3}\s+(.+)$/);
    if (heading?.[1]) {
      current = {
        title: topicTitleFromHeading(heading[1]),
        summary: '',
        sourceLines: [line.trim()],
      };
      topics.push(current);
      continue;
    }
    if (current && cleanLine(line)) current.sourceLines.push(line.trim());
  }

  for (const topic of topics) topic.summary = makeSummary(topic.sourceLines);
  return topics;
}

function buildBulletTopics(lines: string[]): Topic[] {
  const topics: Topic[] = [];
  let current: Topic | null = null;

  for (const line of lines) {
    const cleaned = cleanLine(line);
    if (!cleaned || !/^[-*]/.test(line.trim())) continue;
    const startsTopic = TOPIC_START_MARKERS.some((re) => re.test(cleaned));
    if (startsTopic || !current) {
      const title = truncate(cleaned.split(/[,.–—:]/)[0], 70);
      current = { title, summary: '', sourceLines: [line.trim()] };
      topics.push(current);
    } else {
      current.sourceLines.push(line.trim());
    }
  }

  if (topics.length === 0) {
    const body = lines.filter(meaningful);
    topics.push({ title: 'Discussion notes', summary: makeSummary(body), sourceLines: body.map((l) => l.trim()) });
  }
  for (const topic of topics) topic.summary = makeSummary(topic.sourceLines);
  return topics;
}

function buildDialogueTopics(lines: string[]): Topic[] {
  const body = lines.filter(meaningful);
  const used = new Set<string>();
  const topics: Topic[] = [];

  for (const subject of SUBJECT_KEYWORDS) {
    const matched = body.filter((line) => subject.re.test(cleanLine(line)));
    if (matched.length < 2) continue;
    for (const line of matched) used.add(line.trim());
    topics.push({
      title: subject.key,
      summary: makeSummary(matched),
      sourceLines: matched.map((l) => l.trim()),
    });
  }

  const rest = body.filter((line) => !used.has(line.trim()));
  if (rest.length > 0) {
    topics.push({
      title: 'Other discussion',
      summary: makeSummary(rest),
      sourceLines: rest.map((l) => l.trim()),
    });
  }

  if (topics.length === 0) {
    return [{ title: 'Discussion', summary: makeSummary(body), sourceLines: body.map((l) => l.trim()) }];
  }
  return topics;
}

function buildTopics(n: NormalizedTranscript): Topic[] {
  switch (n.format) {
    case 'structured-markdown':
      return buildStructuredTopics(n.lines);
    case 'dialogue':
      return buildDialogueTopics(n.lines);
    case 'bullet-notes':
    case 'thai-notes':
      return buildBulletTopics(n.lines);
    default: {
      const body = n.lines.filter(meaningful);
      return [{ title: 'Discussion', summary: makeSummary(body), sourceLines: body.map((l) => l.trim()) }];
    }
  }
}

function topicForLine(topics: Topic[], line: string): string {
  const trimmed = line.trim();
  return topics.find((topic) => topic.sourceLines.includes(trimmed))?.title ?? topics[0]?.title ?? 'General';
}

function extractDecisions(n: NormalizedTranscript, topics: Topic[]): Decision[] {
  const decisions: Decision[] = [];
  for (const line of n.lines) {
    const cleaned = cleanLine(line);
    if (!cleaned) continue;
    if (!DECISION_MARKERS.some((re) => re.test(cleaned))) continue;
    if (NEGATION_MARKERS.some((re) => re.test(cleaned))) continue;
    decisions.push({
      topic: topicForLine(topics, line),
      text: truncate(cleaned, MAX_TASK),
      sourceLine: line.trim(),
    });
  }
  return decisions;
}

/**
 * Explicit English patterns win; Thai names have no word boundaries, so they are
 * resolved against the names actually seen in the transcript (longest first).
 * We never invent an owner: an unresolved line stays `null`.
 */
function resolveOwner(text: string, aliases: Map<string, string>): string | null {
  for (const pattern of OWNER_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  const sorted = [...aliases.keys()].sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (alias.length >= 2 && text.includes(alias)) return aliases.get(alias) as string;
  }
  return null;
}

/** Map every name variant (bare speaker name, คุณ-prefixed name) to one canonical name. */
function buildNameAliases(n: NormalizedTranscript): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const participant of n.participants) aliases.set(participant, participant);
  for (const speaker of n.speakers) {
    const canonical = n.participants.find((p) => p === speaker || p.endsWith(speaker)) ?? speaker;
    aliases.set(speaker, canonical);
  }
  return aliases;
}

function resolveDue(text: string): string | null {
  for (const pattern of DUE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractActions(n: NormalizedTranscript): ActionItem[] {
  const items: ActionItem[] = [];
  const nameAliases = buildNameAliases(n);
  for (let index = 0; index < n.lines.length; index += 1) {
    const line = n.lines[index];
    const cleaned = cleanLine(line);
    if (!cleaned) continue;
    if (!ACTION_MARKERS.some((re) => re.test(cleaned))) continue;
    items.push({
      id: `${n.fileName}#${index}`,
      owner: resolveOwner(cleaned, nameAliases),
      task: truncate(cleaned, MAX_TASK),
      due: resolveDue(cleaned),
      sourceLine: line.trim(),
    });
  }
  return items;
}

/** Pure, deterministic extraction. No I/O, no LLM, no mocks needed to test it. */
export function extract(n: NormalizedTranscript): Extracted {
  const topics = buildTopics(n);
  return {
    topics,
    decisions: extractDecisions(n, topics),
    actionItems: extractActions(n),
  };
}
