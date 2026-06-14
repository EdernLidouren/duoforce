// src/data/powers/helmbutt_power.js
// Offensif. +2 attaque.

import { Rarity } from './rarity.js';
import { addAttack } from '../../engine/context.js';

export const helmbutt_power = {
  id: 'helmbutt_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    addAttack(ctx, 2);
  },
};
