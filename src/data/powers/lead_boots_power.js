// src/data/powers/lead_boots_power.js
// Soutien. Dans la rangée du bas (terre, cases 0/1/2) : +2 défense et +1 attaque.
// Aucun effet ailleurs.

import { Rarity } from './rarity.js';
import { isInZone, addDefense, addAttack } from '../../engine/context.js';

export const lead_boots_power = {
  id: 'lead_boots_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    if (isInZone(ctx, [0, 1, 2])) {
      addDefense(ctx, 2);
      addAttack(ctx, 1);
    }
  },
};
