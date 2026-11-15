import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

// One allowlist defines both the local HTTP surface and the distributable build.
// Never copy the repository recursively: it may contain Git history or local secrets.
export const PUBLIC_FILES = Object.freeze([
  'index.html',
  'styles.css',
  'js/audio.js',
  'js/levels.js',
  'js/game.js',
  'js/ui.js',
  'js/renderer.mjs',
  'vendor/three.core.js',
  'vendor/three.module.min.js',
  'vendor/THREE-LICENSE.txt',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
]);

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // The HUD sets element styles at runtime; no inline JavaScript is permitted.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');
