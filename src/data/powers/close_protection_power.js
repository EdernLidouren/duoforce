// src/data/powers/close_protection_power.js
// Soutien. +1 défense, et +1 crédit par voisin de soutien sur la même ligne
// (gauche ou droite).

import { Rarity } from './rarity.js';
import { getNeighbor, addDefense, grantCredit } from '../../engine/context.js';

export const close_protection_power = {
  id: 'close_protection_power',
  type: 'support',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    addDefense(ctx, 1);
    let supports = 0;
    for (const dir of ['left', 'right']) {
      const n = getNeighbor(ctx, dir);
      if (n && n.type === 'support') supports += 1;
    }
    if (supports > 0) grantCredit(ctx, supports);
  },
};
