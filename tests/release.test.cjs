const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { mkdtemp, rm, readFile, readdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const run = promisify(execFile);

async function serve(t, options) {
  const { createGameServer } = await import('../scripts/server.mjs');
  const server = createGameServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

test('the local server serves the game and applies browser security headers', async (t) => {
  const url = await serve(t);
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(await response.text(), /Nova Rift/);
  const module = await fetch(`${url}/vendor/three.module.min.js`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /javascript/);
  const head = await fetch(`${url}/js/game.js`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('the server never exposes repository files, credentials, directories or unknown paths', async (t) => {
  const url = await serve(t);
  for (const file of [
    '.git/config',
    '.env',
    'package.json',
    'README.md',
    'tests/game.test.cjs',
    'scripts/server.mjs',
    'js/',
    'missing.js',
    '%2eenv',
    '..%2f.git%2fconfig',
  ]) {
    const response = await fetch(`${url}/${file}`);
    assert.equal(response.status, 404, file);
  }
});

test('malformed paths and unsupported HTTP methods are rejected explicitly', async (t) => {
  const url = await serve(t);
  assert.equal((await fetch(`${url}/%ZZ`)).status, 400);
  const response = await fetch(url, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('a missing published asset returns an error and logs a redacted diagnostic', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'nova-server-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const errors = [];
  const url = await serve(t, { root, reportError: (message) => errors.push(message) });
  assert.equal((await fetch(`${url}/js/game.js`)).status, 500);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /ENOENT/);
  assert.equal(errors[0].includes(root), false);
});

test('the release build contains exactly the approved public assets and licenses', async () => {
  const { build } = await import('../scripts/build.mjs');
  const { PUBLIC_FILES } = await import('../scripts/static-files.mjs');
  await build();
  const files = await readdir('dist', { recursive: true, withFileTypes: true });
  const actual = files
    .filter((file) => file.isFile())
    .map((file) =>
      path
        .relative(path.resolve('dist'), path.join(file.parentPath, file.name))
        .split(path.sep)
        .join('/'),
    )
    .sort();
  assert.deepEqual(actual, [...PUBLIC_FILES, '.nojekyll'].sort());
  assert.equal(await readFile('dist/js/game.js', 'utf8'), await readFile('js/game.js', 'utf8'));
});

test('the server command rejects invalid port configuration and reports occupied ports', async (t) => {
  for (const port of ['invalid', '0', '65536', '8642.5']) {
    await assert.rejects(
      run(process.execPath, ['scripts/server.mjs'], { env: { ...process.env, PORT: port } }),
      (error) =>
        error.code === 1 && /PORT must be an integer between 1 and 65535/.test(error.stderr),
    );
  }
  const url = await serve(t);
  await assert.rejects(
    run(process.execPath, ['scripts/server.mjs'], {
      env: { ...process.env, PORT: new URL(url).port },
    }),
    (error) => error.code === 1 && /Local server failed \(EADDRINUSE\)/.test(error.stderr),
  );
});
