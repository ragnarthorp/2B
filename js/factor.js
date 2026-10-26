// Þáttun skref fyrir skref: sameiginlegur þáttur, samokaregla og ágiskunarregla.
//
// Staða þáttunar: { k: {c, v}, fs: [{ ts: [{c, v}, ...], e }] }
//   k  = einliðan fremst (t.d. 3x), fs = svigarnir, ts = liðir í sviga, e = veldi svigans.

import {
  expand, toTex, toText, mono, monoKey, sortedVars, compareMono, isMonoish, toMono, STEP_TEXT, monoText, polyEqual, isFinalForm,
} from './algebra.js';

const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const supText = (s) => s.replace(/\^(\d+)/g, (_, d) => d.split('').map((x) => SUPS[x]).join(''));

Object.assign(STEP_TEXT, {
  fsimp: 'Einföldum stæðuna fyrst svo að allir liðirnir sjáist.',
  fprime: 'Skrifum hvern lið sem margfeldi þátta: tölurnar sem frumþætti og veldin sem endurtekna margföldun (x² = x·x).',
  fcommon: 'Finnum þættina sem allir liðirnir eiga sameiginlega og litum þá. Sameiginlegi þátturinn er margfeldi þeirra.',
  fout: 'Skrifum hvern lið sem sameiginlega þáttinn sinnum það sem eftir er af liðnum.',
  fbracket: 'Tökum sameiginlega þáttinn út fyrir sviga. Inn í svigann fer það sem eftir er af hverjum lið.',
  fsquares: 'Tveir liðir með mínus á milli og báðir eru ferningar. Skrifum þá sem ferninga: a² − b².',
  fconj: 'Samokareglan: a² − b² = (a + b)(a − b).',
  fguess: 'Ágiskunarreglan: x² + bx + c = (x + p)(x + q) þar sem p·q = c og p + q = b. Leitum að tveimur tölum sem margfaldaðar gefa aftasta liðinn og lagðar saman gefa miðstuðulinn.',
  ftrial: 'Ágiskun þegar stuðull er fyrir framan x²: prófum (px + q)(rx + s) þar sem p·r er fremsti stuðullinn, q·s er aftasti liðurinn og p·s + q·r er miðstuðullinn.',
  fpower: 'Sami svigi kemur tvisvar fyrir. Skrifum hann sem veldi.',
});

const COMMON_COLOR = '#ff9f43';
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

const note = (notes, t) => { if (!notes.includes(t)) notes.push(t); };
const termsOf = (P) => [...P.values()].map((t) => ({ c: t.c, v: { ...t.v } })).sort(compareMono);
const termNode = (t) => mono(t.c, t.v);
const polyNode = (ts) => (ts.length === 1 ? termNode(ts[0]) : { t: 'add', ts: ts.map((t) => ({ s: 1, n: termNode(t) })) });
const mulTerms = (a, b) => {
  const v = { ...a.v };
  for (const k in b.v) v[k] = (v[k] || 0) + b.v[k];
  return { c: a.c * b.c, v };
};
const divTerm = (a, g) => {
  const v = { ...a.v };
  for (const k in g.v) v[k] -= g.v[k];
  return { c: a.c / g.c, v: Object.fromEntries(Object.entries(v).filter(([, e]) => e)) };
};
const isTrivial = (g) => Math.abs(g.c) === 1 && !sortedVars(g.v).length;
const tTxt = (t) => monoText(t.c, t.v);
const factorKey = (ts) => ts.map((t) => t.c + ':' + monoKey(t.v)).join('|');

// ---------- Aðferðirnar ----------

// Stærsti sameiginlegi þáttur liðanna. Neikvæður ef fremsti liðurinn er neikvæður.
function gcfOf(ts) {
  let c = 0;
  for (const t of ts) c = gcd(c, t.c);
  const v = {};
  for (const k of sortedVars(ts[0].v)) {
    const m = Math.min(...ts.map((t) => t.v[k] || 0));
    if (m > 0) v[k] = m;
  }
  const g = { c, v };
  if (ts[0].c < 0 && (!isTrivial(g) || ts.length === 3)) g.c = -g.c;
  return isTrivial(g) && g.c === 1 ? null : g;
}

