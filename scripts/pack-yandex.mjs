import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'release');
const outFile = path.join(outDir, 'stay-lit-yandex.zip');

await mkdir(outDir, { recursive: true });

await new Promise((resolve, reject) => {
  const output = createWriteStream(outFile);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => resolve(undefined));
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(dist, false);
  void archive.finalize();
});

console.log(`Packed ${outFile}`);
