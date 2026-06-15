// src/data/powers/weightlessness_power.js
// Soutien. Aucun effet si sa case porte le statut ancrage. Sinon : +1 manœuvre
// sur la ligne du bas ou du milieu (terre/surface), +1 stratégie sur le ciel.

import { Rarity } from './rarity.js';
import { areaHasStatus, isInZone, grantManeuver, grantStrategy } from '../../engine/context.js';

export const weightlessness_power = {
  id: 'weightlessness_power',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    if (areaHasStatus(ctx, ctx.position, 'area_anchor_status')) return; // effets annulés
    if (isInZone(ctx, [0, 1, 2, 3, 4, 5])) grantManeuver(ctx, 1); // terre ou surface
    else grantStrategy(ctx, 1); // ciel
  },
};
