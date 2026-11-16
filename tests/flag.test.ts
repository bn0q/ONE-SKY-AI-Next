import { describe, expect, it } from 'vitest';
import { normalize } from '../backend/src/pipeline/normalize';
import { extract } from '../backend/src/pipeline/extract';
import { flag } from '../backend/src/pipeline/flag';
import { collectUnassigned, groupActions, UNASSIGNED_KEY } from '../backend/src/pipeline/groups';
import type { ActionItem } from '../backend/src/types';
import { loadSample } from './fixtures';

function run(fileName: '01_no_decisions_brainstorm.txt' | '02_structured_with_followups.txt' | '03_thai_no_decisions_roadmap.txt' | '04_thai_conflicting_launch.txt') {
  const normalized = normalize(fileName, loadSample(fileName));
  const extracted = extract(normalized);
  return { normalized, extracted, flags: flag(normalized, extracted) };
}

describe('flag — no-decision meetings', () => {
  it('EDGE CASE: flags the EN no-decision meeting', () => {
    const { flags } = run('01_no_decisions_brainstorm.txt');
    expect(flags.some((f) => f.kind === 'no-decision')).toBe(true);
  });

  it('EDGE CASE: flags the TH no-decision meeting', () => {
    const { flags } = run('03_thai_no_decisions_roadmap.txt');
    expect(flags.some((f) => f.kind === 'no-decision')).toBe(true);
  });

  it('does NOT flag a meeting that has decisions', () => {
    const { flags } = run('02_structured_with_followups.txt');
    expect(flags.some((f) => f.kind === 'no-decision')).toBe(false);
  });
});

describe('flag — conflicting / inconsistent action items', () => {
  it('flags two different go-live dates with no decision resolving them', () => {
    const { flags } = run('04_thai_conflicting_launch.txt');
    const conflicts = flags.filter((f) => f.kind === 'conflicting-action-items');
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].detail).toMatch(/different dates|inconsistent deadlines/);
    expect(conflicts[0].evidence.length).toBeGreaterThan(0);
  });

  it('keeps evidence lines for a human to check', () => {
    const { flags } = run('04_thai_conflicting_launch.txt');
    const conflict = flags.find((f) => f.kind === 'conflicting-action-items');
    expect(conflict?.evidence.join(' ')).toMatch(/28|30|20|25/);
  });
});

describe('flag — unassigned action items', () => {
  it('flags an action item without an owner', () => {
    const { flags } = run('01_no_decisions_brainstorm.txt');
    expect(flags.some((f) => f.kind === 'unassigned-action-item')).toBe(true);
  });
});

describe('groupActions', () => {
  const items: ActionItem[] = [
    { id: '1', owner: 'Marcus', task: 'add index', due: 'Friday', sourceLine: 'x' },
    { id: '2', owner: null, task: 'pull churn numbers', due: null, sourceLine: 'y' },
    { id: '3', owner: 'Marcus', task: 'research logging', due: null, sourceLine: 'z' },
  ];

  it('groups by owner and puts null owners in an explicit Unassigned bucket', () => {
    const grouped = groupActions(items);
    expect(grouped.Marcus).toHaveLength(2);
    expect(grouped[UNASSIGNED_KEY]).toHaveLength(1);
  });

  it('never silently drops an unassigned item', () => {
    expect(collectUnassigned(items)).toHaveLength(1);
    expect(collectUnassigned(items)[0].task).toBe('pull churn numbers');
  });
});
