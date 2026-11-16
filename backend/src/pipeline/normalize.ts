import type { NormalizedTranscript, TranscriptFormat } from '../types';
import {
  DATE_PATTERNS,
  NON_SPEAKER_LABELS,
  PARTICIPANT_LINE,
  SPEAKER_LINE,
} from '../patterns';

function splitParticipants(raw: string): string[] {
  return raw
    .split(/[,+&]|และ/)
    .map((part) => part.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

function detectFormat(lines: string[], speakers: string[]): TranscriptFormat {
  const joined = lines.join('\n');
  if (/^#{2,3}\s/m.test(joined) || /^Attendees:/im.test(joined)) return 'structured-markdown';
  if (/^\[บันทึกการประชุม\]/m.test(joined) || speakers.length >= 3) return 'dialogue';
  if (/^ppl:/im.test(joined)) return 'bullet-notes';
  if (/^(?:คนเข้าร่วม|ผู้เข้าร่วม)\s*:/im.test(joined)) return 'thai-notes';
  return 'plain';
}

function findDate(lines: string[]): string | null {
  for (const line of lines) {
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
  }
  return null;
}

function findTitle(lines: string[]): string {
  const first = lines.find((line) => line.trim().length > 0) ?? 'Untitled meeting';
  return first.replace(/^\s*\[[^\]]+\]\s*/u, '').trim() || 'Untitled meeting';
}

/**
 * Convert raw text into a line model. Never throws: unknown input degrades to `plain`.
 */
export function normalize(fileName: string, raw: string): NormalizedTranscript {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trimEnd());

  const participants: string[] = [];
  const speakers: string[] = [];

  for (const line of lines) {
    const participantMatch = line.match(PARTICIPANT_LINE);
    if (participantMatch?.[1]) {
      for (const name of splitParticipants(participantMatch[1])) {
        if (!participants.includes(name)) participants.push(name);
      }
      continue;
    }

    const speakerMatch = line.match(SPEAKER_LINE);
    if (speakerMatch?.[1]) {
      const label = speakerMatch[1].trim();
      if (!NON_SPEAKER_LABELS.has(label.toLowerCase())) {
        if (!speakers.includes(label)) speakers.push(label);
      }
    }
  }

  // In dialogue transcripts the speakers are also participants. Keep one
  // canonical name per person: `คุณโก้` (from คุณ...) wins over bare `โก้`.
  for (const speaker of speakers) {
    const hasCanonical = participants.some(
      (participant) => participant === speaker || participant.endsWith(speaker),
    );
    if (!hasCanonical) participants.push(speaker);
  }

  return {
    fileName,
    format: detectFormat(lines, speakers),
    title: findTitle(lines),
    date: findDate(lines),
    lines,
    participants,
    speakers,
  };
}
