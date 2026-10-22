# Stærðfræði 2B

Kennsluvefur í stærðfræði. Hver kafli inniheldur:

- **Sýnidæmi**, eitt í einu. Lausnin birtist eitt skref í einu með útskýringu, og líkir liðir eru litaðir eins áður en þeir eru teknir saman. Hægt er að búa til ný sýnidæmi af handahófi.
- **Reiknivél** þar sem nemandi skrifar inn eigið dæmi og fær lausnina í skrefum.
- **Æfingu** þar sem nemandi fær dæmi (létt, miðlungs, erfitt eða blandað) eða skrifar sitt eigið og reiknar það sjálfur skref fyrir skref. Hvert skref er yfirfarið og hægt er að fá vísbendingu, sjá næsta skref eða alla lausnina.

Auk þess er **prófæfing**: nemandi hakar við kafla, velur fjölda dæma og erfiðleikastig og svarar einu dæmi í einu. Eftir skil fær hann einkunn og getur farið yfir hvert dæmi og séð lausnina skref fyrir skref.

Kaflar sem eru komnir:

| Kafli | Efni |
|---|---|
| 1.1 | Samlagning liðastærða |
| 2.1 | Margföldun liðastærða |

## Ritillinn

Stærðfræðiritillinn er [MathLive](https://mathlive.io) (MIT-leyfi) og er geymdur í `vendor/mathlive`, svo vefurinn þarf ekki að sækja neitt annað. Hnappar fyrir ofan reitinn setja inn sviga, veldi og margföldunarmerki. Á snertiskjá birtist stærðfræðilyklaborð.

Líka má skrifa venjulegan texta, t.d. `2x(x+3)`, `(x-5)^2` eða `3a^2b^3`.

## Keyra og birta

Vefurinn er kyrrstæður (HTML, CSS og JavaScript) og þarf engan netþjón.

- **Á GitHub Pages:** Settings → Pages → *Deploy from a branch* → veldu greinina og `/ (root)`.
- **Á eigin tölvu:** `npm start` og opnaðu http://localhost:8080. Það dugar ekki að tvísmella á `index.html` því vafrar leyfa ekki JavaScript-einingar (modules) frá `file://`.

## Prófanir

```
npm test
```

Prófin keyra öll sýnidæmin og 1800 handahófsdæmi og athuga að hvert skref sé jafngilt upphaflega dæminu og að lokasvarið sé fullstytt.

## Uppbygging

| Skrá | Hlutverk |
|---|---|
| `js/algebra.js` | Les stæður, einfaldar skref fyrir skref, ber saman svör og greinir villur |
| `js/generators.js` | Býr til æfingadæmi af handahófi fyrir hvern kafla |
| `js/chapters.js` | Texti kaflanna og sýnidæmin |
| `js/ui.js` | Ritill, birting stærðfræði og myndir |
| `js/app.js` | Síður: forsíða, kaflar, reiknivél, æfing og prófæfing |

**Nýr kafli:** bættu hlut við `CHAPTERS` í `js/chapters.js` og lista af dæmaframleiðendum undir sama auðkenni í `GENERATORS` í `js/generators.js`.
