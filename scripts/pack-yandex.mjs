import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, "release");
const out = join(outDir, "sotoslov-yandex.zip");

await mkdir(outDir, { recursive: true });

const output = createWriteStream(out);
const archive = archiver("zip", { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  output.on("close", resolve);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(dist, false);
  archive.finalize();
});

console.log(`Packed ${archive.pointer()} bytes → ${out}`);
