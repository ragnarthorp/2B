// Sýnir skrefin: node tests/show.mjs '2x(x+3)'
import { parse, solveSteps, toText } from '../js/algebra.js';
for (const e of process.argv.slice(2)) {
  console.log('\n' + toText(parse(e)));
  for (const s of solveSteps(parse(e))) console.log('  = ' + toText(s.node).padEnd(44) + '[' + s.kinds + '] ' + s.notes.join(' | '));
}
