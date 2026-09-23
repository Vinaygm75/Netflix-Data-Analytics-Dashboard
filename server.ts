import path from 'path';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import app, { loadEmployeesFromGoogleSheets, PORT } from './api/_app.ts';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);

// START EXPRESS SERVER WITH VITE SPA MIDDLEWARE (Standalone / Local / Container environment)
export async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      // Guard against API routes falling through to index.html
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FLYING WHALES] Production server running on http://0.0.0.0:${PORT}`);
    // Lightweight background sync of employees only - never blocks server startup or login
    loadEmployeesFromGoogleSheets().catch((e: any) => {
      console.warn('[STARTUP] Employees sync notice:', e?.message);
    });
  });
}

// Export the Express app as default and named exports
export default app;
export { app };

// Only invoke app.listen() when running in standalone mode (NOT in Vercel serverless functions)
if (!isVercel) {
  startServer().catch((err) => {
    console.error('[STANDALONE SERVER ERROR]', err);
  });
}
