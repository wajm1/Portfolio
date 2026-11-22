import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((source, i) => new vm.Script(source, { filename: `inline-${i}.js` }));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
for (const [, target] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
  if (target.startsWith('#')) {
    assert(ids.includes(target.slice(1)), `Missing anchor ${target}`);
  } else if (!/^(https?:|mailto:|data:)/.test(target)) {
    assert(existsSync(new URL('../' + target, import.meta.url)), `Missing local asset ${target}`);
  }
}
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Exactly one primary heading');
assert(!/1,600|rtt 24ms|Jan &rsquo;27|0\.5&nbsp;mm/.test(html), 'Stale claims');
assert(!/href="[^"]*resume[^"#]*\.pdf"/i.test(html), 'Resume publication is deferred');
assert(!/career_refresh|\.tex\b|résumé/i.test(html), 'Private career materials must stay off the public site');
console.log("PASS: inline syntax, local links, anchors, and metadata checks.");
