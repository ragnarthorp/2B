import { parse, solveSteps, expand, polyEqual, isFinalForm, diagnose, toTex, STEP_TEXT, ParseError, topTerms, LIKE_COLORS } from './algebra.js';
import { generate } from './generators.js';
import { CHAPTERS, chapterById } from './chapters.js';
import { notesView } from './notes.js';
import { factorSteps, isFullyFactored } from './factor.js';
import { el, math, richHtml, createEditor, rectFigure, heroArt, planetIcon, distDiagram, texHtml } from './ui.js';

const app = document.getElementById('app');

const LEVELS = [
  { v: 0, label: 'Blandað' },
  { v: 1, label: 'Létt' },
  { v: 2, label: 'Miðlungs' },
  { v: 3, label: 'Erfitt' },
];

function tryParse(src) {
  try { return { node: parse(src) }; } catch (e) {
    if (e instanceof ParseError) return { error: e.message };
    return { error: 'Gat ekki lesið stæðuna.' };
  }
}

// „Skrifum 3·x sem 3x“ er sleppt þegar annað gerist í sama skrefi
// Hvað á að gera við stæðuna: einfalda (kaflar 1 og 2) eða þátta (kafli 3)
const MODES = {
  simplify: {
    steps: (n) => solveSteps(n), done: isFinalForm, prompt: 'Einfaldaðu eins og hægt er:', verb: 'Einfalda',
    none: 'Ekki er hægt að einfalda þessa stæðu frekar.', doneWord: 'fullstytt',
    notDone: 'Jafngilt, en ekki fullstytt. Kláraðu að einfalda.',
    startDone: 'Er hægt að einfalda þetta? Ef ekki, skrifaðu stæðuna óbreytta.',
  },
  factor: {
    steps: (n) => factorSteps(n), done: isFullyFactored, prompt: 'Þáttaðu eins og hægt er:', verb: 'Þátta',
    none: 'Ekki er hægt að þátta þessa stæðu.', doneWord: 'fullþáttað',
    notDone: 'Jafngilt, en ekki fullþáttað. Athugaðu hvort hægt sé að þátta einhvern svigann frekar.',
    startDone: 'Er hægt að þátta þetta? Ef ekki, skrifaðu stæðuna óbreytta.',
  },
};
const modeOf = (chapterId) => MODES[(chapterById(chapterId) || {}).mode || 'simplify'];

const explain = (kinds) => (kinds.length > 1 ? kinds.filter((k) => k !== 'mono') : kinds).map((k) => STEP_TEXT[k]).filter(Boolean);

// Örvamyndir sem sýna hvað margfaldast saman í skrefinu
function diagramsView(s) {
  if (!s.diagrams || !s.diagrams.length) return null;
  return el('div', { class: 'diagrams' }, s.diagrams.map(distDiagram));
}

// Útskýring á skrefi: almenn regla og svo nákvæmlega hvað er reiknað hér
function whyView(s) {
  return el('div', { class: 'step-why' },
    el('div', {}, explain(s.kinds).join(' ')),
    s.notes && s.notes.length ? el('div', { class: 'step-notes' }, s.notes.map((n) => el('span', { class: 'note' }, n))) : null);
}

// Lausn skref fyrir skref
function stepsView(node, { showStart = true, mode = MODES.simplify } = {}) {
  const steps = mode.steps(node);
  const list = el('ol', { class: 'steps' });
  if (showStart) list.append(el('li', { class: 'step start' }, el('div', { class: 'step-math' }, math(toTex(node)))));
  if (!steps.length) {
    list.append(el('li', { class: 'step note' }, mode.none));
  }
  steps.forEach((s, i) => {
    list.append(el('li', { class: 'step' + (i === steps.length - 1 ? ' final' : '') },
      diagramsView(s),
      el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), math(s.tex)),
      whyView(s)));
  });
  return list;
}

// Lausn sem birtist eitt skref í einu
function stepper(node, mode = MODES.simplify) {
  const steps = mode.steps(node);
  const list = el('ol', { class: 'steps' });
  if (!steps.length) {
    list.append(el('li', { class: 'step note' }, mode.none));
    return el('div', { class: 'stepper' }, list);
  }
  let shown = 0;
  const status = el('span', { class: 'stats' });
  const next = el('button', { class: 'btn', onclick: () => { shown++; draw(true); } }, 'Næsta skref');
  const all = el('button', { class: 'btn ghost', onclick: () => { shown = steps.length; draw(false); } }, 'Sýna alla lausnina');
  const reset = el('button', { class: 'btn ghost', onclick: () => { shown = 0; draw(false); } }, 'Byrja aftur');
  function draw(animate) {
    list.innerHTML = '';
    steps.slice(0, shown).forEach((s, i) => {
      const last = i === steps.length - 1;
      list.append(el('li', { class: 'step' + (last ? ' final' : '') + (animate && i === shown - 1 ? ' new' : '') },
        diagramsView(s),
        el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), math(s.tex)),
        whyView(s)));
    });
    next.hidden = all.hidden = shown >= steps.length;
    reset.hidden = shown === 0;
    status.textContent = shown >= steps.length ? 'Lausn lokið' : `Skref ${shown} af ${steps.length}`;
    if (animate && list.lastChild) list.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  draw(false);
  return el('div', { class: 'stepper' }, list, el('div', { class: 'row' }, next, all, reset, status));
}

