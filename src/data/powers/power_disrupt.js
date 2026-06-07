// src/data/powers/power_disrupt.js
// Spécial. Débuff ennemi + exil d'une colonne depuis les coins.
// Effets : remove_enemy_attack, remove_enemy_defense, exile (target "col").

import { Rarity } from './rarity.js';

export const power_disrupt = {
  id: 'power_disrupt',
  type: 'special',
  rarity: Rarity.RARE,
  rules: [
    { condition: 'adjacent_to:special', effect: 'remove_enemy_attack', value: 3 },
    { condition: [7, 4, 1], effect: 'remove_enemy_defense', value: 2 }, // centre
    { condition: [6, 8, 0, 2], effect: 'exile', value: 1, target: 'col' },
    { condition: 'default', effect: 'remove_enemy_attack', value: 1 },
  ],
  customResolve: null,
};
