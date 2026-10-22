// Glósublað fyrir próf úr köflum 1.1 og 2.1. Stærðfræði innan $$...$$ er birt með richHtml.

import { el, richHtml } from './ui.js';

const C = { x: '#4dabf7', y: '#ffd43b', c: '#69db7c', xy: '#ff8cc6', o: '#ff9f43', t: '#2ee6c5' };
const col = (c, tex) => `\\textcolor{${c}}{${tex}}`;

// Kassaaðferð: (x + 2y − 1)(2x − y + 3)
const BOX = (() => {
  const rows = ['x', '2y', '-1'];
  const cols = ['2x', '-y', '+3'];
  const cells = [
    [['2x^2', C.o], ['-xy', C.xy], ['3x', C.x]],
    [['4xy', C.xy], ['-2y^2', C.t], ['6y', C.y]],
    [['-2x', C.x], ['y', C.y], ['-3', C.c]],
  ];
  const m = (t) => `$$${t}$$`;
  return `
  <table class="box-table">
    <tr><th class="corner">·</th>${cols.map((c) => `<th>${m(c)}</th>`).join('')}</tr>
    ${rows.map((r, i) => `<tr><th>${m(r)}</th>${cells[i].map(([t, c]) => `<td>${m(col(c, t))}</td>`).join('')}</tr>`).join('')}
  </table>`;
})();

