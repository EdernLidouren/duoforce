// src/data/powers/power_curse.js
// Spécial à double tranchant. Couvre tous les effets "ennemi" agressifs et leurs
// multiplicateurs. Effets : multiply_enemy_defense (coeur, x0 = annule la défense
// ennemie), add_enemy_defense, multiply_enemy_attack, add_enemy_attack (revers).

import { Rarity } from './rarity.js';

export const power_curse = {
  id: 'power_curse',
  type: 'special',
  rarity: Rarity.EPIC,
  rules: [
    { condition: [4], effect: 'multiply_enemy_defense', value: 0 },        // coeur
    { condition: 'adjacent_to:offensive', effect: 'add_enemy_defense', value: 1 },
    { condition: [0, 1, 2], effect: 'multiply_enemy_attack', value: 2 },   // terre (revers)
    { condition: 'default', effect: 'add_enemy_attack', value: 1 },        // revers
  ],
  customResolve: null,
};
