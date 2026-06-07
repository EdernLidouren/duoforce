// src/data/powers/power_sabotage.js
// Offensif. Sabotage du plateau : couvre les cibles relatives restantes.
// Effets : exile (neighbors), discard (self/right/left/below).

import { Rarity } from './rarity.js';

export const power_sabotage = {
  id: 'power_sabotage',
  type: 'offensive',
  rarity: Rarity.LEGENDARY,
  rules: [
    { condition: 'adjacent_to:offensive', effect: 'exile', value: 1, target: 'neighbors' },
    { condition: [8, 5, 2], effect: 'discard', value: 1, target: 'self' },   // droite
    { condition: [6, 3, 0], effect: 'discard', value: 1, target: 'right' },  // gauche
    { condition: [0, 1, 2], effect: 'discard', value: 1, target: 'left' },   // terre
    { condition: 'default', effect: 'discard', value: 1, target: 'below' },
  ],
  customResolve: null,
};
