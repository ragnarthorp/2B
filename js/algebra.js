// Algebruvél: les stæður, einfaldar liðastærðir skref fyrir skref og ber saman svör.
//
// Hnútar (AST):
//   {t:'num', v}            jákvæð heiltala (eða neikvæð eftir útreikning)
//   {t:'var', n}            breyta, einn stafur
//   {t:'pow', b, e}         veldi með heiltöluveldisvísi e >= 0
//   {t:'mul', f:[...]}      margfeldi
//   {t:'add', ts:[{s, n}]}  summa; s = +1 eða -1
//   {t:'neg', n}            formerki inni í margfeldi, t.d. 2·-3
//   {t:'mono', c, v:{x:2}}  einfaldaður einliður (aðeins búinn til af vélinni)

// ---------- Lestur ----------

export class ParseError extends Error {}

// Breytir LaTeX frá ritlinum eða venjulegum texta í einfaldan texta.
export function normalizeInput(src) {
  let s = String(src);
  s = s.replace(/\\placeholder(\[[^\]]*\])?\{[^}]*\}/g, '');
  s = s.replace(/\\(m)?(left|right)\s*([()[\]]|\\\{|\\\}|\.)/g, (_, _m, _lr, p) => p === '.' ? '' : p);
  s = s.replace(/\\(big|Big|bigg|Bigg)[lr]?/g, '');
  s = s.replace(/\\lparen/g, '(').replace(/\\rparen/g, ')');
  s = s.replace(/\\(cdot|times|ast)/g, '*');
  s = s.replace(/\\[,;:! ]|\\quad|\\qquad/g, ' ');
  if (/\\frac|\\dfrac|\\div|\//.test(s)) throw new ParseError('Deiling og brot eru ekki studd enn.');
  if (/\\sqrt/.test(s)) throw new ParseError('Rætur eru ekki studdar enn.');
  s = s.replace(/[·×∙⋅*]/g, '*');
  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/[ˆ]/g, '^').replace(/\*\*/g, '^');
  const sup = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^(' + [...m].map((ch) => sup[ch]).join('') + ')');
  // Í LaTeX gildir x^23 = x^{2}3, þannig að veldi án slaufusviga tekur bara eitt tákn.
  s = s.replace(/\^\s*([0-9a-zA-Z])/g, '^($1)');
  s = s.replace(/[{[]/g, '(').replace(/[}\]]/g, ')');
  s = s.replace(/\\[a-zA-Z]+/g, (m) => { throw new ParseError('Óþekkt tákn: ' + m); });
  return s;
}

function tokenize(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      if (s[j] === '.' || s[j] === ',') throw new ParseError('Tugabrot eru ekki studd enn.');
      toks.push({ k: 'num', v: parseInt(s.slice(i, j), 10) });
      i = j;
    } else if (/[a-zA-ZáéíóúýþæöðÁÉÍÓÚÝÞÆÖÐ]/.test(ch)) {
      toks.push({ k: 'var', v: ch });
      i++;
    } else if ('+-*^()'.includes(ch)) {
      toks.push({ k: ch });
      i++;
    } else if (ch === '=') {
      throw new ParseError('Skrifaðu bara stæðuna, án jafnaðarmerkis.');
    } else {
      throw new ParseError('Óþekkt tákn: „' + ch + '“');
    }
  }
  return toks;
}

