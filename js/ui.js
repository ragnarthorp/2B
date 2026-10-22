// Birting stærðfræði og stærðfræðiritill.

const hasMathLive = () => typeof window.MathLive !== 'undefined' && !!customElements.get('math-field');

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// LaTeX -> HTML
export function texHtml(tex) {
  if (hasMathLive()) {
    try { return window.MathLive.convertLatexToMarkup(tex); } catch { /* sýnum texta í staðinn */ }
  }
  const plain = tex.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')').replace(/\\cdot /g, '·').replace(/\^\{([^}]*)\}/g, '^$1').replace(/\\\\/g, '\\');
  return '<span class="plainmath">' + escapeHtml(plain) + '</span>';
}

export function math(tex, cls = '') {
  return el('span', { class: 'math ' + cls, html: texHtml(tex) });
}

// Texti með $$...$$ fyrir stærðfræði
export function richHtml(html) {
  return html.replace(/\$\$(.+?)\$\$/g, (_, t) => '<span class="math">' + texHtml(t) + '</span>');
}

// ---------- Ritill ----------

const KEYS = [
  { label: '( )', title: 'Svigar', tex: '\\left(#0\\right)', text: '()' },
  { label: 'x²', title: 'Í öðru veldi', tex: '^2', text: '^2' },
  { label: 'x³', title: 'Í þriðja veldi', tex: '^3', text: '^3' },
  { label: 'xⁿ', title: 'Veldi', tex: '^{#?}', text: '^' },
  { label: '·', title: 'Margföldun', tex: '\\cdot ', text: '·' },
  { label: '→', title: 'Út úr veldi / sviga', cmd: 'moveToNextChar' },
  { label: 'x', tex: 'x', text: 'x' },
  { label: 'y', tex: 'y', text: 'y' },
  { label: 'a', tex: 'a', text: 'a' },
  { label: 'b', tex: 'b', text: 'b' },
  { label: '⌫', title: 'Eyða', cmd: 'deleteBackward' },
  { label: 'Hreinsa', title: 'Hreinsa allt', clear: true, wide: true },
];

// Skilar {root, getValue, setValue, focus}
export function createEditor({ placeholder = '', onEnter, initial = '', compact = false } = {}) {
  const wrap = el('div', { class: 'editor' + (compact ? ' compact' : '') });
  let field, api;

  if (hasMathLive()) {
    field = new window.MathfieldElement();
    field.className = 'mathfield';
    field.smartFence = true;
    field.smartSuperscript = true;
    field.smartMode = false;
    field.mathVirtualKeyboardPolicy = 'auto';
    field.setAttribute('aria-label', placeholder || 'Stærðfræðiritill');
    field.addEventListener('mount', () => {
      try { field.inlineShortcuts = {}; field.menuItems = []; } catch { /* eldri útgáfur */ }
    });
    if (initial) field.value = initial;
    // MathLive giskar á lyklaborð út frá staðsetningu takkans (e.code). Á íslensku lyklaborði
    // er + á sama stað og \ á bandarísku, svo + gat opnað LaTeX-ham. Við setjum því sjálf inn
    // stafinn sem lyklaborðið gefur (e.key). Bakskástrik er alltaf hunsað.
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnter && onEnter(); return; }
      if (e.isComposing || e.key.length !== 1 || e.metaKey || (e.ctrlKey && !e.altKey)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === '\\') return;
      field.executeCommand(['typedText', e.key]);
    }, true);
    api = {
      getValue: () => field.value,
      setValue: (v) => { field.value = v; },
      focus: () => field.focus(),
      insert: (k) => {
        if (k.clear) field.value = '';
        else if (k.cmd) field.executeCommand(k.cmd);
        else field.insert(k.tex, { selectionMode: 'placeholder', format: 'latex' });
        field.focus();
      },
    };
  } else {
    field = el('input', { type: 'text', class: 'textfield', placeholder: placeholder || 't.d. 2x(x+3)', autocomplete: 'off', spellcheck: 'false' });
    field.value = initial;
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter && onEnter(); } });
    api = {
      getValue: () => field.value,
      setValue: (v) => { field.value = v; },
      focus: () => field.focus(),
      insert: (k) => {
        if (k.clear) { field.value = ''; field.focus(); return; }
        const s = field.selectionStart ?? field.value.length, e = field.selectionEnd ?? s;
        let ins = k.text ?? '';
        if (k.cmd === 'deleteBackward') {
          if (s === e && s > 0) { field.value = field.value.slice(0, s - 1) + field.value.slice(e); field.setSelectionRange(s - 1, s - 1); }
          else { field.value = field.value.slice(0, s) + field.value.slice(e); field.setSelectionRange(s, s); }
          field.focus();
          return;
        }
        if (k.cmd) { field.setSelectionRange(e + 1, e + 1); field.focus(); return; }
        if (ins === '()') ins = '(' + field.value.slice(s, e) + ')';
        field.value = field.value.slice(0, s) + ins + field.value.slice(e);
        const pos = k.text === '()' && s === e ? s + 1 : s + ins.length;
        field.setSelectionRange(pos, pos);
        field.focus();
      },
    };
  }

  const bar = el('div', { class: 'keys', role: 'toolbar', 'aria-label': 'Tákn' },
    KEYS.map((k) => el('button', {
      type: 'button', class: 'key' + (k.wide ? ' wide' : ''), title: k.title || k.label,
      onmousedown: (e) => e.preventDefault(),
      onclick: () => api.insert(k),
    }, k.label)));

  // Lítill vasareiknir fyrir einfaldar tölur
  const calc = miniCalc((text) => api.insert({ tex: text, text }));
  calc.hidden = true;
  const calcBtn = el('button', {
    type: 'button', class: 'key calc-toggle', title: 'Vasareiknir', 'aria-expanded': 'false',
    onclick: () => {
      calc.hidden = !calc.hidden;
      calcBtn.setAttribute('aria-expanded', String(!calc.hidden));
      calcBtn.classList.toggle('on', !calc.hidden);
      wrap.classList.toggle('with-calc', !calc.hidden);
    },
  }, '🧮');
  bar.insertBefore(calcBtn, bar.querySelector('.wide'));

  wrap.append(el('div', { class: 'editor-main' }, field, bar), calc);
  api.root = wrap;
  return api;
}

