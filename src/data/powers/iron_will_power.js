// src/data/powers/iron_will_power.js
// Soutien. +1 défense. Immunisé contre l'épuisement : ne peut jamais recevoir le
// status power_exhaustion_status (drapeau vérifié par applyStatus).

import { Rarity } from './rarity.js';
import { addDefense } from '../../engine/context.js';

export const iron_will_power = {
  id: 'iron_will_power',
  type: 'support',
  rarity: Rarity.COMMON,
  immuneToExhaustion: true,
  customResolve: (ctx) => {
    addDefense(ctx, 1);
  },
};
