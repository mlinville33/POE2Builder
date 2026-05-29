import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync, statSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILDS_DIR = resolve(__dirname, 'builds');

function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'build';
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function buildsPlugin(): Plugin {
  return {
    name: 'builds-storage',
    configureServer(server) {
      if (!existsSync(BUILDS_DIR)) mkdirSync(BUILDS_DIR, { recursive: true });

      server.middlewares.use('/api/builds', async (req, res) => {
        try {
          const url = (req.url ?? '/').split('?')[0];

          if (req.method === 'GET' && (url === '/' || url === '')) {
            const files = readdirSync(BUILDS_DIR).filter(f => f.endsWith('.json'));
            const builds = files.map(f => {
              const fp = resolve(BUILDS_DIR, f);
              const stat = statSync(fp);
              let name = f.replace(/\.json$/, '');
              try {
                const data = JSON.parse(readFileSync(fp, 'utf-8'));
                if (typeof data?.name === 'string') name = data.name;
              } catch { /* ignore parse errors */ }
              return { slug: f.replace(/\.json$/, ''), name, savedAt: stat.mtime.toISOString() };
            });
            sendJson(res, 200, builds);
            return;
          }

          if (req.method === 'POST' && url === '/save') {
            const body = await readJsonBody(req) as { name?: string };
            if (!body || typeof body.name !== 'string' || !body.name.trim()) {
              sendJson(res, 400, { error: 'name required' });
              return;
            }
            const slug = slugify(body.name);
            const fp = resolve(BUILDS_DIR, `${slug}.json`);
            const savedAt = new Date().toISOString();
            writeFileSync(fp, JSON.stringify({ ...body, savedAt }, null, 2));
            sendJson(res, 200, { slug, savedAt });
            return;
          }

          if (req.method === 'GET' && url.length > 1) {
            const slug = url.replace(/^\//, '').replace(/\.json$/, '');
            const fp = resolve(BUILDS_DIR, `${slug}.json`);
            if (!existsSync(fp)) {
              sendJson(res, 404, { error: 'not found' });
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(readFileSync(fp));
            return;
          }

          if (req.method === 'DELETE' && url.length > 1) {
            const slug = url.replace(/^\//, '').replace(/\.json$/, '');
            const fp = resolve(BUILDS_DIR, `${slug}.json`);
            if (existsSync(fp)) unlinkSync(fp);
            sendJson(res, 200, { ok: true });
            return;
          }

          sendJson(res, 405, { error: 'method not allowed' });
        } catch (err) {
          sendJson(res, 500, { error: (err as Error).message });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildsPlugin()],
  publicDir: 'data',
});