const HTML = `
<section class="note-card intro-card">
  <p><b>Á prófinu þarftu að geta einfaldað stæður eins og:</b></p>
  <p class="big">$$3x-2y+5-x+4y-7$$ $$-2(-3x)\\cdot x$$ $$4-3(x-2)$$ $$(x-5)^2$$ $$(x+2y-1)(2x-y+3)$$</p>
  <p>„Einfalda eins og hægt er“ þýðir: <b>engir svigar eftir</b>, <b>ekkert ómargfaldað</b> og <b>engir líkir liðir eftir</b>.</p>
</section>

<section class="note-card">
  <h2><span class="n">1</span> Orðin sem þú þarft að kunna</h2>
  <table class="words">
    <tr><td><b>Liður</b></td><td>Hlutur sem er aðskilinn með + eða −. Í $$3x^2-5x+7$$ eru þrír liðir: $$3x^2$$, $$-5x$$ og $$7$$.</td></tr>
    <tr><td><b>Stuðull</b></td><td>Talan fremst í liðnum, <b>með formerkinu</b>. Í $$-5x$$ er stuðullinn $$-5$$.</td></tr>
    <tr><td><b>Breytuhluti</b></td><td>Stafirnir og veldin. Í $$-5x^2y$$ er breytuhlutinn $$x^2y$$.</td></tr>
    <tr><td><b>Veldisvísir</b></td><td>Litla talan uppi. Í $$x^3$$ er veldisvísirinn 3. Ef enginn stendur er hann 1: $$x=x^1$$.</td></tr>
    <tr><td><b>Liðastærð</b></td><td>Summa af liðum, t.d. $$2x^2-3x+1$$.</td></tr>
  </table>
  <p class="tip-line">Ósýnilegir stafir: $$x$$ þýðir $$1x$$ og $$-x$$ þýðir $$-1x$$.</p>
</section>

<section class="note-card">
  <h2><span class="n">2</span> Líkir liðir</h2>
  <p><b>Líkir liðir</b> hafa <b>nákvæmlega sömu stafi í nákvæmlega sömu veldum</b>. Talan fyrir framan skiptir ekki máli og ekki heldur röð stafanna.</p>
  <div class="two-col">
    <div class="yes"><h3>✓ Líkir</h3>
      <p>$$3x$$ og $$-7x$$</p>
      <p>$$2x^2y$$ og $$-yx^2$$ <small>(röðin skiptir ekki máli)</small></p>
      <p>$$5$$ og $$-3$$ <small>(fastar tölur)</small></p>
    </div>
    <div class="no"><h3>✗ Ekki líkir</h3>
      <p>$$x$$ og $$x^2$$ <small>(ólík veldi)</small></p>
      <p>$$x^2y$$ og $$xy^2$$ <small>(veldin á ólíkum stöfum)</small></p>
      <p>$$3x$$ og $$3y$$ <small>(ólíkir stafir)</small></p>
    </div>
  </div>
  <p><b>Ráð:</b> Litaðu líka liði í sama lit <b>áður</b> en þú byrjar. Taktu formerkið fyrir framan liðinn með:</p>
  <p class="big">$$${col(C.x, '3x')}${col(C.y, '-2y')}${col(C.c, '+5')}${col(C.x, '-x')}${col(C.y, '+4y')}${col(C.c, '-7')}$$</p>
</section>

<section class="note-card">
  <h2><span class="n">3</span> Að taka saman líka liði</h2>
  <p>Leggðu saman <b>stuðlana</b>. Breytuhlutinn <b>helst óbreyttur</b>.</p>
  <p class="big">$$5x+3x=8x$$ $$4y-y=3y$$ $$-6xy-6xy=-12xy$$ $$2x-2x=0$$</p>
  <p class="warn">⚠ Veldin breytast <b>ekki</b> við samlagningu: $$x^2+x^2=2x^2$$, <b>ekki</b> $$x^4$$.</p>
  <p class="warn">⚠ Ólíka liði er <b>ekki</b> hægt að leggja saman: $$2x-3y^2$$ er fullstytt.</p>
  <p><b>Dæmi:</b> $$3x-2y+5-x+4y-7=\\underbrace{3x-x}_{2x}\\;\\underbrace{-2y+4y}_{+2y}\\;\\underbrace{+5-7}_{-2}=2x+2y-2$$</p>
</section>

<section class="note-card">
  <h2><span class="n">4</span> Formerkjareglur við margföldun</h2>
  <table class="signs">
    <tr><td>$$(+)\\cdot(+)=+$$</td><td>$$(-)\\cdot(-)=+$$</td></tr>
    <tr><td>$$(+)\\cdot(-)=-$$</td><td>$$(-)\\cdot(+)=-$$</td></tr>
  </table>
  <p><b>Teldu mínusana:</b> slétt tala af mínusum (2, 4, …) gefur <b>plús</b>, oddatala (1, 3, …) gefur <b>mínus</b>.</p>
  <p>$$(-2)\\cdot(-3)=6$$ &nbsp; (2 mínusar) $$(-2)\\cdot(-2)\\cdot(-2)=-8$$ &nbsp; (3 mínusar)</p>
</section>

<section class="note-card">
  <h2><span class="n">5</span> Að margfalda einliður</h2>
  <ol class="steps-list">
    <li><b>Formerkið</b>: teldu mínusana.</li>
    <li><b>Tölurnar</b>: margfaldaðu þær saman.</li>
    <li><b>Sömu stafir</b>: <b>leggðu saman veldisvísana</b>: $$x^a\\cdot x^b=x^{a+b}$$</li>
  </ol>
  <p class="big">$$x\\cdot x=x^2$$ $$a^2\\cdot a=a^3$$ $$x^2\\cdot x^3=x^5$$ $$b^3\\cdot b^2=b^5$$</p>
  <p><b>Dæmi:</b> $$-2\\cdot(-3x)\\cdot x=(-2)\\cdot(-3)\\cdot x\\cdot x=6x^2$$</p>
  <p><b>Dæmi:</b> $$3a^2b^3\\cdot 2ab^2=3\\cdot2\\cdot a^2\\cdot a\\cdot b^3\\cdot b^2=6a^3b^5$$</p>
  <p class="warn">⚠ Ekki rugla saman: <b>margföldun</b> $$x\\cdot x=x^2$$, en <b>samlagning</b> $$x+x=2x$$.</p>
</section>

<section class="note-card">
  <h2><span class="n">6</span> Svigar með plús eða mínus fyrir framan</h2>
  <div class="two-col">
    <div><h3>Plús fyrir framan</h3><p>Svigarnir hverfa, <b>ekkert breytist</b>.</p><p>$$+(x-1)=x-1$$</p></div>
    <div><h3>Mínus fyrir framan</h3><p>Svigarnir hverfa og <b>öll formerki inni snúast við</b>.</p><p>$$-(2x-5)=-2x+5$$</p><p>$$-(-2a)=+2a$$</p></div>
  </div>
  <p><b>Dæmi:</b> $$3x-(2x-5)+(x-1)=3x-2x+5+x-1=2x+4$$</p>
  <p class="warn">⚠ Algengasta villan: að gleyma að snúa við formerki <b>síðasta</b> liðarins í svigunum.</p>
</section>

<section class="note-card">
  <h2><span class="n">7</span> Að margfalda inn í sviga</h2>
  <p>Talan eða liðurinn fyrir framan margfaldast við <b>hvern einasta lið</b> inni í svigunum. Taktu formerkið með!</p>
  <p class="big">$$${col(C.o, 'a')}(b+c)=${col(C.o, 'a')}b+${col(C.o, 'a')}c$$</p>
  <p>$$${col(C.o, '2x')}(x+3)=${col(C.o, '2x')}\\cdot x+${col(C.o, '2x')}\\cdot3=2x^2+6x$$</p>
  <p>$$4${col(C.o, '-3')}(x-2)=4${col(C.o, '-3')}\\cdot x${col(C.o, '-3')}\\cdot(-2)=4-3x+6=-3x+10$$</p>
  <p class="warn">⚠ $$-3(x-2)$$: mínusinn fylgir 3-unni. $$(-3)\\cdot(-2)=+6$$, ekki $$-6$$.</p>
  <p><b>Innstu svigarnir fyrst</b> ef svigar eru inni í svigum: $$2(5+x(83-x))=2(5+83x-x^2)=10+166x-2x^2$$</p>
</section>

<section class="note-card">
  <h2><span class="n">8</span> Svigi sinnum svigi</h2>
  <p><b>Hver liður í fyrri svigunum</b> margfaldast við <b>hvern lið í seinni svigunum</b>.</p>
  <p class="big">$$(${col(C.o, 'a')}+${col(C.t, 'b')})(c+d)=${col(C.o, 'a')}c+${col(C.o, 'a')}d+${col(C.t, 'b')}c+${col(C.t, 'b')}d$$</p>
  <table class="count">
    <tr><th>Liðir í sviga</th><th>Fjöldi margfelda</th></tr>
    <tr><td>2 og 2</td><td>2 · 2 = <b>4</b></td></tr>
    <tr><td>2 og 3</td><td>2 · 3 = <b>6</b></td></tr>
    <tr><td>3 og 3</td><td>3 · 3 = <b>9</b></td></tr>
  </table>
  <p><b>Teldu margfeldin</b> áður en þú tekur saman. Ef þú færð færri en 9 í 3·3 dæmi hefurðu gleymt einhverju.</p>

  <h3>Þrír liðir sinnum þrír liðir: kassaaðferðin</h3>
  <p>$$(x+2y-1)(2x-y+3)$$</p>
  <p>Skrifaðu liði fyrri svigans <b>niður til vinstri</b> og liði seinni svigans <b>yfir efst</b>, með formerkjum. Margfaldaðu línu sinnum dálk í hvern reit:</p>
  ${BOX}
  <p>Taktu svo saman reitina sem eru <b>í sama lit</b> (líkir liðir):</p>
  <p class="big">$$2x^2\\;${col(C.xy, '-xy+4xy')}\\;-2y^2\\;${col(C.x, '+3x-2x')}\\;${col(C.y, '+6y+y')}\\;-3$$</p>
  <p class="big">$$=2x^2+3xy-2y^2+x+7y-3$$</p>
  <p><b>Röðin skiptir ekki máli</b> ef þú ferð kerfisbundið: fyrst allt með fyrsta liðnum, svo allt með öðrum, svo allt með þriðja.</p>
</section>

<section class="note-card">
  <h2><span class="n">9</span> Veldi af sviga og ferningsreglur</h2>
  <p>Veldi þýðir að svigann á að margfalda með sjálfum sér: $$(x-5)^2=(x-5)(x-5)$$, $$(a+1)^3=(a+1)(a+1)(a+1)$$</p>
  <table class="rules">
    <tr><td>$$(a+b)^2=a^2+2ab+b^2$$</td></tr>
    <tr><td>$$(a-b)^2=a^2-2ab+b^2$$</td></tr>
    <tr><td>$$(a+b)(a-b)=a^2-b^2$$</td></tr>
  </table>
  <p class="big">$$(x-5)^2=x^2-10x+25$$ $$(2a+b)^2=4a^2+4ab+b^2$$ $$(x+3)(x-3)=x^2-9$$</p>
  <p class="warn">⚠ $$(x-5)^2$$ er <b>ekki</b> $$x^2-25$$. Miðliðurinn $$-10x$$ gleymist oft!</p>
  <p class="warn">⚠ $$(2a)^2=4a^2$$: talan fer líka í veldi.</p>
</section>

<section class="note-card">
  <h2><span class="n">10</span> Mínus fyrir framan margfeldi af svigum</h2>
  <p>Margfaldaðu fyrst svigana saman og <b>hafðu útkomuna í sviga</b>. Leystu svo upp svigann með mínusnum.</p>
  <p>$$-(x-1)(x+2)=-(x^2+2x-x-2)=-(x^2+x-2)=-x^2-x+2$$</p>
  <p>$$a^2-(a-2)(a+3)=a^2-(a^2+a-6)=a^2-a^2-a+6=-a+6$$</p>
</section>

<section class="note-card recipe">
  <h2><span class="n">★</span> Vinnuröðin, skref fyrir skref</h2>
  <ol class="steps-list">
    <li><b>Veldi af sviga</b>: skrifaðu sem margfeldi.</li>
    <li><b>Innstu svigarnir</b> fyrst.</li>
    <li><b>Margfaldaðu inn í sviga</b>: hver liður með hverjum lið, formerkið með.</li>
    <li><b>Einfaldaðu hvert margfeldi</b>: formerki, tölur, veldi.</li>
    <li><b>Leystu upp sviga</b>. Mínus fyrir framan snýr við öllum formerkjum.</li>
    <li><b>Litaðu líka liði</b> og <b>taktu þá saman</b>.</li>
    <li><b>Raðaðu</b> svarinu, hæsta veldi fyrst (ekki skylda en snyrtilegt).</li>
    <li><b>Athugaðu</b>: eru engir svigar og engir líkir liðir eftir?</li>
  </ol>
</section>

<section class="note-card">
  <h2><span class="n">!</span> Algengar villur</h2>
  <table class="errors">
    <tr><th>Rangt</th><th>Rétt</th></tr>
    <tr><td>$$-(x-3)=-x-3$$</td><td>$$-(x-3)=-x+3$$</td></tr>
    <tr><td>$$-3(x-2)=-3x-6$$</td><td>$$-3(x-2)=-3x+6$$</td></tr>
    <tr><td>$$x\\cdot x=2x$$</td><td>$$x\\cdot x=x^2$$</td></tr>
    <tr><td>$$x^2+x^2=x^4$$</td><td>$$x^2+x^2=2x^2$$</td></tr>
    <tr><td>$$x^2\\cdot x^3=x^6$$</td><td>$$x^2\\cdot x^3=x^5$$</td></tr>
    <tr><td>$$(x-5)^2=x^2-25$$</td><td>$$(x-5)^2=x^2-10x+25$$</td></tr>
    <tr><td>$$2x+3y=5xy$$</td><td>$$2x+3y$$ (ekki hægt að einfalda)</td></tr>
    <tr><td>$$(x+1)(x+2)=x^2+2$$</td><td>$$(x+1)(x+2)=x^2+3x+2$$</td></tr>
  </table>
</section>
`;

