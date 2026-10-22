// Býr til æfingadæmi af handahófi. Hvert dæmi: {expr, prompt, figure?}
// expr er venjulegur texti sem algebruvélin les (parse).

export const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const nz = (a, b) => { let n = 0; while (n === 0) n = ri(a, b); return n; };
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Einn liður sem texti, t.d. (−1,'x') -> '-x', (3,'') -> '3'
function term(c, v, first) {
  const abs = Math.abs(c);
  const body = v === '' ? String(abs) : (abs === 1 ? '' : abs) + v;
  if (first) return (c < 0 ? '-' : '') + body;
  return (c < 0 ? ' - ' : ' + ') + body;
}

// Liðastærð úr lista [[stuðull, breytuhluti], ...]
export function poly(terms) {
  const ts = terms.filter(([c]) => c !== 0);
  if (!ts.length) return '0';
  return ts.map(([c, v], i) => term(c, v, i === 0)).join('');
}

const par = (s) => '(' + s + ')';

const SIMPLIFY = 'Einfaldaðu eins og hægt er:';

// ---------- 1.1 Samlagning liðastærða ----------

const ch11 = [
  // Líkir liðir, ein breyta
  {
    level: 1,
    make() {
      const n = ri(3, 5);
      const ts = [];
      for (let i = 0; i < n; i++) ts.push([nz(-9, 9), i < 2 ? 'x' : pick(['x', ''])]);
      if (!ts.some(([, v]) => v === '')) ts.push([nz(-9, 9), '']);
      return { expr: poly(shuffle(ts)) };
    },
  },
  // Margföldun einliða, t.d. -2·(-3x)·x
  {
    level: 1,
    make() {
      const v = pick(['x', 'a', 'y']);
      const k = () => pick([-1, 1]) * ri(2, 6);
      return { expr: `${k()}·${par(k() + v)}·${v}` };
    },
  },
  // x·2·y·x·y·3
  {
    level: 1,
    make() {
      const f = shuffle(['x', 'y', pick(['x', 'y']), String(ri(2, 5)), String(ri(2, 5))]);
      return { expr: f.join('·') };
    },
  },
  // Sviga með mínus, t.d. (3x+2)-(x-5)
  {
    level: 2,
    make() {
      const v = pick(['x', 'a']);
      if (Math.random() < 0.4) return { expr: `${term(nz(-5, 5), v, true)} - ${par(term(nz(-6, 6), v, true))}${term(nz(-9, 9), '', false)}` };
      return { expr: `${par(poly([[nz(-6, 6), v], [nz(-9, 9), '']]))} - ${par(poly([[nz(-6, 6), v], [nz(-9, 9), '']]))}` };
    },
  },
  // Tvær breytur, breytur í mismunandi röð, t.d. 2x^2y-yx^2+4xy^2-3y^2x
  {
    level: 2,
    make() {
      const forms = [['x^2y', 'yx^2'], ['xy^2', 'y^2x'], ['xy', 'yx']];
      const a = pick(forms), b = pick(forms.filter((f) => f !== a));
      const ts = shuffle([[nz(-6, 6), a[0]], [nz(-6, 6), a[1]], [nz(-6, 6), b[0]], [nz(-6, 6), b[1]]]);
      return { expr: poly(ts) };
    },
  },
  // Ummál rétthyrnings
  {
    level: 2,
    make() {
      const w = [ri(1, 3), ri(1, 6)];
      const l = [ri(2, 4), -ri(1, 3)];
      const ws = poly([[w[0], 'x'], [w[1], '']]), ls = poly([[l[0], 'x'], [l[1], '']]);
      return {
        prompt: `Rétthyrningur hefur breiddina ${ws} og lengdina ${ls}. Finndu ummálið og einfaldaðu.`,
        figure: { type: 'rect', w: ws, l: ls },
        expr: `(${ws})+(${ls})+(${ws})+(${ls})`,
      };
    },
  },
  // Allt að 8 liðir
  {
    level: 3,
    make() {
      const vs = ['x', 'y', ''];
      const ts = [];
      for (let i = 0; i < 8; i++) ts.push([nz(-9, 9), vs[i % 3]]);
      return { expr: poly(shuffle(ts)) };
    },
  },
  // 2a(a-3ab)-a^2b-3a^2
  {
    level: 3,
    make() {
      const k = nz(-4, 4), m = nz(-5, 5);
      return { expr: `${k === 1 ? '' : k === -1 ? '-' : k}a${par(poly([[1, 'a'], [m, 'ab']]))}${term(nz(-5, 5), 'a^2b', false)}${term(nz(-5, 5), 'a^2', false)}` };
    },
  },
  // 2x(3x-2)-5+2(5+x(83-x))
  {
    level: 3,
    make() {
      const p = ri(2, 5), q = ri(2, 5), r = ri(1, 9), s = ri(1, 9), t = ri(2, 4), u = ri(1, 9), w = ri(2, 30);
      return { expr: `${p}x(${q}x - ${r}) - ${s} + ${t}(${u} + x(${w} - x))` };
    },
  },
];

