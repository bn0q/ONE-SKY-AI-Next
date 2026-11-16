import { describe, expect, it } from 'vitest';
import { normalize } from '../backend/src/pipeline/normalize';
import { loadSample, SAMPLE_FILES } from './fixtures';

describe('normalize — format detection (≥3 real formats, EN + TH)', () => {
  it.each([
    ['01_no_decisions_brainstorm.txt', 'bullet-notes'],
    ['02_structured_with_followups.txt', 'structured-markdown'],
    ['03_thai_no_decisions_roadmap.txt', 'thai-notes'],
    ['04_thai_conflicting_launch.txt', 'dialogue'],
  ] as const)('%s → %s', (fileName, expected) => {
    expect(normalize(fileName, loadSample(fileName)).format).toBe(expected);
  });

  it('degrades unknown input to plain instead of throwing', () => {
    const result = normalize('mystery.txt', '\u0000âŸ· random bytes Â©Â®');
    expect(result.format).toBe('plain');
    expect(result.title).toBeTruthy();
  });

  it('handles an empty file without throwing', () => {
    expect(() => normalize('empty.txt', '')).not.toThrow();
    expect(normalize('empty.txt', '').format).toBe('plain');
  });
});

describe('normalize — metadata', () => {
  it('extracts EN and TH dates', () => {
    expect(normalize('a.txt', loadSample('01_no_decisions_brainstorm.txt')).date).toBe('3/12/26');
    expect(normalize('b.txt', loadSample('02_structured_with_followups.txt')).date).toBe('2026-03-23');
    expect(normalize('c.txt', loadSample('03_thai_no_decisions_roadmap.txt')).date).toBe('30/3/69');
    expect(normalize('d.txt', loadSample('04_thai_conflicting_launch.txt')).date).toBe('2 เมษายน 2026');
  });

  it('extracts participants from all 4 label variants', () => {
    expect(normalize('b.txt', loadSample('02_structured_with_followups.txt')).participants).toEqual([
      'Priya', 'Marcus', 'Dana', 'Tomás',
    ]);
    expect(normalize('a.txt', loadSample('01_no_decisions_brainstorm.txt')).participants).toHaveLength(2);
    expect(normalize('c.txt', loadSample('03_thai_no_decisions_roadmap.txt')).participants.length).toBeGreaterThan(0);
  });

  it('keeps one canonical Thai name per person (คุณX, not a duplicate bare X)', () => {
    const result = normalize('d.txt', loadSample('04_thai_conflicting_launch.txt'));
    expect(result.participants).toContain('คุณโก้');
    expect(result.participants).not.toContain('โก้');
    expect(result.participants).toHaveLength(4);
  });

  it('strips the [record] prefix from a dialogue title', () => {
    expect(normalize('d.txt', loadSample('04_thai_conflicting_launch.txt')).title).toBe('ประชุมวางแผนเปิดตัวแอป');
  });

  it('detects all sample files consistently through the whole fixture set', () => {
    const formats = SAMPLE_FILES.map((name) => normalize(name, loadSample(name)).format);
    expect(new Set(formats).size).toBe(4);
  });
});
