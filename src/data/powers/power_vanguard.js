// src/data/powers/power_vanguard.js
// Offensif. Bonus si adjacent à un bouclier (adjacent_to:<id>), multiplie
// l'attaque dans les coins. Effets : add_attack, multiply_attack.

import { Rarity } from './rarity.js';

export const power_vanguard = {
  id: 'power_vanguard',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  rules: [
    { condition: 'adjacent_to:power_shield', effect: 'add_attack', value: 5 },
    { condition: [6, 8, 0, 2], effect: 'multiply_attack', value: 2 }, // coins
    { condition: 'default', effect: 'add_attack', value: 2 },
  ],
  customResolve: null,
};
