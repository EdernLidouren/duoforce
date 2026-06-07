// src/data/powers/power_aerial_strike.js
// Offensif. Conditions positionnelles (ciel/terre), voisinage offensif.
// Effets : add_attack, remove_attack.

import { Rarity } from './rarity.js';

export const power_aerial_strike = {
  id: 'power_aerial_strike',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  rules: [
    { condition: [6, 7, 8], effect: 'add_attack', value: 4 },     // ciel
    { condition: [0, 1, 2], effect: 'remove_attack', value: 1 },  // terre
    { condition: 'adjacent_to:offensive', effect: 'add_attack', value: 2 },
    { condition: 'default', effect: 'add_attack', value: 2 },
  ],
  customResolve: null,
};