// Númerahnappar til að fletta milli dæma
function pager(count, current, go, cls = () => '') {
  return el('nav', { class: 'pager', 'aria-label': 'Dæmi' },
    el('button', { class: 'btn ghost', disabled: current === 0, onclick: () => go(current - 1) }, '◀ Fyrra'),
    el('div', { class: 'pager-nums' }, Array.from({ length: count }, (_, i) =>
      el('button', { class: 'pnum' + (i === current ? ' current' : '') + ' ' + cls(i), 'aria-current': i === current ? 'true' : null, onclick: () => go(i) }, i + 1))),
    el('button', { class: 'btn ghost', disabled: current === count - 1, onclick: () => go(current + 1) }, 'Næsta ▶'));
}

function levelSelect(value, onChange) {
  const sel = el('select', { class: 'select', 'aria-label': 'Erfiðleikastig', onchange: (e) => onChange(+e.target.value) },
    LEVELS.map((l) => el('option', { value: l.v, selected: l.v === value }, l.label)));
  return sel;
}

function problemHeader(p) {
  return el('div', { class: 'problem' },
    el('p', { class: 'prompt' }, p.prompt),
    p.figure && p.figure.type === 'rect' ? rectFigure(p.figure.w, p.figure.l) : null,
    el('div', { class: 'problem-math' }, math(toTex(parse(p.expr)))));
}

// ---------- Forsíða ----------

const CHAPTER_ICONS = { '1.1': 'plus', '2.1': 'times', '3.1': 'factor' };

function homeView() {
  return el('div', { class: 'page' },
    el('section', { class: 'hero' },
      el('div', {},
        el('h1', {}, 'Stærðfræði ', el('span', { class: 'hl' }, '2B')),
        el('p', {}, 'Lærðu að reikna með liðastærðum, eitt lítið skref í einu. Sýnidæmi með útskýringum, reiknivél og æfingar þar sem þú reiknar sjálf/ur.')),
      heroArt()),
    el('div', { class: 'cards' },
      CHAPTERS.map((c) => el('a', { class: 'card', href: `#/kafli/${c.id}` },
        planetIcon(CHAPTER_ICONS[c.id]),
        el('span', { class: 'card-num' }, 'KAFLI ' + c.id),
        el('span', { class: 'card-title' }, c.title),
        el('span', { class: 'card-sub' }, `${c.examples.length} sýnidæmi · reiknivél · æfingar`))),
      el('a', { class: 'card', href: '#/glosur' },
        planetIcon('notes'),
        el('span', { class: 'card-num' }, 'GLÓSUR'),
        el('span', { class: 'card-title' }, 'Glósublað fyrir próf'),
        el('span', { class: 'card-sub' }, 'Allt sem þú þarft að kunna á einum stað, hægt að prenta')),
      el('a', { class: 'card', href: '#/prof' },
        planetIcon('check'),
        el('span', { class: 'card-num' }, 'PRÓF'),
        el('span', { class: 'card-title' }, 'Prófæfing'),
        el('span', { class: 'card-sub' }, 'Veldu kafla og fáðu blandað æfingapróf')),
      el('a', { class: 'card', href: '#/reiknivel' },
        planetIcon('equals'),
        el('span', { class: 'card-num' }, 'VERKFÆRI'),
        el('span', { class: 'card-title' }, 'Reiknivél'),
        el('span', { class: 'card-sub' }, 'Skrifaðu inn þitt eigið dæmi og sjáðu lausnina skref fyrir skref'))));
}

// ---------- Kafli ----------

const TABS = [
  { id: 'synidaemi', label: 'Sýnidæmi' },
  { id: 'reiknivel', label: 'Reiknivél' },
  { id: 'aefing', label: 'Æfing' },
];

function chapterView(id, tab, param) {
  const c = chapterById(id);
  if (!c) return notFound();
  tab = TABS.some((t) => t.id === tab) ? tab : 'synidaemi';
  const nav = el('nav', { class: 'tabs' }, TABS.map((t) =>
    el('a', { class: 'tab' + (t.id === tab ? ' active' : ''), href: `#/kafli/${c.id}/${t.id}` }, t.label)));
  let body;
  if (tab === 'synidaemi') body = examplesView(c);
  else if (tab === 'reiknivel') body = calculatorView(c);
  else body = practiceView(c, param);
  return el('div', { class: 'page' },
    el('h1', {}, el('span', { class: 'num' }, c.id), ' ', c.title), nav, body);
}

