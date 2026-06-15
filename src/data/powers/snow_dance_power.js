// src/data/powers/snow_dance_power.js
// Spécial. +1 crédit par manœuvre actuellement possédée, plafonné à 3.

import { Rarity } from './rarity.js';
import { grantCredit } from '../../engine/context.js';

export const snow_dance_power = {
  id: 'snow_dance_power',
  type: 'special',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    const credit = Math.min(3, ctx.combatState.duo.maneuver);
    if (credit > 0) grantCredit(ctx, credit);
  },
};
