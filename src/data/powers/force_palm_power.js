// src/data/powers/force_palm_power.js
// Offensif. +3 attaque si un voisin sur la même ligne (gauche ou droite) est
// offensif, +1 attaque sinon.

import { Rarity } from './rarity.js';
import { getNeighbor, addAttack } from '../../engine/context.js';

export const force_palm_power = {
  id: 'force_palm_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    const left = getNeighbor(ctx, 'left');
    const right = getNeighbor(ctx, 'right');
    const sameRowOffensive =
      (left && left.type === 'offensive') || (right && right.type === 'offensive');
    addAttack(ctx, sameRowOffensive ? 3 : 1);
  },
};