export function parse(src) {
  const toks = tokenize(normalizeInput(src));
  if (toks.length === 0) throw new ParseError('Ekkert dæmi skrifað.');
  let p = 0;
  const peek = () => toks[p];
  const eat = (k) => {
    const t = toks[p];
    if (!t || t.k !== k) throw new ParseError(k === ')' ? 'Það vantar lokasviga „)“.' : 'Villa í stæðunni.');
    p++;
    return t;
  };

  function expr() {
    const ts = [];
    let s = 1;
    if (peek() && (peek().k === '+' || peek().k === '-')) { s = peek().k === '-' ? -1 : 1; p++; }
    ts.push({ s, n: term() });
    while (peek() && (peek().k === '+' || peek().k === '-')) {
      s = peek().k === '-' ? -1 : 1;
      p++;
      ts.push({ s, n: term() });
    }
    if (ts.length === 1 && ts[0].s === 1) return ts[0].n;
    return { t: 'add', ts };
  }

  function term() {
    const f = [factor()];
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.k === '*') { p++; f.push(factor()); continue; }
      if (t.k === 'var' || t.k === '(') { f.push(factor()); continue; }
      if (t.k === 'num') throw new ParseError('Tala á eftir breytu eða sviga: notaðu ^ fyrir veldi eða · fyrir margföldun.');
      break;
    }
    return f.length === 1 ? f[0] : { t: 'mul', f };
  }

  function factor() {
    const t = peek();
    if (t && t.k === '-') { p++; return { t: 'neg', n: factor() }; }
    if (t && t.k === '+') { p++; return factor(); }
    const b = primary();
    if (peek() && peek().k === '^') {
      p++;
      const e = exponent();
      if (peek() && peek().k === '^') throw new ParseError('Settu sviga utan um veldið, t.d. (x^2)^3.');
      return { t: 'pow', b, e };
    }
    return b;
  }

  function exponent() {
    const t = peek();
    if (t && t.k === 'num') { p++; return t.v; }
    if (t && t.k === '(') {
      p++;
      const n = peek();
      if (n && n.k === 'num' && toks[p + 1] && toks[p + 1].k === ')') { p += 2; return n.v; }
      if (n && n.k === '-') throw new ParseError('Neikvæðir veldisvísar eru ekki studdir enn.');
    }
    throw new ParseError('Veldisvísir verður að vera heil tala.');
  }

  function primary() {
    const t = peek();
    if (!t) throw new ParseError('Stæðan endar of snemma.');
    if (t.k === 'num') { p++; return { t: 'num', v: t.v }; }
    if (t.k === 'var') { p++; return { t: 'var', n: t.v }; }
    if (t.k === '(') {
      p++;
      if (peek() && peek().k === ')') throw new ParseError('Tómur svigi.');
      const e = expr();
      eat(')');
      return e;
    }
    if (t.k === ')') throw new ParseError('Of margir lokasvigar „)“.');
    throw new ParseError('Villa í stæðunni við „' + t.k + '“.');
  }

  const e = expr();
  if (p < toks.length) {
    if (toks[p].k === ')') throw new ParseError('Of margir lokasvigar „)“.');
    throw new ParseError('Villa í stæðunni.');
  }
  return e;
}

// ---------- Einliðir og margliður ----------

const sortedVars = (v) => Object.keys(v).filter((k) => v[k] !== 0).sort();
const monoKey = (v) => sortedVars(v).map((k) => k + '^' + v[k]).join('*');
const mono = (c, v = {}) => ({ t: 'mono', c, v: Object.fromEntries(sortedVars(v).map((k) => [k, v[k]])) });

export function isMonoish(n) {
  switch (n.t) {
    case 'num': case 'var': case 'mono': return true;
    case 'pow': return isMonoish(n.b);
    case 'neg': return isMonoish(n.n);
    case 'mul': return n.f.every(isMonoish);
    case 'add': return n.ts.length === 1 && isMonoish(n.ts[0].n);
    default: return false;
  }
}

// Reiknar einliðu: {c, v}
export function toMono(n) {
  switch (n.t) {
    case 'num': return { c: n.v, v: {} };
    case 'var': return { c: 1, v: { [n.n]: 1 } };
    case 'mono': return { c: n.c, v: { ...n.v } };
    case 'neg': { const m = toMono(n.n); return { c: -m.c, v: m.v }; }
    case 'add': { const m = toMono(n.ts[0].n); return { c: n.ts[0].s * m.c, v: m.v }; }
    case 'pow': {
      const m = toMono(n.b);
      const v = {};
      for (const k in m.v) v[k] = m.v[k] * n.e;
      return { c: Math.pow(m.c, n.e), v };
    }
    case 'mul': {
      let c = 1;
      const v = {};
      for (const f of n.f) {
        const m = toMono(f);
        c *= m.c;
        for (const k in m.v) v[k] = (v[k] || 0) + m.v[k];
      }
      return { c, v };
    }
  }
  throw new Error('ekki einliða');
}