function examplesView(c) {
  const list = c.examples.map((ex, i) => ({ ...ex, label: `Sýnidæmi ${i + 1}` }));
  let idx = 0, level = 0, made = 0;
  const area = el('div', {});

  function show(i) {
    idx = Math.max(0, Math.min(list.length - 1, i));
    const ex = list[idx];
    area.innerHTML = '';
    area.append(
      pager(list.length, idx, show, (i) => (list[i].generated ? 'gen' : '')),
      el('section', { class: 'example' },
        el('h2', {}, ex.label, ex.section ? el('span', { class: 'chip section-chip' }, ex.section) : null),
        problemHeader({ prompt: ex.prompt || modeOf(c.id).prompt, expr: ex.expr, figure: ex.figure }),
        stepper(parse(ex.expr), modeOf(c.id)),
        ex.note ? el('p', { class: 'tip' }, el('b', {}, 'Athugið: '), ex.note) : null,
        ex.noPractice ? null : el('a', { class: 'btn ghost', href: `#/kafli/${c.id}/aefing/${encodeURIComponent(ex.expr)}` }, 'Reikna þetta sjálf/ur í skrefum →')));
  }

  const more = () => {
    made++;
    list.push({ ...generate(c.id, level), label: `Nýtt sýnidæmi ${made}`, generated: true });
    show(list.length - 1);
  };

  // Örvatakkar fletta milli dæma
  const onKey = (e) => {
    if (!document.body.contains(area)) { document.removeEventListener('keydown', onKey); return; }
    if (e.target.closest && e.target.closest('math-field, input, select, textarea')) return;
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  };
  document.addEventListener('keydown', onKey);

  show(0);
  return el('div', {},
    el('details', { class: 'theory', open: true }, el('summary', {}, 'Upprifjun'), el('div', { html: richHtml(c.intro) })),
    area,
    el('section', { class: 'panel' },
      el('h2', {}, 'Fleiri sýnidæmi'),
      el('div', { class: 'row' },
        el('label', {}, 'Erfiðleikastig ', levelSelect(level, (v) => { level = v; })),
        el('button', { class: 'btn', onclick: more }, 'Búa til nýtt sýnidæmi'))));
}

function calculatorView(c) {
  const out = el('div', { class: 'calc-out' });
  const run = (mode) => {
    out.innerHTML = '';
    const src = ed.getValue();
    if (!src.trim()) return;
    const r = tryParse(src);
    if (r.error) { out.append(el('p', { class: 'msg bad' }, r.error)); return; }
    out.append(stepsView(r.node, { mode }));
  };
  // Í kafla er ein aðgerð; á almennu reiknivélinni má velja einföldun eða þáttun
  const own = c ? modeOf(c.id) : null;
  const ed = createEditor({ placeholder: own === MODES.factor ? 't.d. 3x^2-12' : 't.d. 2x(x+3)-(x-1)^2', onEnter: () => run(own || MODES.simplify) });
  const randomProblem = () => {
    const p = generate(c ? c.id : CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)].id, 0);
    ed.setValue(toTex(parse(p.expr)));
    out.innerHTML = '';
    ed.focus();
  };
  const buttons = own
    ? [el('button', { class: 'btn', onclick: () => run(own) }, own === MODES.factor ? 'Þátta' : 'Reikna')]
    : [el('button', { class: 'btn', onclick: () => run(MODES.simplify) }, 'Einfalda'),
      el('button', { class: 'btn', onclick: () => run(MODES.factor) }, 'Þátta')];
  return el('section', { class: 'panel' },
    el('p', {}, own === MODES.factor
      ? 'Skrifaðu inn þitt eigið dæmi. Reiknivélin þáttar það og sýnir hvert skref.'
      : c ? 'Skrifaðu inn þitt eigið dæmi. Reiknivélin einfaldar það og sýnir hvert skref.'
        : 'Skrifaðu inn dæmi með liðastærðum. Veldu hvort reiknivélin á að einfalda eða þátta. Hún sýnir hvert skref.'),
    ed.root,
    el('div', { class: 'row' }, ...buttons,
      el('button', { class: 'btn ghost', onclick: randomProblem }, 'Fá dæmi af handahófi')),
    out);
}

// ---------- Litunartól: nemandinn litar líka liði ----------

const PALETTE = LIKE_COLORS.slice(0, 5);

