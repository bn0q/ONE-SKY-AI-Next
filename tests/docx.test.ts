import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildDocx } from '../backend/src/docx';
import { processTranscripts } from '../backend/src/pipeline/index';
import { allSamples } from './fixtures';

describe('buildDocx — MS Word deliverable', () => {
  it('produces a valid OOXML zip containing word/document.xml', async () => {
    const buffer = await buildDocx(processTranscripts(allSamples()));
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('word/document.xml')).not.toBeNull();
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
  });

  it('includes the three required display sections and the meeting titles', async () => {
    const buffer = await buildDocx(processTranscripts(allSamples()));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(xml).toContain('Meeting Summaries');
    expect(xml).toContain('Action Items Grouped by Owner');
    expect(xml).toContain('Unassigned and Inconsistent Items');
    expect(xml).toContain('Product Brainstorm');
  });

  it('renders missing values as a dash, never as 0', async () => {
    const buffer = await buildDocx({
      meetings: [processTranscripts([{ fileName: 'bare.txt', content: 'A bare note' }]).meetings[0]],
      groupedActions: {},
      warnings: [],
    });
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('—');
  });
});
