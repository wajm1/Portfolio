import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, [path.join(root, 'scripts/validate.mjs')], { stdio: 'inherit' });
const files = ['index.html', 'favicon.svg', 'workcell.html', 'workcell/model.mjs', 'workcell/lab.mjs', 'workcell/lab.css', 'uploads/viam-throw-catch.gif', 'uploads/rf-ideas/demo.mp4',
  'uploads/rf-ideas/poster.jpg', 'uploads/rf-ideas/gui.jpg'];
const banned = /(career_refresh|\.tex$|\.pdf$|\.log$|credentials?|token|secret)/i;
// Refuse unexpected existing output instead of silently packaging private files.
function walk(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? walk(path.join(dir, e.name), prefix + e.name + '/') : [prefix + e.name]);
}
mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const file of walk(path.join(root, 'dist'))) {
  if (!files.includes(file)) throw new Error(`Unexpected public output: ${file}`);
  if (banned.test(file)) throw new Error(`Private material in public output: ${file}`);
}
for (const file of files) {
  if (banned.test(file)) throw new Error(`Refusing to publish private material: ${file}`);
  const target = path.join(root, 'dist', file);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(root, file), target);
}
const packaged = walk(path.join(root, 'dist'));
assertNoPrivate(packaged);
console.log(`Built ${files.length} explicitly allowed public assets. Private career materials excluded.`);
function assertNoPrivate(list) {
  for (const file of list) {
    if (banned.test(file) || file.includes('career_refresh')) throw new Error(`Private material leaked into dist: ${file}`);
  }
}