// node: stæðan sem á að lita. onArrange(tex): setur liðina, raðaða eftir litum, í ritilinn.
// keyColors: litir sem nemandinn hefur þegar valið (breytuhluti -> litur); fylgja yfir í næstu línur.
function colorTool(node, onArrange, keyColors = {}) {
  const terms = topTerms(node);
  const colors = terms.map((t) => (t.key !== null && keyColors[t.key] !== undefined ? keyColors[t.key] : null));
  let current = 0;
  const msg = el('p', { class: 'msg', 'aria-live': 'polite' });

  const swatches = el('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Litir' });
  const drawSwatches = () => {
    swatches.innerHTML = '';
    PALETTE.forEach((c, i) => swatches.append(el('button', {
      type: 'button', class: 'swatch' + (i === current ? ' on' : ''), style: `--c:${c}`,
      role: 'radio', 'aria-checked': String(i === current), 'aria-label': `Litur ${i + 1}`,
      onclick: () => { current = i; drawSwatches(); },
    })));
    swatches.append(el('button', {
      type: 'button', class: 'swatch eraser' + (current === -1 ? ' on' : ''), title: 'Strokleður',
      role: 'radio', 'aria-checked': String(current === -1), 'aria-label': 'Strokleður',
      onclick: () => { current = -1; drawSwatches(); },
    }, '⌫'));
  };

  const chips = el('div', { class: 'term-chips' });
  const drawChips = () => {
    chips.innerHTML = '';
    terms.forEach((t, i) => {
      if (i > 0 || t.s < 0) chips.append(el('span', { class: 'chip-sign' }, t.s < 0 ? '−' : '+'));
      const c = colors[i] === null ? null : PALETTE[colors[i]];
      chips.append(el('button', {
        type: 'button', class: 'term-chip' + (c ? ' colored' : ''), style: c ? `--c:${c}` : null,
        'aria-label': `Liður ${i + 1}`,
        onclick: () => {
          colors[i] = current === -1 || colors[i] === current ? null : current;
          msg.textContent = '';
          msg.className = 'msg';
          drawChips();
        },
        html: texHtml((t.s < 0 && i === 0 ? '' : '') + t.tex),
      }));
    });
  };

  const check = () => {
    const groups = {};
    terms.forEach((t, i) => { if (t.key !== null) (groups[t.key] = groups[t.key] || []).push(i); });
    const like = Object.values(groups).filter((g) => g.length > 1);
    msg.className = 'msg bad';
    if (!like.length) { msg.className = 'msg info'; msg.textContent = 'Hér eru engir líkir liðir til að lita.'; return; }
    for (const g of like) {
      if (g.some((i) => colors[i] === null)) {
        const names = g.map((i) => (terms[i].s < 0 ? '−' : '') + terms[i].tex.replace(/\\[a-z]+|[{}]/g, ''));
        msg.textContent = `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]} eru líkir liðir. Litaðu þá alla í sama lit.`;
        return;
      }
      if (new Set(g.map((i) => colors[i])).size > 1) {
        msg.textContent = 'Líkir liðir eiga að vera í sama lit. Athugaðu breyturnar og veldin.';
        return;
      }
    }
    const used = {};
    for (const [k, g] of Object.entries(groups)) for (const i of g) {
      if (colors[i] === null) continue;
      if (used[colors[i]] !== undefined && used[colors[i]] !== k) {
        msg.textContent = 'Liðir sem eru ekki líkir eiga að vera í ólíkum litum. Líkir liðir hafa nákvæmlega sömu breytur í sömu veldum.';
        return;
      }
      used[colors[i]] = k;
    }
    if (terms.some((t, i) => t.key === null && colors[i] !== null) || false) { /* liðir sem eru ekki einliðir mega vera litaðir */ }
    terms.forEach((t, i) => { if (t.key !== null && colors[i] !== null) keyColors[t.key] = colors[i]; });
    msg.className = 'msg good';
    msg.textContent = 'Rétt flokkað! Nú geturðu raðað litunum saman.';
    arrange.hidden = false;
  };

  const arrange = el('button', {
    class: 'btn ghost', hidden: true,
    onclick: () => {
      // Lituðum liðum raðað saman eftir lit, ólitaðir aftast
      const order = terms.map((t, i) => i).sort((a, b) => {
        const ca = colors[a] === null ? 99 : colors[a], cb = colors[b] === null ? 99 : colors[b];
        return ca - cb || a - b;
      });
      const tex = order.map((i, j) => (terms[i].s < 0 ? '-' : j === 0 ? '' : '+') + terms[i].tex).join('');
      onArrange(tex);
    },
  }, 'Raða litunum saman í ritilinn');

  drawSwatches();
  drawChips();
  return el('div', { class: 'color-tool' },
    el('p', { class: 'help' }, 'Veldu lit og smelltu á liðina. Litaðu líka liði í sama lit og ólíka liði í ólíkum litum.'),
    swatches, chips,
    el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: check }, 'Athuga litun'),
      arrange,
      el('button', { class: 'btn ghost', onclick: () => { colors.fill(null); arrange.hidden = true; msg.textContent = ''; drawChips(); } }, 'Hreinsa liti')),
    msg);
}