// ---------- Vasareiknir ----------

// Reiknar +, −, ×, ÷ og sviga án eval. Skilar tölu eða kastar villu.
function evalArithmetic(src) {
  const s = src.replace(/,/g, '.').replace(/[×·*]/g, '*').replace(/[÷:/]/g, '/').replace(/[−–]/g, '-').replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  function term() {
    let v = factor();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++]; const r = factor();
      if (op === '/' && r === 0) throw new Error('Ekki hægt að deila með núlli');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function factor() {
    if (peek() === '-') { i++; return -factor(); }
    if (peek() === '+') { i++; return factor(); }
    if (peek() === '(') { i++; const v = expr(); if (s[i++] !== ')') throw new Error('Vantar sviga'); return v; }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error('Villa');
    i += m[0].length;
    return parseFloat(m[0]);
  }
  const v = expr();
  if (i < s.length) throw new Error('Villa');
  return v;
}

const fmtNum = (v) => String(Math.round(v * 1e10) / 1e10).replace('.', ',').replace('-', '−');

function miniCalc(onInsert) {
  let expr = '';
  let result = null;
  const shown = el('div', { class: 'mc-expr', 'aria-live': 'polite' });
  const res = el('div', { class: 'mc-result' });
  const update = () => {
    shown.textContent = expr || '0';
    res.textContent = result === null ? '' : '= ' + result;
  };
  const press = (k) => {
    if (k === 'C') { expr = ''; result = null; }
    else if (k === '⌫') { expr = expr.slice(0, -1); }
    else if (k === '=') {
      try { result = fmtNum(evalArithmetic(expr)); } catch (e) { result = e.message; }
    } else {
      if (result !== null && /[0-9(]/.test(k) && !/[+−×÷(]$/.test(expr)) expr = '';
      result = null;
      expr += k;
    }
    update();
  };
  const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', ',', '⌫', '='];
  const pad = el('div', { class: 'mc-keys' }, keys.map((k) => el('button', {
    type: 'button', class: 'mc-key' + (/[÷×−+=]/.test(k) ? ' op' : '') + (k === '=' ? ' eq' : ''),
    onmousedown: (e) => e.preventDefault(),
    onclick: () => press(k),
  }, k)));
  const insert = el('button', {
    type: 'button', class: 'btn ghost mc-insert',
    onmousedown: (e) => e.preventDefault(),
    onclick: () => {
      if (result === null) press('=');
      if (result !== null && /^[−\d]/.test(result)) onInsert(result.replace('−', '-').replace(',', '.'));
    },
  }, 'Setja útkomu í ritilinn');
  const box = el('div', { class: 'mini-calc', role: 'group', 'aria-label': 'Vasareiknir', tabindex: '0',
    onkeydown: (e) => {
      const map = { '*': '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: 'C', '.': ',' };
      const k = map[e.key] || e.key;
      if (keys.includes(k)) { e.preventDefault(); press(k); }
    } },
    el('div', { class: 'mc-display' }, shown, res), pad, insert);
  update();
  return box;
}

// ---------- Myndir (flatar vektormyndir) ----------

// Fjögurra arma stjarna
const sparkle = (x, y, r, fill) =>
  `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}"/>`;

// Hnöttur með skugga og ljósbletti
function planet(id, cx, cy, r, base, shade, light) {
  return `
    <clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${base}"/>
    <g clip-path="url(#${id})">
      <circle cx="${cx + r * 0.45}" cy="${cy + r * 0.4}" r="${r}" fill="${shade}"/>
      <ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.15}" rx="${r * 0.28}" ry="${r * 0.14}" fill="${light}" opacity=".55"/>
      <ellipse cx="${cx + r * 0.1}" cy="${cy + r * 0.45}" rx="${r * 0.2}" ry="${r * 0.09}" fill="${shade}" opacity=".7"/>
    </g>`;
}

export function heroArt() {
  const svg = `
  <svg viewBox="0 0 420 330" role="img" aria-label="Myndskreyting: hnettir og stærðfræðitákn úti í geimnum">
    <ellipse cx="210" cy="175" rx="190" ry="70" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2" stroke-dasharray="4 10" transform="rotate(-12 210 175)"/>
    ${planet('hp1', 215, 170, 92, '#ff8a3d', '#e2562a', '#ffd08a')}
    <path d="M95 205 Q215 120 345 128" fill="none" stroke="#ffd43b" stroke-width="10" stroke-linecap="round" opacity=".95"/>
    <path d="M100 214 Q215 236 336 140" fill="none" stroke="#ffd43b" stroke-width="10" stroke-linecap="round" opacity=".35"/>
    ${planet('hp2', 355, 70, 28, '#2ee6c5', '#18b39c', '#b8fff2')}
    ${planet('hp3', 70, 75, 18, '#ff5c8a', '#d93a6a', '#ffc2d4')}
    ${planet('hp4', 360, 270, 14, '#9775fa', '#6f4fd8', '#d9ccff')}
    <g font-family="Nunito, sans-serif" font-weight="900">
      <g transform="rotate(-8 58 250)"><rect x="22" y="226" width="78" height="46" rx="16" fill="#262d7a"/><text x="61" y="259" font-size="28" fill="#ffd43b" text-anchor="middle">x²</text></g>
      <g transform="rotate(10 150 40)"><rect x="124" y="16" width="56" height="46" rx="16" fill="#262d7a"/><text x="152" y="50" font-size="30" fill="#2ee6c5" text-anchor="middle">+</text></g>
      <g transform="rotate(-6 265 300)"><rect x="200" y="278" width="128" height="44" rx="16" fill="#262d7a"/><text x="264" y="309" font-size="24" fill="#ff8cc6" text-anchor="middle">(a+b)²</text></g>
      <g transform="rotate(8 395 175)"><rect x="372" y="152" width="44" height="44" rx="14" fill="#262d7a"/><text x="394" y="184" font-size="28" fill="#4dabf7" text-anchor="middle">·</text></g>
    </g>
    ${sparkle(30, 150, 9, '#ffd43b')}${sparkle(285, 22, 7, '#ffffff')}${sparkle(405, 120, 6, '#2ee6c5')}${sparkle(120, 310, 6, '#ffffff')}${sparkle(180, 90, 4, '#ffffff')}
  </svg>`;
  return el('div', { class: 'hero-art', html: svg });
}

const ICONS = {
  plus: { base: '#2ee6c5', shade: '#18b39c', light: '#b8fff2', sym: '+', ring: '#ffd43b' },
  times: { base: '#ff5c8a', shade: '#d93a6a', light: '#ffc2d4', sym: '×', ring: '#2ee6c5' },
  check: { base: '#ffd43b', shade: '#e0a800', light: '#fff3bf', sym: '✓', ring: '#ff8a3d' },
  equals: { base: '#9775fa', shade: '#6f4fd8', light: '#d9ccff', sym: '=', ring: '#4dabf7' },
};
let iconId = 0;
export function planetIcon(kind) {
  const k = ICONS[kind] || ICONS.plus;
  const id = 'pi' + iconId++;
  const svg = `
  <svg viewBox="0 0 64 64" class="card-icon" aria-hidden="true">
    ${planet(id, 32, 32, 22, k.base, k.shade, k.light)}
    <ellipse cx="32" cy="34" rx="30" ry="8" fill="none" stroke="${k.ring}" stroke-width="3.5" transform="rotate(-18 32 34)" opacity=".9"/>
    <text x="30" y="40" font-family="Nunito, sans-serif" font-weight="900" font-size="22" fill="#0b0f3a" text-anchor="middle">${k.sym}</text>
    ${sparkle(56, 9, 4, '#ffffff')}
  </svg>`;
  return el('span', { html: svg, style: 'display:contents' });
}

// Mynd af rétthyrningi með merktum hliðum
export function rectFigure(w, l) {
  const svg = `
  <svg viewBox="0 0 320 170" class="figure" role="img" aria-label="Rétthyrningur með breidd ${escapeHtml(w)} og lengd ${escapeHtml(l)}">
    <rect x="60" y="22" width="200" height="104" rx="10" class="fig-shape"/>
    <path d="M60 126 L260 126 L260 22 L250 22 Q250 116 60 116 Z" class="fig-shade"/>
    ${sparkle(282, 24, 7, '#ffd43b')}
    <text x="160" y="156" text-anchor="middle" class="fig-label">${escapeHtml(l)}</text>
    <text x="48" y="80" text-anchor="end" class="fig-label">${escapeHtml(w)}</text>
  </svg>`;
  return el('div', { class: 'figure-wrap', html: svg });
}

// ---------- Örvamynd fyrir margföldun inn í sviga ----------
// d = {a:[{s,tex}], b:[{s,tex}], color, aParen}: fyrsti liðurinn í a margfaldast við hvern lið í b.

const SVG_NS = 'http://www.w3.org/2000/svg';

function termTokens(terms, paren, cls, colorFirst) {
  const row = el('span', { class: 'dd-group' });
  if (paren) row.append(el('span', { class: 'dd-paren' }, '('));
  const toks = terms.map((t, i) => {
    if (i > 0 || t.s < 0) row.append(el('span', { class: 'dd-sign' }, t.s < 0 ? '−' : '+'));
    const tok = el('span', { class: 'dd-term ' + cls, html: texHtml(t.tex) });
    if (colorFirst && i === 0) tok.style.color = colorFirst;
    row.append(tok);
    return tok;
  });
  if (paren) row.append(el('span', { class: 'dd-paren' }, ')'));
  return { row, toks };
}

export function distDiagram(d) {
  const A = termTokens(d.a, d.aParen, 'dd-a', d.color);
  const B = termTokens(d.b, true, 'dd-b');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'dd-arrows');
  svg.setAttribute('aria-hidden', 'true');
  const wrap = el('div', { class: 'dist-diagram', role: 'img', 'aria-label': 'Örvar sýna að fyrsti liðurinn margfaldast við hvern lið í svigunum' },
    svg, el('div', { class: 'dd-expr' }, A.row, B.row));
  if (d.aParen) A.toks.slice(1).forEach((t) => t.classList.add('dd-rest'));

  const draw = () => {
    if (!wrap.isConnected) return;
    const box = wrap.getBoundingClientRect();
    if (!box.width) return;
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = '';
    const id = 'ah' + Math.random().toString(36).slice(2, 8);
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML = `<marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${d.color}"/></marker>`;
    svg.append(defs);
    const src = A.toks[0].getBoundingClientRect();
    const x1 = src.left + src.width / 2 - box.left;
    const y1 = src.top - box.top + 2;
    B.toks.forEach((tok, i) => {
      const r = tok.getBoundingClientRect();
      const x2 = r.left + r.width / 2 - box.left;
      const y2 = r.top - box.top + 2;
      const h = Math.min(y1 - 4, 14 + Math.abs(x2 - x1) * 0.28);
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', `M${x1} ${y1} C${x1} ${y1 - h}, ${x2} ${y2 - h}, ${x2} ${y2 - 3}`);
      path.setAttribute('stroke', d.color);
      path.setAttribute('class', 'dd-arc');
      path.setAttribute('marker-end', `url(#${id})`);
      path.style.animationDelay = (i * 0.25) + 's';
      svg.append(path);
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
    });
  };

  // Teiknum þegar myndin er komin á síðuna og aftur ef stærðin breytist
  const ro = new ResizeObserver(() => draw());
  ro.observe(wrap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return wrap;
}
