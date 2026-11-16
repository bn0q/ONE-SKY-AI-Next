import { describe, expect, it } from 'vitest';
import { normalize } from '../backend/src/pipeline/normalize';
import { extract } from '../backend/src/pipeline/extract';
import { loadSample } from './fixtures';

function run(fileName: '01_no_decisions_brainstorm.txt' | '02_structured_with_followups.txt' | '03_thai_no_decisions_roadmap.txt' | '04_thai_conflicting_launch.txt') {
  return extract(normalize(fileName, loadSample(fileName)));
}

describe('extract — structured English transcript', () => {
  it('produces topics, per-topic decisions and owned action items', () => {
    const result = run('02_structured_with_followups.txt');
    expect(result.topics.length).toBeGreaterThanOrEqual(5);
    expect(result.topics.every((topic) => topic.summary.length > 0)).toBe(true);
    expect(result.decisions).toHaveLength(4);
    expect(result.actionItems.length).toBeGreaterThanOrEqual(5);
    expect(new Set(result.actionItems.map((item) => item.owner))).toEqual(
      new Set(['Dana', 'Tomás', 'Marcus']),
    );
  });

  it('carries deadlines through as strings, not invented values', () => {
    const result = run('02_structured_with_followups.txt');
    expect(result.actionItems.some((item) => item.due === 'Friday')).toBe(true);
    expect(result.actionItems.some((item) => item.due === 'next Monday')).toBe(true);
    expect(result.actionItems.some((item) => item.due === null)).toBe(true);
  });

  it('groups the postmortem action under Tomás, not the facilitator Priya', () => {
    const result = run('02_structured_with_followups.txt');
    const postmortem = result.actionItems.find((item) => item.task.includes('postmortem doc'));
    expect(postmortem?.owner).toBe('Tomás');
  });
});

describe('extract — edge cases required by the assignment', () => {
  it('EDGE CASE: an action item with no owner stays owner=null (never invented)', () => {
    const raw = 'Standup\n\n- Someone should pull the churn numbers by Friday\n';
    const result = extract(normalize('edge.txt', raw));
    expect(result.actionItems).toHaveLength(1);
    expect(result.actionItems[0].owner).toBeNull();
    expect(result.actionItems[0].due).toBe('Friday');
  });

  it('EDGE CASE: a no-decision meeting yields zero decisions (EN)', () => {
    expect(run('01_no_decisions_brainstorm.txt').decisions).toHaveLength(0);
  });

  it('EDGE CASE: a no-decision meeting yields zero decisions (TH)', () => {
    expect(run('03_thai_no_decisions_roadmap.txt').decisions).toHaveLength(0);
  });

  it('does not treat "agreed we need numbers but nobody committed" as a decision', () => {
    const result = run('01_no_decisions_brainstorm.txt');
    expect(result.decisions.some((d) => d.text.includes('nobody committed'))).toBe(false);
  });

  it('surfaces at least one unassigned action item from the EN brainstorm', () => {
    expect(run('01_no_decisions_brainstorm.txt').actionItems.some((item) => item.owner === null)).toBe(true);
  });
});

describe('extract — Thai dialogue transcript', () => {
  it('resolves Thai owners to one canonical name and extracts Thai deadlines', () => {
    const result = run('04_thai_conflicting_launch.txt');
    const owners = [...new Set(result.actionItems.map((item) => item.owner))];
    expect(owners.some((owner) => owner?.startsWith('คุณ'))).toBe(true);
    expect(owners).not.toContain('โก้');
    expect(result.actionItems.some((item) => item.due === '25')).toBe(true);
  });

  it('never crashes on a plain/unknown transcript', () => {
    expect(() => extract(normalize('x.txt', 'just a line\nanother line'))).not.toThrow();
    expect(extract(normalize('x.txt', 'just a line\nanother line')).topics.length).toBeGreaterThan(0);
  });
});