const SELF_TEST = [
  ['x^2y-3xy^2+2yx^2+xy^2', '3x^2y-2xy^2'],
  ['-3a(2a-b)+a(a+4b)', '-5a^2+7ab'],
  ['(2a+b)^2', '4a^2+4ab+b^2'],
  ['(3x-2)(x^2+x-4)', '3x^3+x^2-14x+8'],
  ['(a+b-2)(a-b+2)', 'a^2-b^2+4b-4'],
];

export function notesView() {
  const test = el('section', { class: 'note-card' },
    el('h2', {}, el('span', { class: 'n' }, '?'), ' Prófaðu þig'),
    el('p', {}, 'Reiknaðu sjálf/ur og smelltu svo til að sjá svarið. Í æfingunni á vefnum geturðu reiknað þau í skrefum.'),
    el('ol', { class: 'self-test' }, SELF_TEST.map(([q, a]) => el('li', {},
      el('span', { html: richHtml(`$$${q.replace(/\^(\d)/g, '^{$1}')}$$`) }),
      el('details', {}, el('summary', {}, 'Svar'), el('span', { html: richHtml(`$$=${a.replace(/\^(\d)/g, '^{$1}')}$$`) }))))));
  return el('div', { class: 'page notes' },
    el('div', { class: 'row notes-head' },
      el('h1', {}, 'Glósur fyrir prófið'),
      el('button', { class: 'btn ghost no-print', onclick: () => window.print() }, '🖨 Prenta')),
    el('p', { class: 'lead' }, 'Allt sem þú þarft að kunna úr 1.1 Samlagning liðastærða og 2.1 Margföldun liðastærða.'),
    el('div', { html: richHtml(HTML) }),
    test);
}
