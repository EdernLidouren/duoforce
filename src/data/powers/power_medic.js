// src/data/powers/power_medic.js
// Support. Ressources et soins. Effets : heal, maneuver, enemy_heal (revers près
// d'un spécial), strategy.

import { Rarity } from './rarity.js';

export const power_medic = {
  id: 'power_medic',
  type: 'support',
  rarity: Rarity.COMMON,
  rules: [
    { condition: 'adjacent_to:support', effect: 'heal', value: 3 },
    { condition: [0, 1, 2], effect: 'maneuver', value: 1 },          // terre
    { condition: 'adjacent_to:special', effect: 'enemy_heal', value: 1 },
    { condition: 'default', effect: 'strategy', value: 1 },
  ],
  customResolve: null,
};