const monoNode = (m) => mono(m.c, m.v);

// Margliða sem Map: lykill -> {c, v}
export function expand(n) {
  const out = new Map();
  const addTo = (map, c, v) => {
    const k = monoKey(v);
    const cur = map.get(k);
    if (cur) cur.c += c; else map.set(k, { c, v: { ...v } });
  };
  const mulPolys = (A, B) => {
    const r = new Map();
    for (const a of A.values()) for (const b of B.values()) {
      const v = { ...a.v };
      for (const k in b.v) v[k] = (v[k] || 0) + b.v[k];
      addTo(r, a.c * b.c, v);
    }
    return r;
  };
  const rec = (n) => {
    switch (n.t) {
      case 'num': case 'var': case 'mono': {
        const m = toMono(n);
        const r = new Map();
        addTo(r, m.c, m.v);
        return r;
      }
      case 'neg': {
        const r = rec(n.n);
        for (const x of r.values()) x.c = -x.c;
        return r;
      }
      case 'add': {
        const r = new Map();
        for (const { s, n: t } of n.ts) for (const x of rec(t).values()) addTo(r, s * x.c, x.v);
        return r;
      }
      case 'mul': {
        let r = new Map([['', { c: 1, v: {} }]]);
        for (const f of n.f) r = mulPolys(r, rec(f));
        return r;
      }
      case 'pow': {
        let r = new Map([['', { c: 1, v: {} }]]);
        const b = rec(n.b);
        for (let i = 0; i < n.e; i++) r = mulPolys(r, b);
        return r;
      }
    }
    throw new Error('óþekktur hnútur');
  };
  for (const [k, x] of rec(n)) if (x.c !== 0) out.set(k, x);
  return out;
}

export function polyEqual(A, B) {
  if (A.size !== B.size) return false;
  for (const [k, x] of A) { const y = B.get(k); if (!y || y.c !== x.c) return false; }
  return true;
}

const degree = (v) => Object.values(v).reduce((a, b) => a + b, 0);

// Margliða -> hnútur í staðalformi (hæsta stig fyrst, svo stafrófsröð).
function compareMono(a, b) {
  {
    const d = degree(b.v) - degree(a.v);
    if (d) return d;
    const va = sortedVars(a.v), vb = sortedVars(b.v);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      if (va[i] !== vb[i]) {
        if (va[i] === undefined) return 1;
        if (vb[i] === undefined) return -1;
        return va[i] < vb[i] ? -1 : 1;
      }
      if (a.v[va[i]] !== b.v[vb[i]]) return b.v[vb[i]] - a.v[va[i]];
    }
    return 0;
  }
}

export function polyToNode(P) {
  const ms = [...P.values()].sort(compareMono);
  if (ms.length === 0) return mono(0);
  if (ms.length === 1) return monoNode(ms[0]);
  return { t: 'add', ts: ms.map((m) => ({ s: 1, n: monoNode(m) })) };
}

// ---------- Prentun (LaTeX) ----------

function absNode(n) {
  // skilar [formerki, hnútur án formerkis]
  if (n.t === 'num' && n.v < 0) return [-1, { t: 'num', v: -n.v }];
  if (n.t === 'mono' && n.c < 0) return [-1, mono(-n.c, n.v)];
  if (n.t === 'neg') { const [s, a] = absNode(n.n); return [-s, a]; }
  if (n.t === 'mul' && n.f.length) {
    const [s, a] = absNode(n.f[0]);
    if (s < 0) {
      const isOne = (a.t === 'num' && a.v === 1) || (a.t === 'mono' && a.c === 1 && sortedVars(a.v).length === 0);
      const rest = n.f.slice(1);
      if (isOne && rest.length) return [-1, rest.length === 1 ? rest[0] : { t: 'mul', f: rest }];
      return [-1, { t: 'mul', f: [a, ...rest] }];
    }
  }
  return [1, n];
}

