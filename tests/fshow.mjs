// Sýnir þáttunarskref: node tests/fshow.mjs '6x^2+9x'
import { parse, toText } from '../js/algebra.js';
import { factorSteps, isFullyFactored } from '../js/factor.js';
for (const e of process.argv.slice(2)) {
  console.log('\n' + toText(parse(e)));
  const st = factorSteps(parse(e));
  for (const s of st) console.log('  = ' + toText(s.node).padEnd(40) + '[' + s.kinds + '] ' + s.notes.join(' | '));
  if (st.length) console.log('  fullþáttað:', isFullyFactored(st[st.length - 1].node));
}
