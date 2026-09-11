import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const workcellHtml = readFileSync(new URL('../workcell.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((source, i) => new vm.Script(source, { filename: `inline-${i}.js` }));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
for (const page of [html, workcellHtml]) {
  for (const [, target] of page.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    if (target.startsWith('#')) {
      if (page === html) assert(ids.includes(target.slice(1)), `Missing anchor ${target}`);
    } else if (!/^(https?:|mailto:|data:)/.test(target)) {
      assert(existsSync(new URL('../' + target, import.meta.url)), `Missing local asset ${target}`);
    }
  }
}
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Exactly one primary heading');
assert(!/1,600|rtt 24ms|Jan &rsquo;27|0\.5&nbsp;mm/.test(html), 'Stale claims');
assert(!/href="[^"]*resume[^"#]*\.pdf"/i.test(html), 'Resume publication is deferred');
assert(!/career_refresh|\.tex\b|résumé/i.test(html + workcellHtml), 'Private career materials must stay off the public site');
assert(/Workcell Feasibility Lab/i.test(workcellHtml), 'Workcell page must keep its engineering-tool title');
assert(/OMPL discrete motion validation/i.test(workcellHtml), 'Workcell must cite discrete motion-validation method');
assert(/not executable robot/i.test(workcellHtml), 'CSV must be labeled non-executable');
execFileSync(process.execPath, [path.join(root, 'scripts/test-workcell.mjs')], { stdio: 'inherit' });
// Exercise the actual checked-in solver without a browser or hardware.
const main = scripts.find(s => s.includes('function IKArm'));
const solverSource = main.slice(main.indexOf('function IKArm'), main.indexOf('function CollabEditor'));
let scheduled = 0;
const context = vm.createContext({ Math, REDUCED: true, requestAnimationFrame: () => ++scheduled });
vm.runInContext(solverSource, context);
const arm = Object.create(context.IKArm.prototype);
Object.assign(arm, { ratios: [.4, .34, .26], limits: [1.75, 2.55, 2.55], segs: 3,
  base: { x: 0, y: 0 }, R: 100, L: [40, 34, 26], rest: { x: 18, y: -62 },
  _draw() {}, _hud() {}, visible: true, armed: true, active: false });
let cases = 0;
for (let x = -140; x <= 140; x += 20) for (let y = -140; y <= 140; y += 20) {
  arm._seed();
  const target = { x, y };
  for (let i = 0; i < 18; i++) arm._fabrik(target);
  assert.equal(arm.points[0].x, 0); assert.equal(arm.points[0].y, 0);
  for (let j = 0; j < 3; j++) {
    const a = arm.points[j], b = arm.points[j + 1];
    assert(Math.abs(Math.hypot(b.x-a.x, b.y-a.y)-arm.L[j]) < 1e-8, 'Fixed link length');
    const prev = j ? Math.atan2(a.y-arm.points[j-1].y, a.x-arm.points[j-1].x) : -Math.PI/2;
    const delta = arm._norm(Math.atan2(b.y-a.y,b.x-a.x)-prev);
    assert(Math.abs(delta) <= arm.limits[j] + 1e-8, 'Joint constraint');
  }
  const tip = arm.points[3], error = Math.hypot(tip.x-x, tip.y-y);
  if (arm._solutionStatus(target) === 'SOLVED') assert(error <= 1, 'No false solved status');
  if (Math.hypot(x,y) > 100) assert.equal(arm._solutionStatus(target), 'UNREACHABLE');
  cases++;
}
arm.target = { x: 30, y: -65 }; arm._kick();
assert.equal(scheduled, 0, 'Reduced motion must not animate');
assert.equal(arm.rawTarget.x, 30, 'Reduced motion still accepts targets');
arm.visible = false; arm.target = { x: 40, y: -60 }; arm._kick();
assert.equal(arm.rawTarget.x, 30, 'Offscreen solver does not run');
arm.visible = true; arm.limits = [.5, .6, .6]; arm.target = { x: -50, y: -50 }; arm._kick();
assert.equal(arm._solutionStatus(arm.target), 'LIMITED', 'Tight-limit example must be genuinely constrained');
// Run the real preset click handlers against a minimal event surface.
// This is a behavior regression test, not a browser layout substitute.
const explanation = { textContent: '' };
const buttons = ['reachable', 'limited', 'unreachable', 'reset'].map(mode => ({
  dataset: { ikPreset: mode }, attributes: {}, listeners: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  addEventListener(name, callback) { this.listeners[name] = callback; }
}));
context.window = { addEventListener() {} };
context.document = {
  getElementById(id) { return id === 'ik-explanation' ? explanation : null; },
  querySelector() { return null; },
  querySelectorAll(selector) {
    return selector.includes('[aria-pressed]') ? buttons.slice(0, 3) : buttons;
  }
};
context.TOUCH = false;
arm.figure = { addEventListener() {} }; arm.canvas = {}; arm._fit = () => {};
arm.limits = [1.75, 2.55, 2.55]; arm.armed = false; arm._init();
for (const [index, expected] of [[0, 'SOLVED'], [1, 'LIMITED'], [2, 'UNREACHABLE']]) {
  buttons[index].listeners.click();
  assert.equal(arm.status, expected, `${buttons[index].dataset.ikPreset} click`);
  assert.equal(buttons[index].attributes['aria-pressed'], 'true');
  assert(explanation.textContent.length > 30, 'Preset explains its geometry');
}
buttons[3].listeners.click();
assert.deepEqual([...arm.limits], [1.75, 2.55, 2.55]);
assert.equal(arm.target.x, arm.rest.x); assert.equal(arm.target.y, arm.rest.y);
assert(buttons.slice(0, 3).every(b => b.attributes['aria-pressed'] === 'false'));
console.log(`PASS: inline syntax, local links, anchors, metadata checks; ${cases} solver poses; reduced-motion/offscreen behavior; four preset click handlers.`);