const isSquareInt = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));
function sqrtTerm(t) {
  if (!isSquareInt(t.c) || Object.values(t.v).some((e) => e % 2)) return null;
  return { c: Math.sqrt(t.c), v: Object.fromEntries(Object.entries(t.v).map(([k, e]) => [k, e / 2])) };
}

// a² − b² (í hvaða röð sem er)
function conjOf(ts) {
  if (ts.length !== 2) return null;
  const pos = ts.find((t) => t.c > 0), neg = ts.find((t) => t.c < 0);
  if (!pos || !neg) return null;
  const a = sqrtTerm(pos), b = sqrtTerm({ c: -neg.c, v: neg.v });
  return a && b ? { a, b, posFirst: ts[0] === pos } : null;
}

const divisors = (n) => {
  const out = [];
  for (let d = 1; d <= Math.abs(n); d++) if (n % d === 0) out.push(d);
  return out;
};

// A·u² + B·u·w + C·w²  ->  (p·u + q·w)(r·u + s·w)
function trinOf(ts) {
  if (ts.length !== 3) return null;
  const [t1, t2, t3] = ts;
  const vu = Object.entries(t1.v);
  if (!vu.length || vu.some(([, e]) => e % 2)) return null;
  const u = Object.fromEntries(vu.map(([k, e]) => [k, e / 2]));
  const vw = Object.entries(t3.v);
  if (vw.some(([, e]) => e % 2)) return null;
  const w = Object.fromEntries(vw.map(([k, e]) => [k, e / 2]));
  if (monoKey(u) === monoKey(w)) return null;
  if (monoKey(mulTerms({ c: 1, v: u }, { c: 1, v: w }).v) !== monoKey(t2.v)) return null;
  const A = t1.c, B = t2.c, C = t3.c;
  if (A <= 0) return null;
  for (const p of divisors(A)) {
    const r = A / p;
    if (p > r) break;
    for (const d of divisors(C)) for (const q of [d, -d]) {
      const s = C / q;
      if (p * s + q * r === B) return { A, B, C, p, q, r, s, u, w };
    }
  }
  return null;
}

// Er hægt að þátta þessa liðastærð frekar?
function canFactor(ts) {
  if (ts.length < 2) return false;
  const g = gcfOf(ts);
  if (g && !(isTrivial(g) && g.c === -1)) return true;
  return !!(conjOf(ts) || trinOf(ts.map((t) => (ts[0].c < 0 ? { c: -t.c, v: t.v } : t))));
}

// ---------- Birting ----------

function stateNode(st) {
  const parts = [];
  const kAbs = { c: Math.abs(st.k.c), v: st.k.v };
  if (kAbs.c !== 1 || sortedVars(kAbs.v).length || !st.fs.length) parts.push(termNode(kAbs));
  for (const f of st.fs) {
    const n = polyNode(f.ts);
    parts.push(f.e > 1 ? { t: 'pow', b: n, e: f.e } : n);
  }
  const node = parts.length === 1 ? parts[0] : { t: 'mul', f: parts };
  if (st.k.c >= 0) return node;
  if (node.t === 'mono') return mono(-node.c, node.v);
  return { t: 'add', ts: [{ s: -1, n: node }] };
}

// Stæða þar sem einn svigi (index i) er birtur á annan hátt (replacement-hnútur)
function stateNodeWith(st, i, replacement) {
  const fake = { ...st, fs: st.fs.map((f, j) => (j === i ? { ts: [{ c: 1, v: { __R: 1 } }], e: 1 } : f)) };
  const sub = (n) => {
    if (n.t === 'mono' && n.v.__R) return replacement;
    if (n.t === 'mul') return { ...n, f: n.f.map(sub) };
    if (n.t === 'add') return { ...n, ts: n.ts.map((x) => ({ s: x.s, n: sub(x.n) })) };
    if (n.t === 'pow') return { ...n, b: sub(n.b) };
    return n;
  };
  return sub(stateNode(fake));
}

