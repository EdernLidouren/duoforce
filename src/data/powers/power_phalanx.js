// src/data/powers/power_phalanx.js
// Support. Synergie entre supports + multiplicateur de défense au centre.
// Effets : add_defense, multiply_defense ; condition isolated.

import { Rarity } from './rarity.js';

export const power_phalanx = {
  id: 'power_phalanx',
  type: 'support',
  rarity: Rarity.RARE,
  rules: [
    { condition: 'adjacent_to:support', effect: 'add_defense', value: 3 },
    { condition: [7, 4, 1], effect: 'multiply_defense', value: 2 }, // centre
    { condition: 'isolated', effect: 'add_defense', value: 0 },
    { condition: 'default', effect: 'add_defense', value: 1 },
  ],
  customResolve: null,
};
