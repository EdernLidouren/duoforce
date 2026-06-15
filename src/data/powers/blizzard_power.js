// src/data/powers/blizzard_power.js
// Offensif. Hors de la ligne du bas (donc surface ou ciel) et avec au moins 1
// manœuvre : +5 attaque et -1 manœuvre. Sinon : +2 attaque.

import { Rarity } from './rarity.js';
import { isInZone, addAttack, grantManeuver } from '../../engine/context.js';

export const blizzard_power = {
  id: 'blizzard_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    const notGround = !isInZone(ctx, [0, 1, 2]); // surface ou ciel
    if (notGround && ctx.combatState.duo.maneuver >= 1) {
      addAttack(ctx, 5);
      grantManeuver(ctx, -1);
    } else {
      addAttack(ctx, 2);
    }
  },
};
