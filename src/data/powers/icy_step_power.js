// src/data/powers/icy_step_power.js
// Soutien. Sur la ligne du bas (terre) : +1 défense, +1 manœuvre et 1 gel sur sa
// case. Ailleurs : +1 défense seulement.

import { Rarity } from './rarity.js';
import { isInZone, addDefense, grantManeuver, applyAreaStatus } from '../../engine/context.js';

export const icy_step_power = {
  id: 'icy_step_power',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    if (isInZone(ctx, [0, 1, 2])) {
      addDefense(ctx, 1);
      grantManeuver(ctx, 1);
      applyAreaStatus(ctx, ctx.position, 'area_freeze_status', 1);
    } else {
      addDefense(ctx, 1);
    }
  },
};
