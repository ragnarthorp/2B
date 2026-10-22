import { parse, solveSteps, nextStep, expand, polyEqual, isFinalForm, diagnose, toTex, STEP_TEXT, ParseError } from './algebra.js';
import { generate } from './generators.js';
import { CHAPTERS, chapterById } from './chapters.js';
import { el, math, richHtml, createEditor, rectFigure } from './ui.js';

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

const explain = (kinds) => kinds.map((k) => STEP_TEXT[k]).filter(Boolean);

// Lausn skref fyrir skref
function stepsView(node, { showStart = true } = {}) {
  const steps = solveSteps(node);
  const list = el('ol', { class: 'steps' });
  if (showStart) list.append(el('li', { class: 'step start' }, el('div', { class: 'step-math' }, math(toTex(node)))));
  if (!steps.length) {
    list.append(el('li', { class: 'step note' }, 'Ekki er hægt að einfalda þessa stæðu frekar.'));
  }
  steps.forEach((s, i) => {
    list.append(el('li', { class: 'step' + (i === steps.length - 1 ? ' final' : '') },
      el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), math(s.tex)),
      el('div', { class: 'step-why' }, explain(s.kinds).join(' '))));
  });
  return list;
}

// Lausn sem birtist eitt skref í einu
function stepper(node) {
  const steps = solveSteps(node);
  const list = el('ol', { class: 'steps' });
  if (!steps.length) {
    list.append(el('li', { class: 'step note' }, 'Ekki er hægt að einfalda þessa stæðu frekar.'));
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
        el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), math(s.tex)),
        el('div', { class: 'step-why' }, explain(s.kinds).join(' '))));
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

function homeView() {
  return el('div', { class: 'page' },
    el('section', { class: 'hero' },
      el('h1', {}, 'Stærðfræði 2B'),
      el('p', {}, 'Sýnidæmi með útskýringum, reiknivél sem sýnir skrefin og æfingar þar sem þú reiknar sjálf/ur skref fyrir skref.')),
    el('div', { class: 'cards' },
      CHAPTERS.map((c) => el('a', { class: 'card', href: `#/kafli/${c.id}` },
        el('span', { class: 'card-num' }, c.id),
        el('span', { class: 'card-title' }, c.title),
        el('span', { class: 'card-sub' }, `${c.examples.length} sýnidæmi · reiknivél · æfingar`))),
      el('a', { class: 'card accent', href: '#/prof' },
        el('span', { class: 'card-num' }, '✓'),
        el('span', { class: 'card-title' }, 'Prófæfing'),
        el('span', { class: 'card-sub' }, 'Veldu kafla og fáðu blandað æfingapróf')),
      el('a', { class: 'card', href: '#/reiknivel' },
        el('span', { class: 'card-num' }, '='),
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
        el('h2', {}, ex.label),
        problemHeader({ prompt: ex.prompt || 'Einfaldaðu eins og hægt er:', expr: ex.expr, figure: ex.figure }),
        stepper(parse(ex.expr)),
        ex.note ? el('p', { class: 'tip' }, el('b', {}, 'Athugið: '), ex.note) : null,
        el('a', { class: 'btn ghost', href: `#/kafli/${c.id}/aefing/${encodeURIComponent(ex.expr)}` }, 'Reikna þetta sjálf/ur í skrefum →')));
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
  const run = () => {
    out.innerHTML = '';
    const src = ed.getValue();
    if (!src.trim()) return;
    const r = tryParse(src);
    if (r.error) { out.append(el('p', { class: 'msg bad' }, r.error)); return; }
    out.append(stepsView(r.node));
  };
  const ed = createEditor({ placeholder: 't.d. 2x(x+3)-(x-1)^2', onEnter: run });
  const randomProblem = () => {
    const p = generate(c ? c.id : CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)].id, 0);
    ed.setValue(toTex(parse(p.expr)));
    out.innerHTML = '';
    ed.focus();
  };
  return el('section', { class: 'panel' },
    el('p', {}, c ? 'Skrifaðu inn þitt eigið dæmi. Reiknivélin einfaldar það og sýnir hvert skref.' : 'Skrifaðu inn dæmi með liðastærðum. Reiknivélin einfaldar það og sýnir hvert skref.'),
    ed.root,
    el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: run }, 'Reikna'),
      el('button', { class: 'btn ghost', onclick: randomProblem }, 'Fá dæmi af handahófi')),
    out);
}

