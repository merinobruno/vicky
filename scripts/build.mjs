import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'app.js', 'game.mjs']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
await mkdir(new URL('assets/', output), { recursive: true });
for (const path of ['assets/favicon.svg', 'assets/miku.webp']) await cp(new URL(path, root), new URL(path, output));
console.log(`Built static website: ${fileURLToPath(output)}`);
