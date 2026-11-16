import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const SAMPLES = resolve(process.cwd(), 'samples');

const FILES = [
  '01_no_decisions_brainstorm.txt',
  '02_structured_with_followups.txt',
  '03_thai_no_decisions_roadmap.txt',
  '04_thai_conflicting_launch.txt',
];

test('upload across two rounds → submit → display all 3 sections → download Word', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Meeting Notes Distiller/ })).toBeVisible();

  // Requirement: more than one file at once AND several upload rounds.
  const input = page.getByTestId('file-input');
  await input.setInputFiles([resolve(SAMPLES, FILES[0]), resolve(SAMPLES, FILES[1])]);
  await expect(page.getByTestId('file-list').locator('li')).toHaveCount(2);

  await input.setInputFiles([resolve(SAMPLES, FILES[2]), resolve(SAMPLES, FILES[3])]);
  await expect(page.getByTestId('file-list').locator('li')).toHaveCount(4);

  await page.getByTestId('submit-button').click();
  await expect(page.getByTestId('results-section')).toBeVisible({ timeout: 20_000 });

  // Section 1 — meeting summary per meeting
  const meetings = page.getByTestId('meeting-summary');
  await expect(meetings).toHaveCount(4);
  await expect(meetings.first()).toContainText('Product Brainstorm');

  // Section 2 — action items grouped by owner
  await expect(page.getByTestId('grouped-actions')).toContainText('Marcus');
  await expect(page.getByTestId('grouped-actions')).toContainText('Unassigned');

  // Section 3 — unassigned / inconsistent items
  await expect(page.getByTestId('flagged-issues')).toContainText('no decision');
  await expect(page.getByTestId('flagged-issues').locator('[data-kind="conflicting-action-items"]').first()).toBeVisible();
  await expect(page.getByTestId('flagged-issues').locator('[data-kind="unassigned-action-item"]').first()).toBeVisible();

  // Requirement 6 — downloadable MS Word from the browser
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-button').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('meeting-summary.docx');
});

test('invalid upload shows an error state, not a blank frame', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({
    name: 'agenda.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 not a transcript'),
  });
  await page.getByTestId('submit-button').click();
  await expect(page.getByTestId('error-banner')).toBeVisible();
});
