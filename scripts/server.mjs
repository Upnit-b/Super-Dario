import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_SECURITY_POLICY, PUBLIC_FILES, ROOT } from './static-files.mjs';

const allowed = new Set(PUBLIC_FILES);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

/** Serve only reviewed game assets, even if a secret file is added beside them. */
export function createGameServer({ root = ROOT, reportError = console.error } = {}) {
  return createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch (error) {
      if (!(error instanceof URIError || error instanceof TypeError)) throw error;
      response.writeHead(400);
      response.end('Invalid request path');
      return;
    }
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!allowed.has(file)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    try {
      const body = await readFile(join(root, file));
      response.writeHead(200, {
        'Content-Type': file === 'LICENSE' ? 'text/plain; charset=utf-8' : types[extname(file)],
        'Content-Length': body.byteLength,
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      // Report the failure without disclosing a home directory or request contents.
      reportError(`Game asset could not be served (${error.code}).`);
      response.writeHead(500);
      response.end('A required game asset is unavailable. Check the installation.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = process.env.PORT === undefined ? 8642 : Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const server = createGameServer();
  server.on('error', (error) => {
    console.error(
      `Local server failed (${error.code}). Check PORT and whether another instance is running.`,
    );
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Nova Rift: http://localhost:${port} (Ctrl+C to stop)`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close();
      server.closeAllConnections();
    });
  }
}
