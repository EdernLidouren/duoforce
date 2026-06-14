// src/data/powers/impregnable_power.js
// Soutien. +3 défense si la défense du duo est nulle au moment de la résolution,
// +1 défense sinon.

import { Rarity } from './rarity.js';
import { addDefense } from '../../engine/context.js';

export const impregnable_power = {
  id: 'impregnable_power',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    addDefense(ctx, ctx.combatState.duo.defense === 0 ? 3 : 1);
  },
};
