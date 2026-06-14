// src/data/powers/shield_charge_power.js
// Offensif. +1 attaque, +1 défense.

import { Rarity } from './rarity.js';
import { addAttack, addDefense } from '../../engine/context.js';

export const shield_charge_power = {
  id: 'shield_charge_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    addAttack(ctx, 1);
    addDefense(ctx, 1);
  },
};
