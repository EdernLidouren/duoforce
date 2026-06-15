// src/data/powers/icycle_power.js
// Offensif. +3 attaque si une case adjacente porte le gel, +1 attaque sinon. Dans
// tous les cas, applique 1 gel sur sa propre case.

import { Rarity } from './rarity.js';
import { areaHasStatus, addAttack, applyAreaStatus } from '../../engine/context.js';

export const icycle_power = {
  id: 'icycle_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    const adjacentFrozen = ctx.neighborAreas.some(
      (area) => areaHasStatus(ctx, area.position, 'area_freeze_status'),
    );
    addAttack(ctx, adjacentFrozen ? 3 : 1);
    applyAreaStatus(ctx, ctx.position, 'area_freeze_status', 1);
  },
};
