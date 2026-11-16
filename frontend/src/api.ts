import type { ProcessResponse } from './types';

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed with status ${response.status}`;
}

export async function processFiles(files: File[]): Promise<ProcessResponse> {
  const form = new FormData();
  for (const file of files) form.append('files', file);

  const response = await fetch('/api/process', { method: 'POST', body: form });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as ProcessResponse;
}

export async function downloadDocx(result: ProcessResponse): Promise<void> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error(await readError(response));

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'meeting-summary.docx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
