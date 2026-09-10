import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, [path.join(root, 'scripts/validate.mjs')], { stdio: 'inherit' });
const files = ['index.html', 'favicon.svg', 'uploads/rf-ideas/demo.mp4',
  'uploads/rf-ideas/poster.jpg', 'uploads/rf-ideas/gui.jpg'];
// Refuse unexpected existing output instead of silently packaging private files.
function walk(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? walk(path.join(dir, e.name), prefix + e.name + '/') : [prefix + e.name]);
}
mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const file of walk(path.join(root, 'dist'))) {
  if (!files.includes(file)) throw new Error(`Unexpected public output: ${file}`);
}
for (const file of files) {
  const target = path.join(root, 'dist', file);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(root, file), target);
}
console.log(`Built ${files.length} explicitly allowed public assets. Private career materials excluded.`);
