// src/data/powers/power_shield.js
// Support défensif. Colonnes gauche/droite. Sert de référence d'id pour
// "adjacent_to:power_shield". Effets : add_defense, remove_defense.

import { Rarity } from './rarity.js';

export const power_shield = {
  id: 'power_shield',
  type: 'support',
  rarity: Rarity.COMMON,
  rules: [
    { condition: [6, 3, 0], effect: 'add_defense', value: 3 },     // gauche
    { condition: [8, 5, 2], effect: 'remove_defense', value: 1 },  // droite
    { condition: 'default', effect: 'add_defense', value: 1 },
  ],
  customResolve: null,
};
