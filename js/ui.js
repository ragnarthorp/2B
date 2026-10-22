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

  wrap.append(field, bar);
  api.root = wrap;
  return api;
}

// Mynd af rétthyrningi með merktum hliðum
export function rectFigure(w, l) {
  const svg = `
  <svg viewBox="0 0 320 170" class="figure" role="img" aria-label="Rétthyrningur með breidd ${escapeHtml(w)} og lengd ${escapeHtml(l)}">
    <rect x="60" y="25" width="200" height="100" rx="2" class="fig-shape"/>
    <text x="160" y="152" text-anchor="middle" class="fig-label">${escapeHtml(l)}</text>
    <text x="48" y="80" text-anchor="end" class="fig-label">${escapeHtml(w)}</text>
  </svg>`;
  return el('div', { class: 'figure-wrap', html: svg });
}
