// src/data/powers/metalloy_power.js
// Soutien. +2 défense.

import { Rarity } from './rarity.js';
import { addDefense } from '../../engine/context.js';

export const metalloy_power = {
  id: 'metalloy_power',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    addDefense(ctx, 2);
  },
};
