import type { ActionItem } from '../types';

export const UNASSIGNED_KEY = 'Unassigned';

/** Group action items by owner; `null` owners get the explicit `Unassigned` bucket. */
export function groupActions(items: ActionItem[]): Record<string, ActionItem[]> {
  const grouped: Record<string, ActionItem[]> = {};
  for (const item of items) {
    const key = item.owner ?? UNASSIGNED_KEY;
    (grouped[key] ??= []).push(item);
  }
  return grouped;
}

export function collectUnassigned(items: ActionItem[]): ActionItem[] {
  return items.filter((item) => item.owner === null);
}
