import app from "./_app.js";

export default function handler(req: any, res: any) {
  try {
    if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('http')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[API INDEX HANDLER CRASH]', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: 'Authentication service temporarily unavailable. Please try again.',
        errorId: `INDEX-ERR-${Date.now()}`
      });
    }
  }
}

export { app };

