// src/data/powers/frozen_lace_power.js
// Spécial. +3 crédit si sa case porte le statut gel, +1 crédit sinon.

import { Rarity } from './rarity.js';
import { areaHasStatus, grantCredit } from '../../engine/context.js';

export const frozen_lace_power = {
  id: 'frozen_lace_power',
  type: 'special',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    grantCredit(ctx, areaHasStatus(ctx, ctx.position, 'area_freeze_status') ? 3 : 1);
  },
};
