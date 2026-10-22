// Keyrsla: node tests/algebra.test.mjs
import assert from 'node:assert/strict';
import { parse, solveSteps, expand, polyEqual, polyToNode, isFinalForm, toText, diagnose } from '../js/algebra.js';
import { generate, GENERATORS } from '../js/generators.js';

const final = (src) => { const n = parse(src); const s = solveSteps(n); return s.length ? s[s.length - 1].node : n; };
const simp = (src) => toText(final(src));
const eq = (a, b) => polyEqual(expand(parse(a)), expand(parse(b)));

// Sýnidæmi kennarans
const cases = {
  '-2·(-3x)·x': '6x^2',
  'x·2·y·x·y·3': '6x^2y^2',
  '2x^2y-yx^2+4xy^2-3y^2x': 'x^2y+xy^2',
  '-a-(-2a)-2': 'a-2',
  '2x(3x-2)-5+2(5+x(83-x))': '4x^2+162x+5',
  '4-3(x-2)': '-3x+10',
  '(x-5)^2': 'x^2-10x+25',
  '(2x-3y)^2': '4x^2-12xy+9y^2',
  '2x-3y^2': '2x-3y^2',
  'a^2-(a-2)(a+3)': '-a+6',
  '-(a+1)^2-(a-1)^2': '-2a^2-2',
  'a(a-b)-b(a-b)': 'a^2-2ab+b^2',
  '2x(xy+3)+y(2-2x^2)-6x': '2y',
};
for (const [q, a] of Object.entries(cases)) assert.equal(simp(q), a, q);

// Lestur úr ritlinum (LaTeX)
assert.ok(eq('2x\\left(3x-2\\right)', '6x^2-4x'));
assert.ok(eq('\\left(x-5\\right)^2', 'x^2-10x+25'));
assert.ok(eq('x^{10}y', 'x^(10)*y'));
assert.ok(eq('x^2y', 'y*x*x'));
assert.ok(eq('2\\cdot3x', '6x'));
assert.ok(eq('2xˆ2y', '2x²y'));
assert.ok(eq('−3x', '-3x'));
assert.throws(() => parse('(x+1'));
assert.throws(() => parse('x+1)'));
assert.throws(() => parse('4xy2'));

// Fullstytt form
assert.ok(isFinalForm(parse('x^2-10x+25')));
assert.ok(isFinalForm(parse('25-10x+x^2')));
assert.ok(!isFinalForm(parse('x^2-5x-5x+25')));
assert.ok(!isFinalForm(parse('x(x-10)+25')));
assert.ok(!isFinalForm(parse('x·x')));
assert.ok(diagnose(parse('x^2-10x+25'), parse('x^2+10x+25')).includes('formerk'));

// Handahófsdæmi: lausnin verður alltaf að vera jafngild og fullstytt
let count = 0;
for (const id of Object.keys(GENERATORS)) for (let lvl = 1; lvl <= 3; lvl++) for (let i = 0; i < 300; i++) {
  const d = generate(id, lvl);
  const n = parse(d.expr);
  const steps = solveSteps(n);
  const last = steps.length ? steps[steps.length - 1].node : n;
  assert.ok(polyEqual(expand(n), expand(last)), d.expr);
  assert.ok(isFinalForm(last), d.expr + ' -> ' + toText(last));
  for (const s of steps) assert.ok(polyEqual(expand(n), expand(parse(toText(s.node)))), 'skref ' + toText(s.node));
  count++;
}
console.log('Öll próf stóðust (' + count + ' handahófsdæmi).');