// ---------- 2.1 Margföldun liðastærða ----------

const ch21 = [
  {
    level: 1,
    make() {
      const k = ri(2, 6), v = pick(['x', 'a']);
      return { expr: `${k}${v}(${poly([[1, v], [nz(-9, 9), '']])})` };
    },
  },
  {
    level: 1,
    make() {
      return { expr: `${ri(1, 9)} - ${ri(2, 6)}(x ${pick(['-', '+'])} ${ri(1, 9)})` };
    },
  },
  {
    level: 1,
    make() {
      return { expr: `${ri(2, 5)}(x + ${ri(1, 6)}) ${pick(['+', '-'])} ${ri(2, 5)}(x - ${ri(1, 6)})` };
    },
  },
  // (x+a)(x+b)
  {
    level: 2,
    make() {
      const v = pick(['x', 'a']);
      return { expr: `${par(poly([[1, v], [nz(-9, 9), '']]))}${par(poly([[1, v], [nz(-9, 9), '']]))}` };
    },
  },
  // (x-5)^2
  {
    level: 2,
    make() {
      const v = pick(['x', 'a', 'y']);
      return { expr: `${par(poly([[1, v], [nz(-9, 9), '']]))}^2` };
    },
  },
  // xy(y-1+x), a(a-b)-b(a-b)
  {
    level: 2,
    make() {
      if (Math.random() < 0.5) return { expr: `xy(${poly(shuffle([[1, 'y'], [nz(-5, 5), ''], [1, 'x']]))})` };
      const s = pick(['-', '+']);
      return { expr: `a(a ${s} b) - b(a ${s} b)` };
    },
  },
  // 3a^2b^3(2ab^2+3a^2b)
  {
    level: 2,
    make() {
      return { expr: `${ri(2, 4)}a^${ri(1, 3)}b^${ri(2, 3)}(${poly([[ri(1, 4), 'ab^2'], [nz(-4, 4), 'a^2b']])})` };
    },
  },
  // (2x-3y)^2
  {
    level: 3,
    make() {
      return { expr: `${par(poly([[ri(2, 4), 'x'], [nz(-4, 4), 'y']]))}^2` };
    },
  },
  // 2y-(x-1)(x+2-y)
  {
    level: 3,
    make() {
      return { expr: `${ri(2, 4)}y - (x - ${ri(1, 4)})(x + ${ri(1, 5)} - y)` };
    },
  },
  // a^2-(a-2)(a+3), (x-5)^2-(10-4x)
  {
    level: 3,
    make() {
      if (Math.random() < 0.5) return { expr: `a^2 - (a - ${ri(1, 6)})(a + ${ri(1, 6)})` };
      return { expr: `(x - ${ri(1, 6)})^2 - (${ri(2, 12)} - ${ri(2, 6)}x)` };
    },
  },
  // -(a+1)^2-(a-1)^2
  {
    level: 3,
    make() {
      return { expr: `-(a + ${ri(1, 4)})^2 ${pick(['-', '+'])} (a - ${ri(1, 4)})^2` };
    },
  },
  // 2x(xy+3)+y(2-2x^2)-6x
  {
    level: 3,
    make() {
      const k = ri(2, 4), m = ri(2, 5);
      return { expr: `${k}x(xy + ${m}) + y(${ri(1, 5)} - ${k}x^2) - ${k * m}x` };
    },
  },
];

export const GENERATORS = { '1.1': ch11, '2.1': ch21 };

// level: 1, 2, 3 eða 0 (blandað)
export function generate(chapterId, level = 0) {
  const all = GENERATORS[chapterId];
  const pool = level ? all.filter((g) => g.level === level) : all;
  const g = pick(pool.length ? pool : all);
  const d = g.make();
  return { prompt: d.prompt || SIMPLIFY, expr: d.expr, figure: d.figure, level: g.level, chapter: chapterId };
}