// Æfing í skrefum
function practiceView(c, presetExpr) {
  const mode = modeOf(c.id);
  let level = 0;
  let problem = null;
  let lines = [];    // [{node, tex, shown}]
  let solved = 0, tried = 0;

  const root = el('div', {});
  const stats = el('span', { class: 'stats' });
  const area = el('div', {});

  const updateStats = () => { stats.textContent = tried ? `Leyst: ${solved} af ${tried}` : ''; };

  const newProblem = (p) => {
    problem = p;
    lines = [];
    tried++;
    updateStats();
    renderArea();
  };

  const own = createEditor({ placeholder: 'Skrifaðu þitt eigið dæmi', compact: true, onEnter: () => useOwn() });
  const ownMsg = el('p', { class: 'msg' });
  const useOwn = () => {
    const r = tryParse(own.getValue());
    if (r.error) { ownMsg.className = 'msg bad'; ownMsg.textContent = r.error; return; }
    ownMsg.textContent = '';
    newProblem({ prompt: mode.prompt, expr: own.getValue(), node: r.node });
  };

  const controls = el('div', { class: 'panel controls' },
    el('div', { class: 'row' },
      el('label', {}, 'Erfiðleikastig ', levelSelect(level, (v) => { level = v; })),
      el('button', { class: 'btn', onclick: () => newProblem(generate(c.id, level)) }, 'Nýtt dæmi'),
      stats),
    el('details', { class: 'own' },
      el('summary', {}, 'Eða skrifaðu þitt eigið dæmi'),
      own.root,
      el('div', { class: 'row' }, el('button', { class: 'btn ghost', onclick: useOwn }, 'Æfa þetta dæmi')),
      ownMsg));

  function renderArea() {
    area.innerHTML = '';
    if (!problem) return;
    const start = problem.node || parse(problem.expr);
    const current = () => (lines.length ? lines[lines.length - 1].node : start);
    const done = () => lines.length && mode.done(current()) && polyEqual(expand(current()), expand(start));
    const startFinal = mode.done(start);

    // Næsta skref: fylgjum áætlun vélarinnar á meðan nemandinn notar „Sýna næsta skref“,
    // en reiknum nýja áætlun út frá línu sem nemandinn skrifaði sjálfur.
    const upcoming = () => {
      const last = lines[lines.length - 1];
      if (last && last.plan && last.plan[last.idx + 1]) return { step: last.plan[last.idx + 1], plan: last.plan, idx: last.idx + 1 };
      if (last && last.plan) return null;
      const plan = mode.steps(current());
      return plan.length ? { step: plan[0], plan, idx: 0 } : null;
    };

    const work = el('ol', { class: 'steps work' });
    const msg = el('p', { class: 'msg', 'aria-live': 'polite' });
    const ed = createEditor({ placeholder: 'Skrifaðu næsta skref', onEnter: () => check() });

    const keyColors = {};
    const coloredTex = (node) => topTerms(node).map((t, i) => {
      const body = (t.s < 0 ? '-' : i === 0 ? '' : '+') + t.tex;
      const c = t.key !== null ? keyColors[t.key] : undefined;
      return c === undefined ? body : (t.s < 0 || i === 0 ? '' : '+') + '\\textcolor{' + PALETTE[c] + '}{' + (t.s < 0 ? '-' : '') + t.tex + '}';
    }).join('');
    const colorBox = el('details', { class: 'panel color-panel' });
    const drawColor = () => {
      const node = current();
      const terms = topTerms(node);
      const keys = terms.map((t) => t.key).filter((k) => k !== null);
      const hasLike = new Set(keys).size < keys.length;
      colorBox.hidden = mode === MODES.factor || terms.length < 2 || (isFinalForm(node) && !hasLike);
      colorBox.open = hasLike;
      colorBox.innerHTML = '';
      colorBox.append(el('summary', {}, '🎨 Litaðu líka liði'),
        colorTool(node, (tex) => { ed.setValue(tex); ed.focus(); }, keyColors));
    };

    const draw = () => {
      drawColor();
      work.innerHTML = '';
      for (const l of lines) {
        work.append(el('li', { class: 'step ' + (l.shown ? 'shown' : 'ok') },
          l.step ? diagramsView(l.step) : null,
          el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), math(l.shown ? l.tex : coloredTex(l.node)), el('span', { class: 'mark' }, l.shown ? 'sýnt' : '✓')),
          l.step ? whyView(l.step) : null));
      }
    };

    const finish = () => {
      const usedHelp = lines.some((l) => l.shown);
      if (!usedHelp) solved++;
      updateStats();
      msg.className = 'msg good';
      msg.textContent = usedHelp ? 'Komið! Reyndu næst að klára án hjálpar.' : `Vel gert! Þetta er ${mode.doneWord} og rétt.`;
      inputBox.hidden = true;
      colorBox.hidden = true;
      after.hidden = false;
    };

    const check = () => {
      const src = ed.getValue();
      if (!src.trim()) return;
      const r = tryParse(src);
      if (r.error) { msg.className = 'msg bad'; msg.textContent = r.error; return; }
      if (!polyEqual(expand(r.node), expand(start))) {
        msg.className = 'msg bad';
        msg.textContent = 'Ekki rétt. ' + diagnose(start, r.node);
        return;
      }
      lines.push({ node: r.node, tex: toTex(r.node) });
      ed.setValue('');
      draw();
      if (mode.done(r.node)) { finish(); return; }
      msg.className = 'msg good';
      msg.textContent = 'Rétt! Haltu áfram.';
      ed.focus();
    };

    const hint = () => {
      const u = upcoming();
      msg.className = 'msg info';
      msg.textContent = u ? 'Vísbending: ' + explain(u.step.kinds).join(' ') : `Þetta er ${mode.doneWord}.`;
    };

    const pushShown = (u) => lines.push({ node: u.step.node, tex: u.step.tex, shown: true, step: u.step, plan: u.plan, idx: u.idx });

    const showNext = () => {
      const u = upcoming();
      if (!u) return;
      pushShown(u);
      draw();
      msg.textContent = '';
      if (!upcoming()) finish();
    };

    const showAll = () => {
      let u;
      while ((u = upcoming())) pushShown(u);
      draw();
      finish();
    };

    const inputBox = el('div', { class: 'panel' },
      el('p', { class: 'help' }, startFinal
        ? mode.startDone
        : 'Skrifaðu næsta skref (eða fleiri skref í einu) og ýttu á Enter. Þú mátt sleppa skrefum ef þú treystir þér.'),
      ed.root,
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: check }, 'Athuga'),
        el('button', { class: 'btn ghost', onclick: hint }, 'Vísbending'),
        el('button', { class: 'btn ghost', onclick: showNext }, 'Sýna næsta skref'),
        el('button', { class: 'btn ghost', onclick: showAll }, 'Sýna lausn')));
    const after = el('div', { class: 'row', hidden: true },
      el('button', { class: 'btn', onclick: () => newProblem(generate(c.id, level)) }, 'Nýtt dæmi →'));

    area.append(el('section', { class: 'example' }, problemHeader(problem), work), colorBox, inputBox, msg, after);
    draw();
    if (done()) finish();
    setTimeout(() => ed.focus(), 50);
  }

  root.append(controls, area);
  if (presetExpr) {
    const r = tryParse(presetExpr);
    if (!r.error) newProblem({ prompt: mode.prompt, expr: presetExpr, node: r.node });
  }
  return root;
}

