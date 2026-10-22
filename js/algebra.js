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
      if (isOne && rest.length) return [-1, rest.length === 1 ? rest[0] : { ...n, f: rest }];
      return [-1, { ...n, f: [a, ...rest] }];
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
        let ft = par ? '\\left(' + toTex(f) + '\\right)' : toTex(f);
        if (n.hl && i === 0) ft = '\\textcolor{' + HL_COLOR + '}{' + ft + '}';
        if (i > 0) {
          const prev = n.f[i - 1];
          const prevPar = needsParensInMul(prev, i === 1);
          const prevNum = (prev.t === 'num' && prev.v !== 1) || (prev.t === 'mono' && !sortedVars(prev.v).length && prev.c !== 1);
          let juxt;
          if (simple && !n.atoms) juxt = true;
          else if (n.prod || n.atoms) juxt = false;
          else juxt = par || (isVarish(f) && !prevPar && (isVarish(prev) || (i === 1 && prevNum)));
          out += juxt ? '' : '\\cdot ';
        }
        out += ft;
      });
      return out;
    }
    case 'add': {
      let out = '';
      const colorOf = n.hl ? likeTermColors(n) : null;
      n.ts.forEach(({ s, n: t }, i) => {
        if (colorOf && colorOf[i]) {
          const [s2, a] = absNode(t);
          const sign = s * s2;
          const body = (sign < 0 ? '-' : '') + toTex(a);
          out += (i === 0 || sign < 0 ? '' : '+') + '\\textcolor{' + colorOf[i] + '}{' + body + '}';
          return;
        }
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

// Litur á þann sem er margfaldaður inn í sviga
export const HL_COLOR = '#ff9f43';

// Litir fyrir líka liði (virka bæði í ljósu og dökku þema)
export const LIKE_COLORS = ['#4dabf7', '#ffd43b', '#69db7c', '#ff8cc6', '#b197fc', '#3bc9db', '#ffa94d'];

// Litur hvers liðar í summu; liðir sem standa einir fá engan lit.
function likeTermColors(n) {
  const ms = n.ts.map(({ n: t }) => (isMonoish(t) ? toMono(t) : null));
  if (ms.some((m) => !m)) return null;
  const keys = ms.map((m) => monoKey(m.v));
  const count = {};
  keys.forEach((k) => { count[k] = (count[k] || 0) + 1; });
  const repeated = [...new Set(keys)].filter((k) => count[k] > 1)
    .sort((a, b) => compareMono(ms[keys.indexOf(a)], ms[keys.indexOf(b)]));
  return keys.map((k) => (count[k] > 1 ? LIKE_COLORS[repeated.indexOf(k) % LIKE_COLORS.length] : null));
}

// Einfaldur texti (fyrir prófanir og villuskilaboð)
export function toText(n) {
  let tex = toTex(n);
  for (let prev = ''; prev !== tex;) { prev = tex; tex = tex.replace(/\\textcolor\{[^}]*\}\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1'); }
  return tex
    .replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
    .replace(/\\cdot /g, '·')
    .replace(/\^\{(\d+)\}/g, '^$1');
}

// ---------- Skref fyrir skref ----------

export const STEP_TEXT = {
  pow: 'Skrifum veldið sem margfeldi, t.d. (a+b)² = (a+b)(a+b).',
  dist: 'Margföldum inn í svigann: liðurinn fyrir framan (litaður) margfaldast við hvern lið í svigunum. Gætum að formerkjunum.',
  dist1: 'Sviga sinnum sviga: tökum fyrsta liðinn í fyrri svigunum (litaður) og margföldum hann við hvern lið í seinni svigunum. Afganginn geymum við í næsta skref.',
  mono: 'Skrifum margfeldið sem einn lið, t.d. 3·x = 3x.',
  mpow: 'Veldi þýðir endurtekin margföldun: (2x)² = 2x·2x.',
  msign: 'Byrjum á formerkinu. Teljum mínusana: slétt tala af mínusum gefur plús, oddatala gefur mínus.',
  morder: 'Röðum þáttunum: tölurnar fremst og sömu breytur saman í stafrófsröð. Röð þátta skiptir ekki máli í margföldun.',
  mnum: 'Margföldum tölurnar saman.',
  mvar: 'Margföldum sömu breytur saman með því að leggja saman veldisvísana (x·x = x², a²·a = a³).',
  paren: 'Leysum upp sviga. Mínus fyrir framan sviga snýr við formerki allra liða í svigunum (+ verður − og − verður +). Plús fyrir framan sviga breytir engu.',
  color: 'Finnum líka liði og litum þá eins: líkir liðir hafa sömu breytur í sömu veldum.',
  group: 'Röðum líkum liðum saman (liðir með sömu breytur í sömu veldum).',
  combine: 'Tökum saman líka liði: leggjum saman stuðlana en breyturnar haldast óbreyttar.',
};

const STEP_RANK = { pow: 0, mpow: 0, dist1: 1, dist: 1, paren: 2, msign: 3, morder: 4, mnum: 5, mvar: 6, mono: 7, color: 8, group: 9, combine: 10 };

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


const signedText = (s, a) => (s < 0 ? '−' : '') + toText(a);

// Margföldun inn í sviga. Ef A er sjálf summa er bara fyrsti liður hennar margfaldaður inn
// í B í þessu skrefi; afgangurinn bíður næsta skrefs.
function distribute(A, B, kinds) {
  const ta = signedTerms(A), tb = signedTerms(B);
  const [sa, a] = ta[0];
  const ts = tb.map(([sb, b]) => ({ s: sa * sb, n: { t: 'mul', f: [a, b], prod: true, hl: true } }));
  const bText = '(' + toText(B) + ')';
  if (ta.length === 1) {
    kinds.add('dist');
    note(kinds, `${signedText(sa, a)} sinnum hvern lið í ${bText}`);
  } else {
    kinds.add('dist1');
    note(kinds, `Fyrst: ${signedText(sa, a)} sinnum hvern lið í ${bText}`);
    const rest = ta.slice(1);
    if (rest.length === 1) {
      const [sr, r] = rest[0];
      ts.push({ s: sr, n: { t: 'mul', f: [r, B] } });
    } else {
      ts.push({ s: 1, n: { t: 'mul', f: [{ t: 'add', ts: rest.map(([x, y]) => ({ s: x, n: y })) }, B] } });
    }
  }
  return ts.length === 1 && ts[0].s === 1 ? ts[0].n : { t: 'add', ts, flat: true };
}

const isBigAdd = (n) => n.t === 'add' && !isMonoish(n);

// ---------- Margföldun einliða í litlum skrefum ----------

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (e) => (e === 1 ? '' : String(e).split('').map((d) => SUP[d]).join(''));
const varText = (n, e) => n + sup(e);
export function monoText(c, v) {
  const vs = sortedVars(v);
  const vt = vs.map((k) => varText(k, v[k])).join('');
  if (!vs.length) return String(c).replace('-', '−');
  return (c === -1 ? '−' : c === 1 ? '' : String(c).replace('-', '−')) + vt;
}

const note = (kinds, text) => {
  text = text.replace(/\^\((\d+)\)|\^(\d+)/g, (_, a, b) => sup(+(a || b))).replace(/-/g, '−');
  if (!kinds.notes) kinds.notes = [];
  if (!kinds.notes.includes(text)) kinds.notes.push(text);
};

// Brýtur einliðu niður í þætti: {minus, atoms:[{k:'num',v}|{k:'var',n,e}], firstNeg}
function atomize(n) {
  let minus = 0;
  const atoms = [];
  const rec = (n, power) => {
    switch (n.t) {
      case 'num':
        if (n.v < 0) minus += power;
        if (n.v === -1) return; // -1 er bara formerki
        for (let i = 0; i < power; i++) atoms.push({ k: 'num', v: Math.abs(n.v) });
        return;
      case 'var': atoms.push({ k: 'var', n: n.n, e: power }); return;
      case 'mono': {
        if (n.c < 0) minus += power;
        if (Math.abs(n.c) !== 1 || !sortedVars(n.v).length) for (let i = 0; i < power; i++) atoms.push({ k: 'num', v: Math.abs(n.c) });
        for (const k of sortedVars(n.v)) atoms.push({ k: 'var', n: k, e: n.v[k] * power });
        return;
      }
      case 'neg': minus += power; rec(n.n, power); return;
      case 'add': if (n.ts[0].s < 0) minus += power; rec(n.ts[0].n, power); return;
      case 'pow': rec(n.b, power * n.e); return;
      case 'mul': for (const f of n.f) rec(f, power); return;
    }
  };
  rec(n, 1);
  return { minus, atoms };
}

function atomsNode(neg, atoms) {
  const nums = atoms.filter((a) => a.k === 'num');
  const vars = atoms.filter((a) => a.k === 'var');
  const final = nums.length <= 1 && (nums.length === 0 || atoms[0] === nums[0]) &&
    new Set(vars.map((a) => a.n)).size === vars.length &&
    vars.every((a, i) => i === 0 || a.n > vars[i - 1].n) &&
    !(nums.length === 1 && nums[0].v === 1 && vars.length);
  if (final) {
    const c = (nums.length ? nums[0].v : 1) * (neg ? -1 : 1);
    if (c === 0) return mono(0);
    return mono(c, Object.fromEntries(vars.map((a) => [a.n, a.e])));
  }
  const f = atoms.map((a) => (a.k === 'num' ? { t: 'num', v: a.v } : a.e === 1 ? { t: 'var', n: a.n } : { t: 'pow', b: { t: 'var', n: a.n }, e: a.e }));
  if (neg) {
    if (f[0].t === 'num') f[0] = { t: 'num', v: -f[0].v };
    else f.unshift({ t: 'num', v: -1 });
  }
  return { t: 'mul', f, atoms: true };
}

// Finnur veldi af margfeldi, t.d. (2x)², og skrifar það sem margfeldi
function expandProductPowers(n) {
  let found = null;
  const rec = (n) => {
    if (n.t === 'pow' && n.b.t !== 'var' && !(n.b.t === 'num') && n.e >= 2 && n.e <= 4) {
      found = n;
      return { t: 'mul', f: Array.from({ length: n.e }, () => n.b), prod: true };
    }
    if (n.t === 'mul') { const f = n.f.map(rec); return found ? { ...n, f } : n; }
    if (n.t === 'neg') { const c = rec(n.n); return found ? { t: 'neg', n: c } : n; }
    if (n.t === 'add' && n.ts.length === 1) { const c = rec(n.ts[0].n); return found ? { ...n, ts: [{ s: n.ts[0].s, n: c }] } : n; }
    return n;
  };
  const out = rec(n);
  return found ? { node: out, pow: found } : null;
}

// Eitt lítið skref í margföldun einliðu. extraNeg = mínus sem stendur fyrir framan liðinn.
// Skilar nýjum hnút, eða null ef ekkert er eftir að gera.
function monoStep(n, extraNeg, kinds) {
  const ex = expandProductPowers(n);
  if (ex) {
    kinds.add('mpow');
    note(kinds, `${toText(ex.pow)} = ${toText({ t: 'mul', f: Array.from({ length: ex.pow.e }, () => ex.pow.b), prod: true })}`);
    return extraNeg ? { t: 'add', ts: [{ s: -1, n: ex.node }] } : ex.node;
  }
  const { minus: m0, atoms } = atomize(n);
  const minus = m0 + extraNeg;
  const neg = minus % 2 === 1;
  const leading = extraNeg ? true : absNode(n)[0] < 0;
  const hasNumMinus = minus > 0 && !(minus === 1 && leading);
  if (hasNumMinus) {
    kinds.add('msign');
    note(kinds, minus === 1 ? 'Einn mínus → útkoman verður neikvæð.'
      : `${minus} mínusar → ${neg ? 'oddatala, útkoman verður neikvæð' : 'mínus sinnum mínus verður plús'}.`);
    return atomsNode(neg, atoms);
  }
  const nums = atoms.filter((a) => a.k === 'num');
  const vars = atoms.filter((a) => a.k === 'var');
  const ordered = [...nums, ...[...vars].sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0))];
  if (ordered.some((a, i) => a !== atoms[i])) {
    kinds.add('morder');
    return atomsNode(neg, ordered);
  }
  if (nums.length >= 2) {
    const prod = nums.reduce((a, b) => a * b.v, 1);
    kinds.add('mnum');
    note(kinds, `${nums.map((a) => a.v).join('·')} = ${prod}`);
    return atomsNode(neg, [{ k: 'num', v: prod }, ...vars]);
  }
  if (nums.length === 1 && nums[0].v === 1 && vars.length) {
    kinds.add('mnum');
    note(kinds, `1·${varText(vars[0].n, vars[0].e)} = ${varText(vars[0].n, vars[0].e)}`);
    return atomsNode(neg, vars);
  }
  if (new Set(vars.map((a) => a.n)).size !== vars.length) {
    kinds.add('mvar');
    const merged = [];
    for (const a of vars) {
      const last = merged[merged.length - 1];
      if (last && last.n === a.n) { last.parts.push(a.e); last.e += a.e; } else merged.push({ k: 'var', n: a.n, e: a.e, parts: [a.e] });
    }
    for (const a of merged) {
      if (a.parts.length < 2) continue;
      const lhs = a.parts.map((e) => varText(a.n, e)).join('·');
      const sum = a.parts.map((e) => sup(e) || '¹').join('⁺');
      note(kinds, a.parts.every((e) => e === 1) ? `${lhs} = ${varText(a.n, a.e)}` : `${lhs} = ${a.n}${sum} = ${varText(a.n, a.e)}`);
    }
    return atomsNode(neg, [...nums, ...merged.map(({ n: nm, e }) => ({ k: 'var', n: nm, e }))]);
  }
  const out = atomsNode(neg, atoms);
  if (toTex(out) === toTex(extraNeg ? { t: 'add', ts: [{ s: -1, n }] } : n)) return out.t === 'mono' && n.t !== 'mono' ? out : null;
  kinds.add('mono');
  return out;
}

// Ein umferð. Skilar {n, kinds:Set}. negate: margfalda allt með -1 (frá mínus í summu).
function pass(n, kinds, negate = false) {
  switch (n.t) {
    case 'num': case 'var': case 'mono': return n;
    case 'neg': {
      const c = pass(n.n, kinds);
      if (c !== n.n) return { t: 'neg', n: c };
      if (isMonoish(c)) return monoStep(n, 0, kinds) || monoNode(toMono(n));
      kinds.add('paren');
      return { t: 'add', ts: [{ s: -1, n: c }] };
    }
    case 'pow': {
      const b = pass(n.b, kinds);
      if (b !== n.b) return { t: 'pow', b, e: n.e };
      if (n.e === 0) { kinds.add('mono'); return { t: 'num', v: 1 }; }
      if (isMonoish(b)) {
        if (isSimple(n)) return n;
        return monoStep(n, 0, kinds) || monoNode(toMono(n));
      }
      if (n.e === 1) { kinds.add('pow'); return b; }
      kinds.add('pow');
      const out = { t: 'mul', f: Array.from({ length: n.e }, () => b) };
      note(kinds, `${toText(n)} = ${toText(out)}`);
      return out;
    }
    case 'mul': {
      let changed = false;
      const f = n.f.map((x) => { const y = pass(x, kinds); if (y !== x) changed = true; return y; });
      if (changed) return mkMul(f);
      if (n.f.some((x) => x.t === 'mul')) return pass(mkMul(n.f), kinds, negate);
      if (n.f.every(isMonoish)) {
        if (isSimple(n) && !negate && !n.prod) return n;
        if (!negate) return monoStep(n, 0, kinds) || monoNode(toMono(n));
        kinds.add('mono');
        const m = toMono(n);
        return monoNode({ c: -m.c, v: m.v });
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
          let m = toMono(M);
          if (negate) m = { c: -m.c, v: m.v };
          return distribute(monoNode(m), adds[0], kinds);
        }
        return mkMul([negate ? monoNode({ c: -toMono(M).c, v: toMono(M).v }) : M, distribute(adds[0], adds[1], kinds), ...adds.slice(2)]);
      }
      const d = distribute(adds[0], adds[1], kinds);
      const rest = adds.slice(2);
      if (negate) return rest.length ? mkMul([{ t: 'num', v: -1 }, d, ...rest]) : { t: 'add', ts: [{ s: -1, n: d }] };
      return rest.length ? mkMul([d, ...rest]) : d;
    }
    case 'add': {
      const step = ({ s, n: t }) => {
        const k = new Set();
        // Mínus fyrir framan margfeldi einliða telst með formerkjunum
        if (s < 0 && t.t !== 'add' && t.t !== 'mono' && isMonoish(t) && !isSimple(t)) {
          const y = monoStep(t, 1, k);
          if (y) return { term: { s: 1, n: y }, k };
        }
        // Mínus fyrir framan einliðu sinnum sviga: tökum mínusinn með inn í margföldunina.
        const fold = s < 0 && t.t === 'mul' && !isBigAdd(t.f[0]) && t.f.filter(isBigAdd).length === 1 && !t.f.some((x) => x.t === 'pow' && isBigAdd(x.b));
        if (fold) {
          const k2 = new Set();
          const y = pass(t, k2, true);
          if (k2.has('dist')) return { term: { s: 1, n: y }, k: k2 };
        }
        const y = pass(t, k);
        return { term: y === t ? null : { s, n: y }, k };
      };
      const results = n.ts.map(step);
      // Eitt atriði í einu: fyrst er margfaldað inn í sviga, svo formerki, röðun, tölur og breytur.
      // Liðir sem eru komnir styttra bíða þar til hinir hafa náð sama stigi.
      // Það eitt að skrifa 3·x sem 3x fylgir hvaða skrefi sem er (rank -1).
      const rank = (k) => ([...k].every((x) => x === 'mono') ? -1 : Math.min(...[...k].filter((x) => x !== 'mono').map((x) => STEP_RANK[x] ?? 50)));
      const ranks = results.filter((r) => r.term).map((r) => rank(r.k)).filter((x) => x >= 0);
      const minRank = ranks.length ? Math.min(...ranks) : -1;
      let changed = false;
      const ts = n.ts.map((orig, i) => {
        const r = results[i];
        if (!r.term || (rank(r.k) !== minRank && rank(r.k) !== -1)) return orig;
        changed = true;
        r.k.forEach((x) => kinds.add(x));
        (r.k.notes || []).forEach((x) => note(kinds, x));
        return r.term;
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
            if (s < 0) {
              const flipped = { t: 'add', ts: t.ts.map((u) => ({ s: -u.s, n: u.n })) };
              note(kinds, `−(${toText(t)}) = ${toText(flipped)}`);
            } else if (!t.flat) note(kinds, `+(${toText(t)}) = ${toText(t)}`);
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
      if (!n.hl) {
        kinds.add('color');
        return { ...n, hl: true };
      }
      const order = [...new Set(keys)].sort((a, b) => compareMono(ms.find((m) => m.k === a), ms.find((m) => m.k === b)));
      const grouped = order.flatMap((k) => ms.filter((m) => m.k === k));
      const adjacent = grouped.every((m, i) => m === ms[i]);
      if (!adjacent) {
        kinds.add('group');
        const idx = grouped.map((m) => ms.indexOf(m));
        return { t: 'add', ts: idx.map((i) => n.ts[i]), flat: n.flat, hl: true };
      }
      kinds.add('combine');
      const res = [];
      for (const k of order) {
        const grp = ms.filter((m) => m.k === k);
        const c = grp.reduce((a, m) => a + m.c, 0);
        if (grp.length > 1) {
          const lhs = grp.map((m, i) => (i === 0 ? monoText(m.c, m.v) : (m.c < 0 ? ' − ' : ' + ') + monoText(Math.abs(m.c), m.v))).join('');
          note(kinds, `${lhs} = ${c === 0 ? '0' : monoText(c, grp[0].v)}`);
        }
        if (c !== 0) res.push(mono(c, ms.find((m) => m.k === k).v));
      }
      if (!res.length) return mono(0);
      if (res.length === 1) return res[0];
      return { t: 'add', ts: res.map((m) => ({ s: 1, n: m })), flat: n.flat };
    }
  }
  return n;
}

function stripProdHighlight(n) {
  switch (n.t) {
    case 'mul': {
      const f = n.f.map(stripProdHighlight);
      const { hl, ...rest } = n;
      return hl || f.some((x, i) => x !== n.f[i]) ? { ...rest, f } : n;
    }
    case 'add': {
      const ts = n.ts.map((x) => ({ s: x.s, n: stripProdHighlight(x.n) }));
      return ts.some((x, i) => x.n !== n.ts[i].n) ? { ...n, ts } : n;
    }
    case 'pow': { const b = stripProdHighlight(n.b); return b !== n.b ? { ...n, b } : n; }
    case 'neg': { const c = stripProdHighlight(n.n); return c !== n.n ? { ...n, n: c } : n; }
    default: return n;
  }
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
    // Liturinn á þeim sem var margfaldaður inn á bara við í skrefinu þar sem það gerðist
    cur = stripProdHighlight(next);
    const plainTex = toTex(cur);
    if (plainTex === curTex) continue;
    curTex = plainTex;
    steps.push({ tex, kinds: [...kinds], notes: kinds.notes || [], node: next });
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
