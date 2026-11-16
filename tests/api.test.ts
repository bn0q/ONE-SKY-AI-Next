import { describe, expect, it } from 'vitest';
import { processTranscripts, summarize } from '../backend/src/pipeline/index';
import { allSamples, loadSample } from './fixtures';

describe('processTranscripts — batch behaviour', () => {
  it('processes all 4 provided transcripts together without crashing', () => {
    const result = processTranscripts(allSamples());
    expect(result.meetings).toHaveLength(4);
    expect(result.warnings).toHaveLength(0);
    expect(new Set(result.meetings.map((m) => m.format)).size).toBe(4);
  });

  it('groups action items across meetings by owner', () => {
    const result = processTranscripts(allSamples());
    expect(Object.keys(result.groupedActions)).toContain('Marcus');
    expect(Object.keys(result.groupedActions)).toContain('Unassigned');
  });

  it('skips non-.txt files with a warning but still processes the valid ones', () => {
    const result = processTranscripts([
      { fileName: 'agenda.pdf', content: 'not a transcript' },
      { fileName: 'notes.txt', content: loadSample('02_structured_with_followups.txt') },
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('agenda.pdf');
    expect(result.meetings).toHaveLength(1);
  });

  it('an empty file produces an explicit parse-error flag, not an exception', () => {
    const meeting = summarize({ fileName: 'empty.txt', content: '' });
    expect(meeting.flags.some((f) => f.kind === 'parse-error')).toBe(true);
    expect(meeting.topics.length).toBeGreaterThan(0);
  });

  it('unknown binary-ish content degrades to plain without throwing', () => {
    expect(() => summarize({ fileName: 'weird.txt', content: '\u0000\u0001Ã©Â®' })).not.toThrow();
    expect(summarize({ fileName: 'weird.txt', content: '\u0000\u0001Ã©Â®' }).format).toBe('plain');
  });

  it('returns null (not 0 or empty) for values it cannot measure', () => {
    const meeting = summarize({ fileName: 'bare.txt', content: 'A bare note with no dates or names' });
    expect(meeting.date).toBeNull();
    expect(meeting.actionItems.every((item) => item.due === null || typeof item.due === 'string')).toBe(true);
  });
});
