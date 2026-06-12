// src/data/powers/power_shield.js
// Support défensif. Référence d'id pour "adjacent_to:power_shield".

import { Rarity } from './rarity.js';
import { isInZone, addDefense, removeDefense } from '../../engine/context.js';

export const power_shield = {
  id: 'power_shield',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    if (isInZone(ctx, [6, 3, 0])) addDefense(ctx, 3);          // gauche
    else if (isInZone(ctx, [8, 5, 2])) removeDefense(ctx, 1);  // droite
    else addDefense(ctx, 1);
  },
};
