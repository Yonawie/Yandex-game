import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const child = spawn("npx", ["vite", "--host", "0.0.0.0", "--port", "5173"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

console.log("\nСотослов → http://127.0.0.1:5173\n");
child.on("exit", (code) => process.exit(code ?? 0));