function monoTex(m) {
  const vs = sortedVars(m.v);
  const vt = vs.map((k) => k + (m.v[k] === 1 ? '' : '^{' + m.v[k] + '}')).join('');
  if (!vs.length) return String(m.c);
  if (m.c === 1) return vt;
  if (m.c === -1) return '-' + vt;
  return String(m.c) + vt;
}

// Byrjar prentaði hnúturinn á tölustaf?
function startsWithDigit(n) {
  if (n.t === 'num') return true;
  if (n.t === 'mono') return !sortedVars(n.v).length || Math.abs(n.c) !== 1;
  if (n.t === 'mul') return startsWithDigit(n.f[0]);
  if (n.t === 'pow') return n.b.t === 'num';
  return false;
}

function needsParensInMul(n, first) {
  if (n.t === 'add') return true;
  if (!first && absNode(n)[0] < 0) return true;
  if (n.t === 'mul') return !isSimple(n);
  return false;
}

export function isSimple(n) {
  switch (n.t) {
    case 'mono': return true;
    case 'num': return n.v >= 0;
    case 'var': return true;
    case 'pow': return n.b.t === 'var' && n.e >= 2;
    case 'mul': {
      let i = 0;
      if (n.f[0].t === 'num') { if (n.f[0].v === 1 || n.f[0].v < 0) return false; i = 1; }
      let last = '';
      if (i >= n.f.length) return false;
      for (; i < n.f.length; i++) {
        const f = n.f[i];
        let name;
        if (f.t === 'var') name = f.n;
        else if (f.t === 'pow' && f.b.t === 'var' && f.e >= 2) name = f.b.n;
        else return false;
        if (name <= last) return false;
        last = name;
      }
      return true;
    }
    default: return false;
  }
}

export function toTex(n) {
  switch (n.t) {
    case 'num': return String(n.v);
    case 'var': return n.n;
    case 'mono': return monoTex(n);
    case 'neg': {
      const inner = toTex(n.n);
      return '-' + (n.n.t === 'add' || absNode(n.n)[0] < 0 ? '\\left(' + inner + '\\right)' : inner);
    }
    case 'pow': {
      const b = n.b;
      const plain = b.t === 'var' || (b.t === 'num' && b.v >= 0) ||
        (b.t === 'mono' && b.c === 1 && sortedVars(b.v).length === 1 && b.v[sortedVars(b.v)[0]] === 1) ||
        (b.t === 'mono' && sortedVars(b.v).length === 0 && b.c >= 0);
      const bt = plain ? toTex(b) : '\\left(' + toTex(b) + '\\right)';
      return bt + '^{' + n.e + '}';
    }
    case 'mul': {
      const simple = isSimple(n) && !n.prod;
      const isVarish = (f) => f.t === 'var' || (f.t === 'pow' && f.b.t === 'var');
      let out = '';
      n.f.forEach((f, i) => {
        const par = needsParensInMul(f, i === 0);
        const ft = par ? '\\left(' + toTex(f) + '\\right)' : toTex(f);
        if (i > 0) {
          const prev = n.f[i - 1];
          const prevPar = needsParensInMul(prev, i === 1);
          const prevNum = (prev.t === 'num' && prev.v !== 1) || (prev.t === 'mono' && !sortedVars(prev.v).length && prev.c !== 1);
          let juxt;
          if (simple) juxt = true;
          else if (n.prod) juxt = false;
          else juxt = par || (isVarish(f) && !prevPar && (isVarish(prev) || (i === 1 && prevNum)));
          out += juxt ? '' : '\\cdot ';
        }
        out += ft;
      });
      return out;
    }
    case 'add': {
      let out = '';
      n.ts.forEach(({ s, n: t }, i) => {
        if (t.t === 'add' && t.flat && s > 0) {
          const inner = toTex(t);
          out += i === 0 || inner.startsWith('-') ? inner : '+' + inner;
          return;
        }
        let [s2, a] = t.t === 'add' ? [1, t] : absNode(t);
        const sign = s * s2;
        if (i === 0) out += sign < 0 ? '-' : '';
        else out += sign < 0 ? '-' : '+';
        out += a.t === 'add' ? '\\left(' + toTex(a) + '\\right)' : toTex(a);
      });
      return out;
    }
  }
  return '?';
}

