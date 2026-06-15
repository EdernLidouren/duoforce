// src/data/powers/iron_will_power.js
// Spécial. +1 défense. Immunisé contre les statuts négatifs : ce pouvoir ne peut
// pas recevoir d'épuisement, et la case qui le contient ne peut pas recevoir de
// gel ni d'ancrage (drapeau immuneToNegativeStatus vérifié par applyStatus, pour
// la cible entité comme pour la cible zone).

import { Rarity } from './rarity.js';
import { addDefense } from '../../engine/context.js';

export const iron_will_power = {
  id: 'iron_will_power',
  type: 'special',
  rarity: Rarity.RARE,
  immuneToNegativeStatus: true,
  customResolve: (ctx) => {
    addDefense(ctx, 1);
  },
};
