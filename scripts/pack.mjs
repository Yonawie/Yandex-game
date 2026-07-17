import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const outDir = path.join(root, "store");
const outZip = path.join(outDir, "naydi-chto-to.zip");

if (!fs.existsSync(dist)) {
  console.error("dist/ missing — run npm run build first");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const r = spawnSync("zip", ["-r", "-9", outZip, "."], {
  cwd: dist,
  stdio: "inherit",
});
if (r.status !== 0) {
  console.error("zip failed");
  process.exit(r.status || 1);
}

const mb = (fs.statSync(outZip).size / (1024 * 1024)).toFixed(2);
console.log(`Packed ${outZip} (${mb} MB)`);