// Einfaldur texti (fyrir prófanir og villuskilaboð)
export function toText(n) {
  return toTex(n)
    .replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
    .replace(/\\cdot /g, '·')
    .replace(/\^\{(\d+)\}/g, '^$1');
}

// ---------- Skref fyrir skref ----------

export const STEP_TEXT = {
  pow: 'Skrifum veldið sem margfeldi, t.d. (a+b)² = (a+b)(a+b).',
  dist: 'Margföldum inn í svigann: hver liður er margfaldaður með hverjum lið.',
  mono: 'Einföldum hvern lið: margföldum saman tölurnar, leggjum saman veldisvísa sömu breytu (x·x = x²) og röðum breytunum í stafrófsröð.',
  paren: 'Leysum upp sviga. Mínus fyrir framan sviga breytir formerki allra liða inni í svigunum.',
  group: 'Röðum líkum liðum saman (liðir með sömu breytur í sömu veldum).',
  combine: 'Tökum saman líka liði: leggjum saman stuðlana en breyturnar haldast óbreyttar.',
};

const mkMul = (fs) => {
  const f = [];
  for (const x of fs) if (x.t === 'mul') f.push(...x.f); else f.push(x);
  return f.length === 1 ? f[0] : { t: 'mul', f };
};

// Liðir summu sem [formerki, hnútur án formerkis]
function signedTerms(n) {
  if (n.t === 'add' && n.ts.length > 1) return n.ts.map(({ s, n: t }) => { const [s2, a] = absNode(t); return [s * s2, a]; });
  if (n.t === 'add') { const [s2, a] = absNode(n.ts[0].n); return [[n.ts[0].s * s2, a]]; }
  return [absNode(n)];
}


function distribute(A, B) {
  const ta = signedTerms(A), tb = signedTerms(B);
  const ts = [];
  for (const [sa, a] of ta) for (const [sb, b] of tb) ts.push({ s: sa * sb, n: { t: 'mul', f: [a, b], prod: true } });
  return ts.length === 1 && ts[0].s === 1 ? ts[0].n : { t: 'add', ts, flat: true };
}

const isBigAdd = (n) => n.t === 'add' && !isMonoish(n);

