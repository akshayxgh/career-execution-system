import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate process.env so serverless functions in api/ can read SUPABASE_URL, etc.
  Object.assign(process.env, env);

  const importApiHandler = (relPath: string) => {
    const fullPath = path.resolve(process.cwd(), relPath);
    return import(/* @vite-ignore */ `${pathToFileURL(fullPath).href}?t=${Date.now()}`);
  };

  return {
    plugins: [
      react(),
      {
        name: 'local-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const urlPath = req.url ? req.url.split('?')[0] : '';
            if (!urlPath.startsWith('/api/')) return next();

            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let handlerModule: any;
              if (urlPath === '/api/agent/context') {
                handlerModule = await importApiHandler('./api/agent/context.js');
              } else if (urlPath === '/api/agent/actions') {
                handlerModule = await importApiHandler('./api/agent/actions.js');
              } else if (urlPath === '/api/agent/publish-status') {
                handlerModule = await importApiHandler('./api/agent/publish-status.js');
              } else if (urlPath === '/api/agent/people') {
                handlerModule = await importApiHandler('./api/agent/people.js');
              } else if (urlPath === '/api/agent/opportunities') {
                handlerModule = await importApiHandler('./api/agent/opportunities.js');
              } else if (urlPath === '/api/agent/analytics') {
                handlerModule = await importApiHandler('./api/agent/analytics.js');
              } else if (urlPath === '/api/agent/memory') {
                handlerModule = await importApiHandler('./api/agent/memory.js');
              } else if (urlPath === '/api/agent/maintenance') {
                handlerModule = await importApiHandler('./api/agent/maintenance.js');
              } else if (urlPath === '/api/session') {
                handlerModule = await importApiHandler('./api/session.js');
              } else if (urlPath === '/api/login') {
                handlerModule = await importApiHandler('./api/login.js');
              } else if (urlPath === '/api/logout') {
                handlerModule = await importApiHandler('./api/logout.js');
              } else {
                return next();
              }

              // Parse request body for POST/PATCH/PUT
              let body = {};
              if (['POST', 'PATCH', 'PUT'].includes(req.method || '')) {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                }
                const raw = Buffer.concat(chunks).toString('utf8');
                try {
                  body = JSON.parse(raw);
                } catch {
                  body = raw;
                }
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (req as any).body = body;

              // Attach Express/Vercel helper methods to res
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (res as any).status = function (code: number) {
                this.statusCode = code;
                return this;
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (res as any).json = function (data: any) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(data));
                return this;
              };

              const handler = handlerModule.default || handlerModule;
              await handler(req, res);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'API error';
              console.error('Local API error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, message }));
            }
          });
        },
      },
    ],
  };
});
