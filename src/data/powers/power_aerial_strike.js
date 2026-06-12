// src/data/powers/power_aerial_strike.js
// Offensif. Plus fort dans le ciel, plus faible en terre.

import { Rarity } from './rarity.js';
import { isInZone, hasNeighborOfType, addAttack, removeAttack } from '../../engine/context.js';

export const power_aerial_strike = {
  id: 'power_aerial_strike',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    if (isInZone(ctx, [6, 7, 8])) addAttack(ctx, 4);          // ciel
    else if (isInZone(ctx, [0, 1, 2])) removeAttack(ctx, 1);  // terre
    else if (hasNeighborOfType(ctx, 'offensive')) addAttack(ctx, 2);
    else addAttack(ctx, 2);
  },
};
