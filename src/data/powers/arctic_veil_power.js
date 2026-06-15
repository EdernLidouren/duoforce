// src/data/powers/arctic_veil_power.js
// Soutien. +1 défense, +1 manœuvre, et applique 1 gel sur sa propre case.

import { Rarity } from './rarity.js';
import { addDefense, grantManeuver, applyAreaStatus } from '../../engine/context.js';

export const arctic_veil_power = {
  id: 'arctic_veil_power',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    addDefense(ctx, 1);
    grantManeuver(ctx, 1);
    applyAreaStatus(ctx, ctx.position, 'area_freeze_status', 1);
  },
};
