// src/data/powers/winter_dress_power.js
// Spécial. Pour sa propre case et chaque case adjacente portant le statut gel :
// +1 crédit et +1 défense.

import { Rarity } from './rarity.js';
import { areaHasStatus, grantCredit, addDefense } from '../../engine/context.js';

export const winter_dress_power = {
  id: 'winter_dress_power',
  type: 'special',
  rarity: Rarity.RARE,
  customResolve: (ctx) => {
    const areas = [ctx.area, ...ctx.neighborAreas];
    for (const area of areas) {
      if (area && areaHasStatus(ctx, area.position, 'area_freeze_status')) {
        grantCredit(ctx, 1);
        addDefense(ctx, 1);
      }
    }
  },
};
