// src/data/powers/power_phalanx.js
// Support. Synergie entre soutiens, multiplicateur de défense au centre.

import { Rarity } from './rarity.js';
import { isInZone, hasNeighborOfType, isIsolated, addDefense, multiplyDefense } from '../../engine/context.js';

export const power_phalanx = {
  id: 'power_phalanx',
  type: 'support',
  rarity: Rarity.RARE,
  customResolve: (ctx) => {
    if (hasNeighborOfType(ctx, 'support')) addDefense(ctx, 3);
    else if (isInZone(ctx, [7, 4, 1])) multiplyDefense(ctx, 2); // colonne centrale
    else if (isIsolated(ctx)) { /* isolée : aucun effet */ }
    else addDefense(ctx, 1);
  },
};
