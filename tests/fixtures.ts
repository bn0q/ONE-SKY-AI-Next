import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { InputFile } from '../backend/src/types';

const SAMPLES_DIR = resolve(process.cwd(), 'samples');

export const SAMPLE_FILES = [
  '01_no_decisions_brainstorm.txt',
  '02_structured_with_followups.txt',
  '03_thai_no_decisions_roadmap.txt',
  '04_thai_conflicting_launch.txt',
] as const;

export type SampleName = (typeof SAMPLE_FILES)[number];

export function loadSample(name: SampleName): string {
  return readFileSync(resolve(SAMPLES_DIR, name), 'utf8');
}

export function allSamples(): InputFile[] {
  return SAMPLE_FILES.map((fileName) => ({ fileName, content: loadSample(fileName) }));
}
