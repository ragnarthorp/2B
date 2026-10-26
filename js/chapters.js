// Efni kaflanna. Nýr kafli: bæta við hlut hér og dæmaframleiðanda í generators.js.

export const CHAPTERS = [
  {
    id: '1.1',
    title: 'Samlagning liðastærða',
    intro: `
      <p>Í <b>liðastærð</b> eru <b>liðir</b> tengdir saman með plús og mínus. Í liðnum $$-3x^2y$$ er <b>stuðullinn</b> $$-3$$ og <b>breytuhlutinn</b> $$x^2y$$.</p>
      <p><b>Líkir liðir</b> hafa nákvæmlega sömu breytur í sömu veldum. Til dæmis eru $$2x^2y$$ og $$-yx^2$$ líkir liðir (röð breytanna skiptir ekki máli), en $$x^2y$$ og $$xy^2$$ eru það ekki.</p>
      <ul>
        <li>Við <b>leggjum saman líka liði</b> með því að leggja saman stuðlana: $$5x+3x=8x$$.</li>
        <li>Þegar <b>einliðir eru margfaldaðir</b> margföldum við tölurnar saman og leggjum saman veldisvísa sömu breytu: $$2x\\cdot 3x=6x^2$$.</li>
        <li><b>Mínus fyrir framan sviga</b> breytir formerki allra liða í svigunum: $$-(x-3)=-x+3$$.</li>
      </ul>`,
    examples: [
      { expr: '-2·(-3x)·x', note: 'Mínus sinnum mínus gefur plús og x·x = x².' },
      { expr: 'x·2·y·x·y·3', note: 'Röð þáttanna skiptir ekki máli í margföldun, svo við getum safnað tölunum saman og breytunum saman.' },
      {
        prompt: 'Rétthyrningur hefur breiddina x+1 og lengdina 2x−3. Finndu ummálið og einfaldaðu.',
        figure: { type: 'rect', w: 'x + 1', l: '2x - 3' },
        expr: '(x+1)+(2x-3)+(x+1)+(2x-3)',
        note: 'Ummálið er summa allra fjögurra hliðanna.',
      },
      { expr: '2x^2y-yx^2+4xy^2-3y^2x', note: 'yx² er sami breytuhluti og x²y, en x²y og xy² eru ekki líkir liðir.' },
      { expr: '3x-2y+5-x+4y-7+2x-y', note: 'Gott ráð: strikaðu undir líka liði í sama lit áður en þú tekur þá saman.' },
      { expr: '-a-(-2a)-2', note: 'Mínus fyrir framan (−2a) gefur +2a.' },
      { expr: '2a(a-3ab)-a^2b-3a^2' },
      { expr: '2x(3x-2)-5+2(5+x(83-x))', note: 'Byrjaðu á innstu svigunum og vinndu þig út.' },
    ],
  },
  {
    id: '2.1',
    title: 'Margföldun liðastærða',
    intro: `
      <p>Þegar liðastærð er margfölduð með liðastærð er <b>hver liður í fyrri svigunum margfaldaður með hverjum lið í seinni svigunum</b>. Síðan eru líkir liðir teknir saman.</p>
      <ul>
        <li>$$a(b+c)=ab+ac$$</li>
        <li>$$(a+b)(c+d)=ac+ad+bc+bd$$</li>
        <li>$$(a+b)^2=(a+b)(a+b)=a^2+2ab+b^2$$</li>
        <li>$$(a-b)^2=(a-b)(a-b)=a^2-2ab+b^2$$</li>
      </ul>
      <p><b>Varúð:</b> $$(x-5)^2$$ er <b>ekki</b> $$x^2-25$$. Þegar mínus stendur fyrir framan margfeldi, t.d. $$-(x-1)(x+2)$$, er best að margfalda fyrst saman inni í sviga og leysa svo upp svigann.</p>`,
    examples: [
      { expr: '2x(x+3)' },
      { expr: '4-3(x-2)', note: 'Mínusinn fylgir 3-unni: −3·x = −3x og −3·(−2) = +6.' },
      { expr: '3a^2b^3(2ab^2+3a^2b)', note: 'a²·a = a³ og b³·b² = b⁵.' },
      { expr: '2y-(x-1)(x+2-y)', note: 'Margföldum fyrst svigana saman og höfum margfeldið í sviga. Þá leysum við upp svigann með mínusnum.' },
      { expr: '(x-5)^2' },
      { expr: '(2x-3y)^2' },
      { expr: '2x-3y^2', note: 'Hér er ekkert hægt að gera: 2x og −3y² eru ekki líkir liðir og engir svigar.' },
      { expr: '(x-5)^2-(10-4x)' },
      { expr: 'a^2-(a-2)(a+3)' },
      { expr: '-(a+1)^2-(a-1)^2' },
      { expr: 'xy(y-1+x)' },
      { expr: 'a(a-b)-b(a-b)' },
      { expr: '2x(xy+3)+y(2-2x^2)-6x' },
      { expr: '-(a+3)(b-2)-(-a-1)^3', note: 'Veldið 3 þýðir að svigann á að margfalda þrisvar sinnum með sjálfum sér.' },
    ],
  },
  {
    id: '3.1',
    title: 'Þáttun',
    mode: 'factor',
    intro: `
      <p><b>Að þátta</b> er að skrifa stæðu sem <b>margfeldi</b>. Það er öfugt við að margfalda upp úr svigum: $$3x(2x+3)=6x^2+9x$$ er margföldun, en $$6x^2+9x=3x(2x+3)$$ er þáttun.</p>
      <ol class="method-list">
        <li><b>Liðir eru búnir til úr þáttum.</b> Hvern lið má skrifa sem margfeldi frumþátta: $$12x^2y=2\\cdot2\\cdot3\\cdot x\\cdot x\\cdot y$$.</li>
        <li><b>Sameiginlegur þáttur út fyrir sviga.</b> Finndu þættina sem <b>allir</b> liðirnir eiga sameiginlega og taktu þá út fyrir sviga: $$6x^2+9x=3x(2x+3)$$. Byrjaðu <b>alltaf</b> á þessu.</li>
        <li><b>Samokareglan.</b> Tveir ferningar með mínus á milli: $$a^2-b^2=(a+b)(a-b)$$, t.d. $$x^2-9=(x+3)(x-3)$$.</li>
        <li><b>Ágiskunarreglan.</b> $$x^2+bx+c=(x+p)(x+q)$$ þar sem $$p\\cdot q=c$$ og $$p+q=b$$, t.d. $$x^2+5x+6=(x+2)(x+3)$$ því $$2\\cdot3=6$$ og $$2+3=5$$.</li>
        <li><b>Fleiri en ein aðferð.</b> Eftir hvert skref athugarðu hvort hægt sé að þátta svigana enn frekar: $$2x^2-18=2(x^2-9)=2(x+3)(x-3)$$.</li>
      </ol>
      <p><b>Prófun:</b> Margfaldaðu svarið út. Þá áttu að fá upphaflegu stæðuna.</p>`,
    examples: [
      { section: 'Liðir eru búnir til úr þáttum', prompt: 'Skrifaðu liðinn sem margfeldi frumþátta:', expr: '12x^2y', noPractice: true,
        note: 'Tölurnar eru brotnar í frumtölur og veldin skrifuð sem endurtekin margföldun.' },
      { section: 'Liðir eru búnir til úr þáttum', prompt: 'Finndu sameiginlegan þátt liðanna og þáttaðu:', expr: '12x^2y+18xy^2',
        note: 'Sameiginlegi þátturinn er margfeldi þáttanna sem eru litaðir í öllum liðunum.' },
      { section: 'Sameiginlegur þáttur', expr: '6x^2+9x', note: 'Prófun: 3x·2x + 3x·3 = 6x² + 9x.' },
      { section: 'Sameiginlegur þáttur', expr: '4a^2b-6ab^2+2ab',
        note: 'Þegar heill liður er sameiginlegi þátturinn verður 1 eftir í sviganum: 2ab = 2ab·1.' },
      { section: 'Sameiginlegur þáttur', expr: '-2x^2+8x', note: 'Ef fremsti liðurinn er neikvæður er venjan að taka mínusinn út líka.' },
      { section: 'Samokaregla', expr: 'x^2-9' },
      { section: 'Samokaregla', expr: '4x^2-25y^2', note: 'Stuðullinn fer líka í ferninginn: 4x² = (2x)².' },
      { section: 'Samokaregla', expr: '9-a^2' },
      { section: 'Ágiskunarregla', expr: 'x^2+5x+6' },
      { section: 'Ágiskunarregla', expr: 'x^2-x-12', note: 'Aftasti liðurinn er neikvæður, svo önnur talan er jákvæð og hin neikvæð.' },
      { section: 'Ágiskunarregla', expr: 'x^2-6x+9', note: 'Sami svigi tvisvar: þetta er ferningsreglan öfug, (x − 3)² = x² − 6x + 9.' },
      { section: 'Ágiskunarregla', expr: 'x^2+2xy-15y^2', note: 'Virkar eins með tveimur breytum: y fylgir tölunum.' },
      { section: 'Ágiskunarregla', expr: '2x^2+7x+3', note: 'Þegar stuðull er fyrir framan x² þarf að prófa sig áfram. Margfaldaðu út til að athuga miðliðinn.' },
      { section: 'Fleiri en ein aðferð', expr: '2x^2-18', note: 'Fyrst sameiginlegur þáttur, svo samokaregla.' },
      { section: 'Fleiri en ein aðferð', expr: '3x^2+15x+18', note: 'Fyrst sameiginlegur þáttur, svo ágiskunarregla.' },
      { section: 'Fleiri en ein aðferð', expr: 'x^3-x' },
      { section: 'Fleiri en ein aðferð', expr: '5x^3-20x^2+20x' },
      { section: 'Fleiri en ein aðferð', expr: 'x^4-16', note: 'Samokareglan tvisvar. x² + 4 er ekki hægt að þátta því þar er plús á milli ferninganna.' },
      { section: 'Fleiri en ein aðferð', expr: 'a^4-13a^2+36', note: 'Ágiskun með a² í stað x og síðan samokaregla á báða svigana.' },
    ],
  },
];

export const chapterById = (id) => CHAPTERS.find((c) => c.id === id);
