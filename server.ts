import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'node:stream';
import {
  getCatalog,
  search,
  getSeries,
  getEpisodes,
  getCategories,
  unlockEpisode,
  getDetail,
  download,
  normalizeLanguage,
  getHotWords
} from './server/freeReelsApi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Enable CORS for API routes if needed
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// API Routes
app.get('/api/feed', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const count = Number(req.query.count) || 16;
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);

    const data = await getCatalog({ page, count, language, country });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/feed:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch drama feed' });
  }
});

app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      res.status(400).json({ success: false, error: 'Query parameter q is required' });
      return;
    }
    const page = Number(req.query.page) || 1;
    const count = Number(req.query.count) || 24;
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);

    const data = await search(query, { page, count, language, country });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/search:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to search drama' });
  }
});

app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);
    const data = await getCategories({ language, country });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/categories:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch categories' });
  }
});

app.get('/api/hot-words', async (req: Request, res: Response) => {
  try {
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);
    const data = await getHotWords({ language, country });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/hot-words:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch hot words' });
  }
});

app.get('/api/series/:id', async (req: Request, res: Response) => {
  try {
    const seriesId = req.params.id;
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);

    const data = await getDetail(seriesId, { language, country });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error(`Error in /api/series/${req.params.id}:`, err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch series details' });
  }
});

app.get('/api/series/:id/episodes', async (req: Request, res: Response) => {
  try {
    const seriesId = req.params.id;
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);

    const data = await getEpisodes(seriesId, { language, country });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error(`Error in /api/series/${req.params.id}/episodes:`, err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch episodes' });
  }
});

app.post('/api/series/:id/unlock/:episodeId', async (req: Request, res: Response) => {
  try {
    const { id: seriesId, episodeId } = req.params;
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);

    const data = await unlockEpisode(seriesId, episodeId, { language, country });
    
    // Add proxied streaming URL for bulletproof cross-origin playback
    const proxiedUrl = data.url
      ? `/api/proxy-m3u8?url=${encodeURIComponent(data.url)}`
      : null;

    res.json({
      success: true,
      data: {
        ...data,
        proxiedUrl
      }
    });
  } catch (err: any) {
    console.error(`Error in /api/series/${req.params.id}/unlock/${req.params.episodeId}:`, err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to unlock episode' });
  }
});

app.get('/api/resolve', async (req: Request, res: Response) => {
  try {
    const input = (req.query.input as string) || '';
    const episode = req.query.episode as string | undefined;
    const country = (req.query.country as string) || 'ID';
    const language = normalizeLanguage(req.query.lang as string, country);

    if (!input) {
      res.status(400).json({ success: false, error: 'input parameter is required' });
      return;
    }

    const data = await download(input, { episode, language, country });
    const proxiedUrl = data.url
      ? `/api/proxy-m3u8?url=${encodeURIComponent(data.url)}`
      : null;

    res.json({ success: true, data: { ...data, proxiedUrl } });
  } catch (err: any) {
    console.error('Error in /api/resolve:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to resolve video' });
  }
});

// Proxy for M3U8 playlists (rewrites sub-playlists and segments to proxy routes with CORS)
app.get('/api/proxy-m3u8', async (req: Request, res: Response) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('url parameter is required');
      return;
    }

    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      res.status(resp.status).send('Failed upstream m3u8');
      return;
    }

    const text = await resp.text();
    const baseUrl = new URL(targetUrl);

    // Rewrite lines inside m3u8
    const lines = text.split('\n');
    const rewritten = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Check if tag contains URI="..."
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/URI="([^"]+)"/g, (_m, subUri) => {
          const absolute = new URL(subUri, baseUrl).href;
          if (absolute.includes('.m3u8')) {
            return `URI="/api/proxy-m3u8?url=${encodeURIComponent(absolute)}"`;
          }
          return `URI="/api/proxy-media?url=${encodeURIComponent(absolute)}"`;
        });
      }

      // Non-tag line is a stream or segment URL
      const absolute = new URL(trimmed, baseUrl).href;
      if (absolute.includes('.m3u8')) {
        return `/api/proxy-m3u8?url=${encodeURIComponent(absolute)}`;
      }
      return `/api/proxy-media?url=${encodeURIComponent(absolute)}`;
    }).join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(rewritten);
  } catch (err: any) {
    console.error('Error proxying m3u8:', err.message);
    res.status(500).send(err.message || 'Error proxying m3u8');
  }
});

// Proxy for binary media segments (.mp4, .ts, .aac)
app.get('/api/proxy-media', async (req: Request, res: Response) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('url parameter is required');
      return;
    }

    const headers: Record<string, string> = {};
    if (req.headers.range) {
      headers['range'] = req.headers.range;
    }

    const upstream = await fetch(targetUrl, { headers });
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Cache immutable media chunks for 24h to avoid repeat cellular downloads on mobile
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    if (upstream.headers.get('content-type')) {
      res.setHeader('Content-Type', upstream.headers.get('content-type')!);
    }
    if (upstream.headers.get('content-length')) {
      res.setHeader('Content-Length', upstream.headers.get('content-length')!);
    }
    if (upstream.headers.get('content-range')) {
      res.setHeader('Content-Range', upstream.headers.get('content-range')!);
    }
    if (upstream.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges')!);
    }

    res.status(upstream.status);

    if (upstream.body) {
      // Pipe stream with natural backpressure to prevent buffer bloat and lag on mobile
      Readable.fromWeb(upstream.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send(err.message || 'Media proxy error');
    }
  }
});

// Proxy for subtitles with VTT conversion and CORS
app.get('/api/proxy-subtitle', async (req: Request, res: Response) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('url parameter is required');
      return;
    }

    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      res.status(resp.status).send('Failed to fetch subtitle');
      return;
    }

    const text = await resp.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(text);
  } catch (err: any) {
    res.status(500).send(err.message || 'Subtitle proxy error');
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
