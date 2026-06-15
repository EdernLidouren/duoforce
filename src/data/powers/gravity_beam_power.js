// src/data/powers/gravity_beam_power.js
// Offensif. Pour chaque pouvoir situé au-dessus dans la même colonne : +3 attaque,
// et la case de ce pouvoir gagne 1 ancrage.

import { Rarity } from './rarity.js';
import { addAttack, applyAreaStatus } from '../../engine/context.js';

export const gravity_beam_power = {
  id: 'gravity_beam_power',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    for (const area of ctx.areasAbove) {
      if (area && area.power) {
        addAttack(ctx, 3);
        applyAreaStatus(ctx, area.position, 'area_anchor_status', 1);
      }
    }
  },
};
