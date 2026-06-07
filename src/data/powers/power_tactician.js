// src/data/powers/power_tactician.js
// Spécial. Économie et manipulation de deck. Effets : credit (coeur), draw
// (isolé), discard/exile avec cibles "above", indices absolus, "row".

import { Rarity } from './rarity.js';

export const power_tactician = {
  id: 'power_tactician',
  type: 'special',
  rarity: Rarity.EPIC,
  rules: [
    { condition: [4], effect: 'credit', value: 1 },                      // coeur
    { condition: 'isolated', effect: 'draw', value: 2 },
    { condition: [6, 7, 8], effect: 'discard', value: 1, target: 'above' }, // ciel
    { condition: [3, 4, 5], effect: 'exile', value: 1, target: [0, 1, 2] }, // surface → terre
    { condition: 'default', effect: 'discard', value: 1, target: 'row' },
  ],
  customResolve: null,
};
