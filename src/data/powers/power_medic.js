// src/data/powers/power_medic.js
// Support. Soins et ressources (avec un revers près d'un spécial).

import { Rarity } from './rarity.js';
import { isInZone, hasNeighborOfType, heal, enemyHeal, grantManeuver, grantStrategy } from '../../engine/context.js';

export const power_medic = {
  id: 'power_medic',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    if (hasNeighborOfType(ctx, 'support')) heal(ctx, 3);
    else if (isInZone(ctx, [0, 1, 2])) grantManeuver(ctx, 1);        // terre
    else if (hasNeighborOfType(ctx, 'special')) enemyHeal(ctx, 1);   // revers
    else grantStrategy(ctx, 1);
  },
};