// ---------- Prófæfing ----------

function gradeAnswer(p, src) {
  const mode = modeOf(p.chapter);
  const start = parse(p.expr);
  if (!src.trim()) return { ok: false, text: 'Ekkert svar.' };
  const r = tryParse(src);
  if (r.error) return { ok: false, text: r.error };
  if (!polyEqual(expand(r.node), expand(start))) return { ok: false, text: 'Rangt. ' + diagnose(start, r.node) };
  if (!mode.done(r.node)) return { ok: false, text: mode.notDone };
  return { ok: true, text: 'Rétt!' };
}

function examView() {
  const selected = new Set(CHAPTERS.map((c) => c.id));
  let count = 10, level = 0;
  const root = el('div', { class: 'page' }, el('h1', {}, 'Prófæfing'));
  const errMsg = el('p', { class: 'msg bad' });
  const setup = el('section', { class: 'panel' },
    el('p', {}, 'Hakaðu við kaflana sem æfingin á að vera úr.'),
    el('div', { class: 'checks' }, CHAPTERS.map((c) => el('label', { class: 'check' },
      el('input', { type: 'checkbox', checked: true, onchange: (e) => { e.target.checked ? selected.add(c.id) : selected.delete(c.id); } }),
      ` ${c.id} ${c.title}`))),
    el('div', { class: 'row' },
      el('label', {}, 'Fjöldi dæma ', el('select', { class: 'select', onchange: (e) => { count = +e.target.value; } },
        [5, 10, 15, 20].map((n) => el('option', { value: n, selected: n === count }, n)))),
      el('label', {}, 'Erfiðleikastig ', levelSelect(level, (v) => { level = v; })),
      el('button', { class: 'btn', onclick: () => start() }, 'Búa til próf')),
    errMsg);
  const testArea = el('div', {});
  root.append(setup, testArea);

  let timer;
  function start() {
    if (!selected.size) { errMsg.textContent = 'Veldu að minnsta kosti einn kafla.'; return; }
    errMsg.textContent = '';
    clearInterval(timer);
    const ids = [...selected];
    const qs = [];
    const seen = new Set();
    for (let i = 0; i < count; i++) {
      let p, tries = 0;
      do { p = generate(ids[i % ids.length], level); tries++; } while (seen.has(p.expr) && tries < 20);
      seen.add(p.expr);
      qs.push(p);
    }
    if (!level) qs.sort((a, b) => a.level - b.level);

    const t0 = Date.now();
    const clock = el('span', { class: 'stats' });
    const tick = () => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      clock.textContent = `Tími: ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    };
    tick();
    timer = setInterval(tick, 1000);

    // results[i] er null þar til dæmi i hefur verið yfirfarið (stakt eða við skil)
    let idx = 0, finished = false;
    const results = qs.map(() => null);
    // Hvert dæmi hefur eina eða fleiri línur; síðasta útfyllta línan er svarið.
    const items = qs.map((p) => ({ p, lines: [], linesEl: el('ol', { class: 'work-lines' }) }));
    const values = (it) => it.lines.map((l) => l.ed.getValue().trim());
    const finalAnswer = (it) => values(it).filter(Boolean).pop() || '';
    const answered = (i) => !!finalAnswer(items[i]);

    function addLine(it, after = it.lines.length - 1) {
      const line = {};
      line.ed = createEditor({
        placeholder: 'Lína', compact: true,
        onEnter: () => {
          // Enter í neðstu línu bætir við nýrri línu ef eitthvað er skrifað
          if (it.lines[it.lines.length - 1] === line && line.ed.getValue().trim()) addLine(it).ed.focus();
          else { const j = it.lines.indexOf(line); if (it.lines[j + 1]) it.lines[j + 1].ed.focus(); }
        },
      });
      line.root = el('li', { class: 'work-line' },
        el('span', { class: 'eq' }, '='),
        line.ed.root,
        el('button', {
          type: 'button', class: 'line-del', title: 'Eyða línu', 'aria-label': 'Eyða línu',
          onclick: () => {
            if (it.lines.length === 1) { line.ed.setValue(''); return; }
            it.lines.splice(it.lines.indexOf(line), 1);
            line.root.remove();
          },
        }, '×'));
      it.lines.splice(after + 1, 0, line);
      const next = it.lines[after + 2];
      if (next) it.linesEl.insertBefore(line.root, next.root); else it.linesEl.append(line.root);
      return line;
    }
    items.forEach((it) => addLine(it));

    const view = el('div', {});
    setup.hidden = true;

    function go(i) {
      idx = Math.max(0, Math.min(items.length - 1, i));
      render();
    }

    const gradedCount = () => results.filter(Boolean).length;
    const correctCount = () => results.filter((r) => r && r.ok).length;

    function render() {
      const it = items[idx];
      const r = results[idx];
      view.innerHTML = '';
      const cls = (i) => (results[i] ? (results[i].ok ? 'right' : 'wrong') : answered(i) ? 'done' : '');
      const head = el('div', { class: 'row exam-head' },
        el('b', {}, finished ? 'Yfirferð' : `Dæmi ${idx + 1} af ${items.length}`),
        gradedCount() ? el('span', { class: 'score' }, finished
          ? `${correctCount()} / ${items.length} rétt`
          : `${correctCount()} rétt af ${gradedCount()} yfirförnum`) : null,
        clock);
      const card = el('section', { class: 'example q' + (r ? (r.ok ? ' right' : ' wrong') : '') },
        el('h2', {}, `${idx + 1}.`, el('span', { class: 'chip' }, it.p.chapter)),
        problemHeader(it.p));
      if (!r) {
        card.append(
          el('p', { class: 'help' }, `Reiknaðu í eins mörgum línum og þú vilt. Enter bætir við línu. Síðasta línan er svarið þitt og á að vera ${modeOf(it.p.chapter).doneWord}.`),
          it.linesEl,
          el('div', { class: 'row' },
            el('button', { class: 'btn ghost add-line', onclick: () => addLine(it).ed.focus() }, '+ Bæta við línu'),
            el('button', { class: 'btn', onclick: () => gradeOne(idx) }, 'Fara yfir þetta dæmi strax')));
      } else {
        const start = parse(it.p.expr);
        const written = values(it).filter(Boolean);
        const work = el('ol', { class: 'steps review-lines' });
        written.forEach((src, j) => {
          const pr = tryParse(src);
          const ok = pr.node && polyEqual(expand(pr.node), expand(start));
          const last = j === written.length - 1;
          work.append(el('li', { class: 'step ' + (ok ? 'ok' : 'bad-line') + (last ? ' answer' : '') },
            el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), pr.node ? math(toTex(pr.node)) : el('span', {}, src),
              el('span', { class: 'mark' }, ok ? '✓' : '✗')),
            !ok ? el('div', { class: 'step-why' }, pr.error || ((d) => (d.startsWith('Þetta er ekki') ? d : 'Ekki jafngilt dæminu. ' + d))(diagnose(start, pr.node))) : null,
            last ? el('div', { class: 'step-why' }, 'Svarið þitt') : null));
        });
        card.append(
          written.length ? work : el('div', { class: 'your-answer' }, 'Þitt svar: ', el('i', {}, 'ekkert')),
          el('p', { class: 'msg ' + (r.ok ? 'good' : 'bad') }, r.text),
          el('h3', {}, 'Lausn skref fyrir skref'),
          stepper(parse(it.p.expr), modeOf(it.p.chapter)));
        const nextOpen = results.findIndex((x, i) => !x && i > idx);
        const anyOpen = results.findIndex((x) => !x);
        const target = nextOpen >= 0 ? nextOpen : anyOpen;
        if (!finished && target >= 0) card.append(el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => go(target) }, `Áfram í dæmi ${target + 1} →`)));
      }
      const actions = el('div', { class: 'row' });
      if (!finished) {
        actions.append(el('button', { class: 'btn big', onclick: submit }, gradedCount() ? 'Skila restinni af prófinu' : 'Skila prófi'));
      } else {
        actions.append(el('button', { class: 'btn', onclick: () => { setup.hidden = false; testArea.innerHTML = ''; setup.scrollIntoView(); } }, 'Nýtt próf'));
      }
      view.append(head, pager(items.length, idx, go, cls), card, actions);
      if (!r) setTimeout(() => it.lines[it.lines.length - 1].ed.focus(), 30);
    }

    function checkFinished() {
      if (results.every(Boolean)) { finished = true; clearInterval(timer); }
    }

    // Fara yfir eitt dæmi: því er læst og lausnin sýnd
    function gradeOne(i) {
      const it = items[i];
      if (!answered(i) && !confirm('Þú hefur ekki skrifað svar. Viltu samt láta fara yfir dæmið?')) return;
      results[i] = gradeAnswer(it.p, finalAnswer(it));
      checkFinished();
      render();
    }

    function submit() {
      const open = items.map((_, i) => i).filter((i) => !results[i]);
      const missing = open.filter((i) => !answered(i)).length;
      if (missing && !confirm(`Þú átt eftir að svara ${missing} ${missing === 1 ? 'dæmi' : 'dæmum'}. Viltu skila samt?`)) return;
      for (const i of open) results[i] = gradeAnswer(items[i].p, finalAnswer(items[i]));
      checkFinished();
      idx = 0;
      render();
      view.scrollIntoView({ behavior: 'smooth' });
    }

    testArea.innerHTML = '';
    testArea.append(view);
    render();
  }
  return root;
}

function notFound() {
  return el('div', { class: 'page' }, el('h1', {}, 'Síða fannst ekki'), el('a', { href: '#/' }, 'Á forsíðu'));
}

// ---------- Leiðir ----------

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let view;
  if (!parts[0]) view = homeView();
  else if (parts[0] === 'kafli') view = chapterView(parts[1], parts[2], parts.slice(3).join('/'));
  else if (parts[0] === 'prof') view = examView();
  else if (parts[0] === 'glosur') view = notesView();
  else if (parts[0] === 'reiknivel') view = el('div', { class: 'page' }, el('h1', {}, 'Reiknivél'), calculatorView(null));
  else view = notFound();
  app.innerHTML = '';
  app.append(view);
  document.querySelectorAll('.topnav a').forEach((a) => {
    const h = a.getAttribute('href').replace(/^#\/?/, '');
    a.classList.toggle('active', h ? location.hash.replace(/^#\/?/, '').startsWith(h) : !parts[0]);
  });
  window.scrollTo(0, 0);
}

function buildNav() {
  const nav = document.getElementById('topnav');
  nav.append(
    ...CHAPTERS.map((c) => el('a', { href: `#/kafli/${c.id}` }, c.id, ' ', el('span', { class: 'hide-sm' }, c.title))),
    el('a', { href: '#/glosur' }, 'Glósur'),
    el('a', { href: '#/prof' }, 'Prófæfing'),
    el('a', { href: '#/reiknivel' }, 'Reiknivél'));
}

async function boot() {
  // Bíðum eftir ritlinum (ef hann hleðst ekki notum við venjulegan textareit)
  if (window.customElements && !customElements.get('math-field')) {
    await Promise.race([customElements.whenDefined('math-field'), new Promise((r) => setTimeout(r, 3000))]);
  }
  if (window.MathfieldElement) {
    try { window.MathfieldElement.soundsDirectory = null; window.MathfieldElement.keypressSound = null; } catch { /* */ }
  }
  buildNav();
  window.addEventListener('hashchange', route);
  route();
}

boot();