const primesOf = (n) => {
  const out = [];
  n = Math.abs(n);
  for (let p = 2; p * p <= n; p++) while (n % p === 0) { out.push(p); n /= p; }
  if (n > 1) out.push(n);
  return out;
};

// Liður sem listi frumþátta: [{tex, kind:'num'|'var', key}]
function primeItems(t) {
  const items = primesOf(t.c).map((p) => ({ tex: String(p), key: 'n' + p }));
  for (const k of sortedVars(t.v)) for (let i = 0; i < t.v[k]; i++) items.push({ tex: k, key: 'v' + k });
  if (!items.length) items.push({ tex: '1', key: 'one' });
  return items;
}

// Liðirnir skrifaðir sem frumþættir; sameiginlegir þættir litaðir ef g er gefið
function primeTex(ts, g) {
  const need = {};
  if (g) {
    for (const p of primesOf(g.c)) need['n' + p] = (need['n' + p] || 0) + 1;
    for (const k of sortedVars(g.v)) need['v' + k] = g.v[k];
  }
  return ts.map((t, i) => {
    const left = { ...need };
    const body = primeItems(t).map((it) => {
      if (left[it.key] > 0) { left[it.key]--; return `\\textcolor{${COMMON_COLOR}}{${it.tex}}`; }
      return it.tex;
    }).join('\\cdot ');
    return (t.c < 0 ? '-' : i === 0 ? '' : '+') + body;
  }).join('');
}

function primeNode(ts) {
  const termOf = (t) => {
    const f = [...primesOf(t.c).map((p) => ({ t: 'num', v: p }))];
    for (const k of sortedVars(t.v)) for (let i = 0; i < t.v[k]; i++) f.push({ t: 'var', n: k });
    if (!f.length) f.push({ t: 'num', v: 1 });
    return f.length === 1 ? f[0] : { t: 'mul', f, atoms: true };
  };
  return { t: 'add', ts: ts.map((t) => ({ s: t.c < 0 ? -1 : 1, n: termOf(t) })) };
}

const smallEnough = (ts) => ts.length <= 4 && ts.every((t) => Math.abs(t.c) <= 200 && primeItems(t).length <= 9);

// ---------- Skrefin ----------

// Breytir stæðu í stöðu þáttunar
function initState(node) {
  const st = { k: { c: 1, v: {} }, fs: [] };
  const addFactor = (n, e) => {
    const P = expand(n);
    const ts = termsOf(P);
    if (ts.length === 0) { st.k = { c: 0, v: {} }; return; }
    if (ts.length === 1) { for (let i = 0; i < e; i++) st.k = mulTerms(st.k, ts[0]); return; }
    st.fs.push({ ts, e });
  };
  const rec = (n, e = 1) => {
    if (isMonoish(n)) { const m = toMono(n); for (let i = 0; i < e; i++) st.k = mulTerms(st.k, m); return; }
    if (n.t === 'mul') { n.f.forEach((f) => rec(f, e)); return; }
    if (n.t === 'pow') { rec(n.b, e * n.e); return; }
    if (n.t === 'neg') { st.k.c = -st.k.c; rec(n.n, e); return; }
    if (n.t === 'add' && n.ts.length === 1) { if (n.ts[0].s < 0 && e % 2) st.k.c = -st.k.c; rec(n.ts[0].n, e); return; }
    addFactor(n, e);
  };
  rec(node);
  // (x+1)² í inntaki: sviginn er geymdur með veldi
  return st;
}