// Ein umferð. Skilar {n, kinds:Set}. negate: margfalda allt með -1 (frá mínus í summu).
function pass(n, kinds, negate = false) {
  switch (n.t) {
    case 'num': case 'var': case 'mono': return n;
    case 'neg': {
      const c = pass(n.n, kinds);
      if (c !== n.n) return { t: 'neg', n: c };
      if (isMonoish(c)) { kinds.add('mono'); return monoNode(toMono(n)); }
      kinds.add('paren');
      return { t: 'add', ts: [{ s: -1, n: c }] };
    }
    case 'pow': {
      const b = pass(n.b, kinds);
      if (b !== n.b) return { t: 'pow', b, e: n.e };
      if (n.e === 0) { kinds.add('mono'); return { t: 'num', v: 1 }; }
      if (isMonoish(b)) {
        if (isSimple(n)) return n;
        kinds.add('mono');
        return monoNode(toMono(n));
      }
      if (n.e === 1) { kinds.add('pow'); return b; }
      kinds.add('pow');
      return { t: 'mul', f: Array.from({ length: n.e }, () => b) };
    }
    case 'mul': {
      let changed = false;
      const f = n.f.map((x) => { const y = pass(x, kinds); if (y !== x) changed = true; return y; });
      if (changed) return mkMul(f);
      if (n.f.some((x) => x.t === 'mul')) return pass(mkMul(n.f), kinds, negate);
      if (n.f.every(isMonoish)) {
        if (isSimple(n) && !negate && !n.prod) return n;
        kinds.add('mono');
        const m = toMono(n);
        return monoNode(negate ? { c: -m.c, v: m.v } : m);
      }
      const monos = n.f.filter((x) => !isBigAdd(x));
      const adds = n.f.filter(isBigAdd);
      if (monos.length) {
        const M = monos.length === 1 ? monos[0] : { t: 'mul', f: monos };
        const orderOk = n.f.indexOf(adds[0]) >= monos.length; // einliðir fremst
        if (!orderOk || !(isSimple(M) || (M.t === 'mono') || (M.t === 'num'))) {
          kinds.add('mono');
          const m = toMono(M);
          return mkMul([monoNode(negate ? { c: -m.c, v: m.v } : m), ...adds]);
        }
        if (adds.length === 1) {
          kinds.add('dist');
          let m = toMono(M);
          if (negate) m = { c: -m.c, v: m.v };
          const Mn = monoNode(m);
          return distribute(Mn, adds[0]);
        }
        kinds.add('dist');
        return mkMul([negate ? monoNode({ c: -toMono(M).c, v: toMono(M).v }) : M, distribute(adds[0], adds[1]), ...adds.slice(2)]);
      }
      kinds.add('dist');
      const d = distribute(adds[0], adds[1]);
      const rest = adds.slice(2);
      if (negate) return rest.length ? mkMul([{ t: 'num', v: -1 }, d, ...rest]) : { t: 'add', ts: [{ s: -1, n: d }] };
      return rest.length ? mkMul([d, ...rest]) : d;
    }
    case 'add': {
      let changed = false;
      const ts = n.ts.map(({ s, n: t }) => {
        // Mínus fyrir framan einliðu sinnum sviga: tökum mínusinn með inn í margföldunina.
        const fold = s < 0 && t.t === 'mul' && !isBigAdd(t.f[0]) && t.f.filter(isBigAdd).length === 1 && !t.f.some((x) => x.t === 'pow' && isBigAdd(x.b));
        if (fold) {
          const k2 = new Set();
          const y = pass(t, k2, true);
          if (k2.has('dist')) { k2.forEach((k) => kinds.add(k)); changed = true; return { s: 1, n: y }; }
        }
        const y = pass(t, kinds);
        if (y !== t) changed = true;
        return { s, n: y };
      });
      if (changed) return { t: 'add', ts, flat: n.flat };
      // Fletja út summur inni í summu
      if (n.ts.some(({ n: t }) => t.t === 'add')) {
        const out = [];
        let showParen = false;
        for (const { s, n: t } of n.ts) {
          if (t.t === 'add') {
            if (s < 0 || !t.flat) showParen = true;
            for (const u of t.ts) out.push({ s: s * u.s, n: u.n });
          } else out.push({ s, n: t });
        }
        if (showParen) kinds.add('paren');
        return { t: 'add', ts: out, flat: n.flat };
      }
      // Allir liðir eru einfaldir einliðir: tökum saman líka liði.
      const ms = n.ts.map(({ s, n: t }) => { const m = toMono(t); return { c: s * m.c, v: m.v, k: monoKey(m.v) }; });
      const keys = ms.map((m) => m.k);
      const hasLike = new Set(keys).size !== keys.length || ms.some((m) => m.c === 0);
      if (!hasLike) return n;
      const order = [...new Set(keys)].sort((a, b) => compareMono(ms.find((m) => m.k === a), ms.find((m) => m.k === b)));
      const grouped = order.flatMap((k) => ms.filter((m) => m.k === k));
      const adjacent = grouped.every((m, i) => m === ms[i]);
      if (!adjacent) {
        kinds.add('group');
        const idx = grouped.map((m) => ms.indexOf(m));
        return { t: 'add', ts: idx.map((i) => n.ts[i]), flat: n.flat };
      }
      kinds.add('combine');
      const res = [];
      for (const k of order) {
        const c = ms.filter((m) => m.k === k).reduce((a, m) => a + m.c, 0);
        if (c !== 0) res.push(mono(c, ms.find((m) => m.k === k).v));
      }
      if (!res.length) return mono(0);
      if (res.length === 1) return res[0];
      return { t: 'add', ts: res.map((m) => ({ s: 1, n: m })), flat: n.flat };
    }
  }
  return n;
}

