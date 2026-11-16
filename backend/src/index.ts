import { createApp } from './app';

// 3101 (not 3001) avoids colliding with other local projects sharing this machine.
const port = Number(process.env.PORT ?? 3101);

createApp().listen(port, () => {
  console.log(`[api] Meeting Notes Distiller backend listening on http://localhost:${port}`);
});