export function factorSteps(start) {
  const steps = [];
  const push = (node, kinds, notes = [], tex) => steps.push({ tex: tex || toTex(node), kinds, notes, node, diagrams: [] });
  let st = initState(start);
  // Stæða sem er þegar einfölduð er ekki endurskrifuð (bara röð liðanna gæti breyst)
  const flatInput = isFinalForm(start) && st.fs.length === 1 && isTrivial(st.k) && st.k.c === 1;
  if (!flatInput && toTex(stateNode(st)) !== toTex(start)) push(stateNode(st), ['fsimp']);

  // Einliða ein og sér: skrifum hana sem frumþætti
  if (!st.fs.length) {
    const t = st.k;
    if (primeItems(t).length > 1) push(primeNode([t]), ['fprime'], [`${tTxt(t)} = ${primeItems(t).map((x) => x.tex).join('·')}`]);
    return steps;
  }

  let usedPrime = false;
  for (let guard = 0; guard < 20; guard++) {
    const i = st.fs.findIndex((f) => f.e === 1 && canFactor(f.ts));
    if (i < 0) break;
    const f = st.fs[i];
    const g = gcfOf(f.ts);

    if (g && !(isTrivial(g) && g.c === -1 && f.ts.length !== 3)) {
      // 1) Sameiginlegur þáttur
      const rest = f.ts.map((t) => divTerm(t, g));
      const alone = st.fs.length === 1 && isTrivial(st.k) && st.k.c === 1;
      if (alone && !usedPrime && smallEnough(f.ts) && !(isTrivial(g))) {
        usedPrime = true;
        const pn = primeNode(f.ts);
        push(pn, ['fprime'], f.ts.map((t) => `${tTxt(t).replace('−', '')} = ${primeItems(t).map((x) => x.tex).join('·')}`), primeTex(f.ts, null));
        const gl = [...primesOf(g.c).map(String), ...sortedVars(g.v).flatMap((k) => Array(g.v[k]).fill(k))];
        const gAbs = tTxt({ c: Math.abs(g.c), v: g.v });
        push(pn, ['fcommon'], [gl.length > 1 ? `Sameiginlegt: ${gl.join('·')} = ${gAbs}` : `Sameiginlegt: ${gAbs}`], primeTex(f.ts, g));
      }
      if (!isTrivial(g)) {
        // Jákvæður þáttur: formerkið stendur fyrir framan, t.d. 2·x² − 2·9
        const prod = (a, b) => ({ t: 'mul', f: [termNode(a), termNode(b)], prod: true, hl: COMMON_COLOR });
        const outNode = { t: 'add', ts: rest.map((r) => (g.c > 0 && r.c < 0 ? { s: -1, n: prod(g, { c: -r.c, v: r.v }) } : { s: 1, n: prod(g, r) })) };
        push(stateNodeWith(st, i, outNode), ['fout'], g.c < 0 ? ['Fremsti liðurinn er neikvæður, svo við tökum mínusinn líka út.'] : []);
      }
      st = { k: mulTerms(st.k, g), fs: st.fs.map((x, j) => (j === i ? { ts: rest, e: 1 } : x)) };
      push(stateNode(st), ['fbracket'], [isTrivial(g)
        ? 'Tökum −1 út fyrir sviga svo að fremsti liðurinn verði jákvæður. Öll formerki í svigunum snúast við.'
        : `Sameiginlegur þáttur: ${tTxt(g)}`]);
      continue;
    }

    const cj = conjOf(f.ts);
    if (cj) {
      // 2) Samokaregla
      const sq = (t) => ({ t: 'pow', b: termNode(t), e: 2 });
      const squares = { t: 'add', ts: [{ s: 1, n: sq(cj.a) }, { s: -1, n: sq(cj.b) }] };
      const sqNote = (t, r) => `${tTxt(t)} = ${supText(toText(sq(r)))}`;
      const posT = f.ts.find((t) => t.c > 0), negT = f.ts.find((t) => t.c < 0);
      const sqNotes = [sqNote(posT, cj.a), sqNote({ c: -negT.c, v: negT.v }, cj.b)].filter((x) => { const [l, r] = x.split(' = '); return l !== r; });
      push(stateNodeWith(st, i, squares), ['fsquares'], sqNotes);
      const plus = { ts: [cj.a, cj.b], e: 1 }, minus = { ts: [cj.a, { c: -cj.b.c, v: cj.b.v }], e: 1 };
      st = { k: st.k, fs: [...st.fs.slice(0, i), plus, minus, ...st.fs.slice(i + 1)] };
      push(stateNode(st), ['fconj'], [`a = ${tTxt(cj.a)} og b = ${tTxt(cj.b)}`]);
      continue;
    }

    let ts = f.ts, k = st.k;
    if (ts[0].c < 0) { ts = ts.map((t) => ({ c: -t.c, v: t.v })); k = { c: -k.c, v: k.v }; }
    const tr = trinOf(ts);
    if (!tr) break;
    // 3) Ágiskunarregla
    const n = (x) => (x < 0 ? `(${String(x).replace('-', '−')})` : String(x));
    const notes = [];
    if (tr.A === 1) {
      const pairs = [];
      for (const d of divisors(tr.C)) for (const q of [d, -d]) {
        const s = tr.C / q;
        if (q <= s && !pairs.some(([a, b]) => a === q && b === s)) pairs.push([q, s]);
      }
      pairs.sort((a, b) => Math.abs(a[0] + a[1] - tr.B) - Math.abs(b[0] + b[1] - tr.B));
      const shown = pairs.slice(0, 4).sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]) || a[0] - b[0]);
      note(notes, `Leitum að p·q = ${String(tr.C).replace('-', '−')} og p + q = ${String(tr.B).replace('-', '−')}`);
      const plain = (x) => String(x).replace('-', '−');
      for (const [q, s] of shown) note(notes, `${n(q)}·${n(s)} = ${plain(tr.C)}, ${n(q)} + ${n(s)} = ${plain(q + s)} ${q + s === tr.B ? '✓' : '✗'}`);
    } else {
      note(notes, `${tr.p}·${tr.r} = ${tr.A}, ${n(tr.q)}·${n(tr.s)} = ${n(tr.C)}`);
      note(notes, `Miðliður: ${tr.p}·${n(tr.s)} + ${n(tr.q)}·${tr.r} = ${n(tr.p * tr.s + tr.q * tr.r)} ✓`);
    }
    const lin = (a, b) => ({ ts: [{ c: a, v: tr.u }, { c: b, v: tr.w }], e: 1 });
    st = { k, fs: [...st.fs.slice(0, i), lin(tr.p, tr.q), lin(tr.r, tr.s), ...st.fs.slice(i + 1)] };
    push(stateNode(st), [tr.A === 1 ? 'fguess' : 'ftrial'], notes);
  }

  // Sami svigi oftar en einu sinni -> veldi
  const merged = [];
  for (const f of st.fs) {
    const m = merged.find((x) => factorKey(x.ts) === factorKey(f.ts));
    if (m) m.e += f.e; else merged.push({ ts: f.ts, e: f.e });
  }
  if (merged.length < st.fs.length) {
    st = { k: st.k, fs: merged };
    push(stateNode(st), ['fpower']);
  }
  if (steps.length) {
    const last = steps[steps.length - 1];
    last.notes = [...last.notes, 'Ekki er hægt að þátta lengra. Prófun: ef við margföldum út fáum við upphaflegu stæðuna.'];
  }
  return steps;
}

export const nextFactorStep = (node) => factorSteps(node)[0] || null;

// Er stæðan fullþáttuð? Allir svigar verða að vera óþáttanlegir og stæðan margfeldi (ekki summa af margfeldum).
export function isFullyFactored(node) {
  const adds = [];
  const rec = (n) => {
    if (isMonoish(n)) return;
    if (n.t === 'mul') return n.f.forEach(rec);
    if (n.t === 'pow') return rec(n.b);
    if (n.t === 'neg') return rec(n.n);
    if (n.t === 'add' && n.ts.length === 1) return rec(n.ts[0].n);
    adds.push(n);
  };
  rec(node);
  return adds.every((a) => {
    // Svigi þarf að vera einfaldaður: engin margföldun eða líkir liðir eftir inni í honum
    const ts = termsOf(expand(a));
    if (ts.length < 2) return true;
    if (a.ts.length !== ts.length || a.ts.some(({ n }) => !isMonoish(n))) return false;
    return !canFactor(ts);
  });
}

// Fyrir dæmaframleiðanda og prófanir
export const factoredEqual = (a, b) => polyEqual(expand(a), expand(b));