// Skilar lista af skrefum: [{tex, kinds:[...], node}]
export function solveSteps(start, maxSteps = 60) {
  const steps = [];
  let cur = start;
  let curTex = toTex(cur);
  for (let i = 0; i < maxSteps; i++) {
    const kinds = new Set();
    const next = pass(cur, kinds);
    if (next === cur) break;
    const tex = toTex(next);
    cur = next;
    if (tex === curTex) continue;
    curTex = tex;
    steps.push({ tex, kinds: [...kinds], node: next });
  }
  return steps;
}

export function nextStep(node) {
  const s = solveSteps(node, 60);
  return s.length ? s[0] : null;
}

// Er stæðan fullstytt? (engir svigar, engin margföldun eftir, engir líkir liðir)
export function isFinalForm(n) {
  const terms = n.t === 'add' ? n.ts.map((x) => x.n) : [n];
  const keys = [];
  for (const t of terms) {
    const [, a] = absNode(t);
    if (a.t === 'add') return false;
    if (!isMonoish(a)) return false;
    if (a.t === 'mul') {
      const nums = a.f.filter((f) => f.t === 'num' || (f.t === 'mono' && !sortedVars(f.v).length));
      if (nums.length > 1 || (nums.length === 1 && a.f[0] !== nums[0])) return false;
      if (a.f.some((f) => f.t !== 'num' && f.t !== 'var' && !(f.t === 'pow' && f.b.t === 'var') && f.t !== 'mono')) return false;
      const names = a.f.flatMap((f) => f.t === 'var' ? [f.n] : f.t === 'pow' ? [f.b.n] : f.t === 'mono' ? sortedVars(f.v) : []);
      if (new Set(names).size !== names.length) return false;
    } else if (a.t === 'pow') {
      if (a.b.t !== 'var' || a.e < 2) return false;
    } else if (a.t === 'neg') return false;
    const m = toMono(t);
    if (m.c === 0 && terms.length > 1) return false;
    keys.push(monoKey(m.v));
  }
  return new Set(keys).size === keys.length;
}

// Greinir hvað er að ef svar er ekki jafngilt.
export function diagnose(expected, given) {
  const E = expand(expected), G = expand(given);
  if (polyEqual(E, G)) return null;
  const keysE = [...E.keys()].sort().join('|');
  const keysG = [...G.keys()].sort().join('|');
  if (keysE === keysG) {
    const onlySign = [...E].every(([k, x]) => Math.abs(G.get(k).c) === Math.abs(x.c));
    if (onlySign) return 'Athugaðu formerkin (+ og −), sérstaklega þegar mínus stendur fyrir framan sviga.';
    return 'Breyturnar eru réttar en athugaðu stuðlana (tölurnar fyrir framan breyturnar).';
  }
  const degE = Math.max(0, ...[...E.values()].map((x) => degree(x.v)));
  const degG = Math.max(0, ...[...G.values()].map((x) => degree(x.v)));
  if (degE !== degG) return 'Athugaðu veldin: þegar sama breyta er margfölduð leggjum við veldisvísana saman (x·x = x²).';
  return 'Þetta er ekki jafngilt dæminu. Farðu yfir síðasta skref.';
}

export function texOf(src) {
  return toTex(parse(src));
}
