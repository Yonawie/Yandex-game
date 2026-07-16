import { createWriteStream, readdirSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, "release");
const out = join(outDir, "echo-yandex.zip");

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

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`Packed ${kb(archive.pointer())} → ${out}`);

function walk(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, list);
    else list.push({ p, n: st.size });
  }
  return list;
}

const files = walk(dist).sort((a, b) => b.n - a.n);
const js = files.filter((f) => f.p.endsWith(".js"));
const fonts = files.filter((f) => f.p.includes(`${sep}fonts${sep}`) || f.p.endsWith(".woff2"));
console.log("Top assets:");
for (const f of files.slice(0, 8)) {
  console.log(`  ${kb(f.n).padStart(10)}  ${f.p.slice(dist.length + 1)}`);
}
console.log(
  `JS total ${kb(js.reduce((s, f) => s + f.n, 0))} · fonts ${kb(fonts.reduce((s, f) => s + f.n, 0))}`,
);
