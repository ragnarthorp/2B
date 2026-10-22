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
  const wrap = el('div', {});
  wrap.append(el('section', { class: 'theory', html: richHtml(c.intro) }));
  c.examples.forEach((ex, i) => {
    const node = parse(ex.expr);
    const solution = el('div', { class: 'solution' }, stepsView(node, { showStart: false }));
    wrap.append(el('section', { class: 'example' },
      el('h2', {}, `Sýnidæmi ${i + 1}`),
      problemHeader({ prompt: ex.prompt || 'Einfaldaðu eins og hægt er:', expr: ex.expr, figure: ex.figure }),
      solution,
      ex.note ? el('p', { class: 'tip' }, el('b', {}, 'Athugið: '), ex.note) : null,
      el('a', { class: 'btn ghost', href: `#/kafli/${c.id}/aefing/${encodeURIComponent(ex.expr)}` }, 'Reikna þetta sjálf/ur í skrefum →')));
  });
  return wrap;
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
  return el('section', { class: 'panel' },
    el('p', {}, c ? 'Skrifaðu inn þitt eigið dæmi. Reiknivélin einfaldar það og sýnir hvert skref.' : 'Skrifaðu inn dæmi með liðastærðum. Reiknivélin einfaldar það og sýnir hvert skref.'),
    ed.root,
    el('div', { class: 'row' }, el('button', { class: 'btn', onclick: run }, 'Reikna')),
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

function examView() {
  const selected = new Set(CHAPTERS.map((c) => c.id));
  let count = 10, level = 0;
  const root = el('div', { class: 'page' }, el('h1', {}, 'Prófæfing'));
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
    el('p', { class: 'msg bad', id: 'exam-msg' }));
  const testArea = el('div', {});
  root.append(setup, testArea);

  let timer;
  function start() {
    if (!selected.size) { setup.querySelector('#exam-msg').textContent = 'Veldu að minnsta kosti einn kafla.'; return; }
    setup.querySelector('#exam-msg').textContent = '';
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
    // Röðum eftir erfiðleika þegar blandað er
    if (!level) qs.sort((a, b) => a.level - b.level);
    const t0 = Date.now();
    const clock = el('span', { class: 'stats' });
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      clock.textContent = `Tími: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 1000);

    const items = qs.map((p, i) => {
      const ed = createEditor({ placeholder: 'Svar', compact: true });
      const res = el('div', { class: 'result' });
      const box = el('section', { class: 'example q' },
        el('h2', {}, `${i + 1}.`, el('span', { class: 'chip' }, p.chapter)),
        problemHeader(p),
        el('p', { class: 'help' }, 'Svar (fullstytt):'),
        ed.root, res);
      return { p, ed, res, box };
    });

    const submit = () => {
      clearInterval(timer);
      let score = 0;
      for (const it of items) {
        it.res.innerHTML = '';
        const start = parse(it.p.expr);
        const r = tryParse(it.ed.getValue());
        let ok = false, text;
        if (!it.ed.getValue().trim()) text = 'Ekkert svar.';
        else if (r.error) text = r.error;
        else if (!polyEqual(expand(r.node), expand(start))) text = 'Rangt. ' + diagnose(start, r.node);
        else if (!isFinalForm(r.node)) text = 'Jafngilt, en ekki fullstytt. Kláraðu að einfalda.';
        else { ok = true; text = 'Rétt!'; }
        if (ok) score++;
        it.box.classList.toggle('right', ok);
        it.box.classList.toggle('wrong', !ok);
        const sol = el('details', { class: 'sol' }, el('summary', {}, 'Sýna lausn'), stepsView(start, { showStart: false }));
        it.res.append(el('p', { class: 'msg ' + (ok ? 'good' : 'bad') }, text), sol);
      }
      summary.innerHTML = '';
      const pct = Math.round((100 * score) / items.length);
      summary.append(el('div', { class: 'score' }, el('b', {}, `${score} / ${items.length}`), ` rétt (${pct}%). ${clock.textContent}`),
        el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => start() }, 'Nýtt próf')));
      summary.scrollIntoView({ behavior: 'smooth' });
    };

    const summary = el('div', { class: 'panel summary' });
    testArea.innerHTML = '';
    testArea.append(el('div', { class: 'row sticky' }, clock),
      ...items.map((it) => it.box),
      el('div', { class: 'row' }, el('button', { class: 'btn big', onclick: submit }, 'Skila prófi')),
      summary);
    testArea.scrollIntoView({ behavior: 'smooth' });
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
