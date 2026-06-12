// src/data/powers/power_vanguard.js
// Offensif. Bonus à côté d'un bouclier, multiplicateur dans les coins.

import { Rarity } from './rarity.js';
import { isInZone, hasNeighborById, addAttack, multiplyAttack } from '../../engine/context.js';

export const power_vanguard = {
  id: 'power_vanguard',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    if (hasNeighborById(ctx, 'power_shield')) addAttack(ctx, 5);
    else if (isInZone(ctx, [6, 8, 0, 2])) multiplyAttack(ctx, 2); // coins
    else addAttack(ctx, 2);
  },
};