// Æfing í skrefum
function practiceView(c, presetExpr) {
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
    newProblem({ prompt: 'Einfaldaðu eins og hægt er:', expr: own.getValue(), node: r.node });
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
    const done = () => lines.length && isFinalForm(current()) && polyEqual(expand(current()), expand(start));
    const startFinal = isFinalForm(start);

    const work = el('ol', { class: 'steps work' });
    const msg = el('p', { class: 'msg', 'aria-live': 'polite' });
    const ed = createEditor({ placeholder: 'Skrifaðu næsta skref', onEnter: () => check() });

    const draw = () => {
      work.innerHTML = '';
      for (const l of lines) {
        work.append(el('li', { class: 'step ' + (l.shown ? 'shown' : 'ok') },
          el('div', { class: 'step-math' }, el('span', { class: 'eq' }, '='), math(l.tex), el('span', { class: 'mark' }, l.shown ? 'sýnt' : '✓')),
          l.why ? el('div', { class: 'step-why' }, l.why) : null));
      }
    };

    const finish = () => {
      const usedHelp = lines.some((l) => l.shown);
      if (!usedHelp) solved++;
      updateStats();
      msg.className = 'msg good';
      msg.textContent = usedHelp ? 'Komið! Reyndu næst að klára án hjálpar.' : 'Vel gert! Þetta er fullstytt og rétt.';
      inputBox.hidden = true;
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
      if (isFinalForm(r.node)) { finish(); return; }
      msg.className = 'msg good';
      msg.textContent = 'Rétt! Haltu áfram.';
      ed.focus();
    };

    const hint = () => {
      const s = nextStep(current());
      msg.className = 'msg info';
      msg.textContent = s ? 'Vísbending: ' + explain(s.kinds).join(' ') : 'Þetta er fullstytt.';
    };

    const showNext = () => {
      const s = nextStep(current());
      if (!s) return;
      lines.push({ node: s.node, tex: s.tex, shown: true, why: explain(s.kinds).join(' ') });
      draw();
      msg.textContent = '';
      if (isFinalForm(s.node)) finish();
    };

    const showAll = () => {
      let s;
      while ((s = nextStep(current()))) lines.push({ node: s.node, tex: s.tex, shown: true, why: explain(s.kinds).join(' ') });
      draw();
      finish();
    };

    const inputBox = el('div', { class: 'panel' },
      el('p', { class: 'help' }, startFinal
        ? 'Er hægt að einfalda þetta? Ef ekki, skrifaðu stæðuna óbreytta.'
        : 'Skrifaðu næsta skref (eða fleiri skref í einu) og ýttu á Enter. Þú mátt sleppa skrefum ef þú treystir þér.'),
      ed.root,
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: check }, 'Athuga'),
        el('button', { class: 'btn ghost', onclick: hint }, 'Vísbending'),
        el('button', { class: 'btn ghost', onclick: showNext }, 'Sýna næsta skref'),
        el('button', { class: 'btn ghost', onclick: showAll }, 'Sýna lausn')));
    const after = el('div', { class: 'row', hidden: true },
      el('button', { class: 'btn', onclick: () => newProblem(generate(c.id, level)) }, 'Nýtt dæmi →'));

    area.append(el('section', { class: 'example' }, problemHeader(problem), work), inputBox, msg, after);
    draw();
    if (done()) finish();
    setTimeout(() => ed.focus(), 50);
  }

  root.append(controls, area);
  if (presetExpr) {
    const r = tryParse(presetExpr);
    if (!r.error) newProblem({ prompt: 'Einfaldaðu eins og hægt er:', expr: presetExpr, node: r.node });
  }
  return root;
}

// ---------- Prófæfing ----------

function gradeAnswer(p, src) {
  const start = parse(p.expr);
  if (!src.trim()) return { ok: false, text: 'Ekkert svar.' };
  const r = tryParse(src);
  if (r.error) return { ok: false, text: r.error };
  if (!polyEqual(expand(r.node), expand(start))) return { ok: false, text: 'Rangt. ' + diagnose(start, r.node) };
  if (!isFinalForm(r.node)) return { ok: false, text: 'Jafngilt, en ekki fullstytt. Kláraðu að einfalda.' };
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

    let idx = 0, results = null;
    const items = qs.map((p) => ({ p, ed: createEditor({ placeholder: 'Svar', onEnter: () => go(idx + 1) }) }));
    const answered = (i) => !!items[i].ed.getValue().trim();

    const view = el('div', {});
    setup.hidden = true;

    function go(i) {
      idx = Math.max(0, Math.min(items.length - 1, i));
      render();
    }

    function render() {
      const it = items[idx];
      view.innerHTML = '';
      const cls = (i) => (results ? (results[i].ok ? 'right' : 'wrong') : answered(i) ? 'done' : '');
      const head = el('div', { class: 'row exam-head' },
        el('b', {}, results ? 'Yfirferð' : `Dæmi ${idx + 1} af ${items.length}`),
        results ? el('span', { class: 'score' }, `${results.filter((r) => r.ok).length} / ${items.length} rétt`) : null,
        clock);
      const card = el('section', { class: 'example q' + (results ? (results[idx].ok ? ' right' : ' wrong') : '') },
        el('h2', {}, `${idx + 1}.`, el('span', { class: 'chip' }, it.p.chapter)),
        problemHeader(it.p));
      if (!results) {
        card.append(el('p', { class: 'help' }, 'Svar (fullstytt). Ýttu á Enter til að fara í næsta dæmi.'), it.ed.root);
      } else {
        const r = results[idx];
        const ans = it.ed.getValue().trim();
        card.append(
          el('div', { class: 'your-answer' }, 'Þitt svar: ', ans ? math(tryParse(ans).node ? toTex(tryParse(ans).node) : ans) : el('i', {}, 'ekkert')),
          el('p', { class: 'msg ' + (r.ok ? 'good' : 'bad') }, r.text),
          el('h3', {}, 'Lausn skref fyrir skref'),
          stepper(parse(it.p.expr)));
      }
      const actions = el('div', { class: 'row' });
      if (!results) {
        actions.append(el('button', { class: 'btn big', onclick: submit }, 'Skila prófi'));
      } else {
        actions.append(el('button', { class: 'btn', onclick: () => { results = null; setup.hidden = false; testArea.innerHTML = ''; setup.scrollIntoView(); } }, 'Nýtt próf'));
      }
      view.append(head, pager(items.length, idx, go, cls), card, actions);
      if (!results) setTimeout(() => it.ed.focus(), 30);
    }

    function submit() {
      const missing = items.filter((_, i) => !answered(i)).length;
      if (missing && !confirm(`Þú átt eftir að svara ${missing} ${missing === 1 ? 'dæmi' : 'dæmum'}. Viltu skila samt?`)) return;
      clearInterval(timer);
      results = items.map((it) => gradeAnswer(it.p, it.ed.getValue()));
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
