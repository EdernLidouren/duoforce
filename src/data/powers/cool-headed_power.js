// src/data/powers/cool-headed_power.js
// Soutien. +1 défense si un pouvoir adjacent est offensif, sinon +1 stratégie.

import { Rarity } from './rarity.js';
import { hasNeighborOfType, addDefense, grantStrategy } from '../../engine/context.js';

export const cool_headed_power = {
  id: 'cool-headed_power',
  type: 'support',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    if (hasNeighborOfType(ctx, 'offensive')) addDefense(ctx, 1);
    else grantStrategy(ctx, 1);
  },
};
