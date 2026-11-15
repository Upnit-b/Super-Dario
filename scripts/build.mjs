import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PUBLIC_FILES, ROOT } from './static-files.mjs';

/** Rebuild only the generated dist directory; source and repository metadata stay put. */
export async function build() {
  const output = join(ROOT, 'dist');
  await rm(output, { recursive: true, force: true });
  for (const file of PUBLIC_FILES) {
    const destination = join(output, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(ROOT, file), destination);
  }
  await writeFile(join(output, '.nojekyll'), '');
  console.log(`Built dist/ with ${PUBLIC_FILES.length} public files and .nojekyll.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await build();
}
