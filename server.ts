import express from 'express';
import path from 'path';
import app, { checkAndSend24hReminders } from './src/apiApp';

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);

    // Background 24h reminder scheduler (runs every 1 hour & on startup)
    setTimeout(() => {
      checkAndSend24hReminders().catch(err => console.error('Initial 24h reminder check failed:', err));
    }, 5000);

    setInterval(() => {
      checkAndSend24hReminders().catch(err => console.error('Periodic 24h reminder check failed:', err));
    }, 60 * 60 * 1000);
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;
