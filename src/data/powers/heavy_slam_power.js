// src/data/powers/heavy_slam_power.js
// Offensif. +4 attaque. Épuise le pouvoir directement en dessous (1 tour), s'il
// existe une case en dessous contenant un pouvoir. Un pouvoir immunisé
// (immuneToExhaustion) n'est pas affecté — vérifié par applyStatus.

import { Rarity } from './rarity.js';
import { getNeighbor, addAttack } from '../../engine/context.js';
import { applyStatus } from '../../engine/statuses.js';

export const heavy_slam_power = {
  id: 'heavy_slam_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    addAttack(ctx, 4);
    const below = getNeighbor(ctx, 'below');
    if (below) {
      applyStatus(ctx.combatState, {
        id: 'power_exhaustion_status',
        stacks: 1,
        target: 'entity',
        entity: below,
      });
    }
  },
};
