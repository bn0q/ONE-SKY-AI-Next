import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocx } from './docx';
import { processTranscripts } from './pipeline/index';
import type { InputFile, ProcessResponse } from './types';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(HERE, '../../frontend/dist');

type UploadedFile = { originalname: string; buffer: Buffer };
type MulterRequest = Request & { files?: UploadedFile[] };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 20 },
});

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'meeting-notes-distiller' });
  });

  app.post('/api/process', upload.array('files', 20), (req: Request, res: Response) => {
    const uploaded = (req as MulterRequest).files ?? [];
    if (uploaded.length === 0) {
      res.status(400).json({ error: 'No .txt files were uploaded.' });
      return;
    }

    const inputs: InputFile[] = uploaded.map((file) => ({
      fileName: file.originalname,
      content: file.buffer.toString('utf8'),
    }));

    const result = processTranscripts(inputs);
    if (result.meetings.length === 0) {
      res.status(400).json({ error: 'No supported .txt meeting notes were found.', warnings: result.warnings });
      return;
    }
    res.json(result);
  });

  app.post('/api/export', async (req: Request, res: Response) => {
    const payload = req.body as ProcessResponse | undefined;
    if (!payload || !Array.isArray(payload.meetings) || !payload.groupedActions) {
      res.status(400).json({ error: 'Invalid result payload.' });
      return;
    }

    try {
      const buffer = await buildDocx(payload);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="meeting-summary.docx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: `Could not build the Word file: ${String(error)}` });
    }
  });

  // In production the backend also serves the built SPA (npm start).
  if (existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.use((req: Request, res: Response, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
        return;
      }
      next();
    });
  }

  return app;
}
