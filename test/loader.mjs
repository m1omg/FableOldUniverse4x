// Loads the plain-script sim files into a Node process and returns the EV
// namespace, exactly as a browser would assemble it from <script> tags.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SIM_FILES = [
  'js/sim/core.js',
  'js/sim/data.js',
  'js/sim/world.js',
  'js/sim/economy.js',
  'js/sim/events.js',
  'js/sim/voices.js',
  'js/sim/gleaner.js',
  'js/sim/endings.js',
  'js/sim/actions.js',
  'js/sim/forecast.js',
  'js/sim/turn.js',
  'js/sim/save.js',
];

export function loadSim() {
  delete globalThis.EV;
  for (const f of SIM_FILES) {
    const p = path.join(root, f);
    delete require.cache[require.resolve(p)];
    require(p);
  }
  return globalThis.EV;
}
