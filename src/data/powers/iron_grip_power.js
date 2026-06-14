// src/data/powers/iron_grip_power.js
// Spécial. Renforce les pouvoirs offensifs voisins : chacun inflige +2 dégâts.
// Le bonus modifie la résolution des voisins (pas celle d'iron_grip) — il est
// attribué à chaque voisin lors de la finalisation de resolveBoard, quel que soit
// l'ordre de résolution. iron_grip lui-même ne produit aucun effet direct.

import { Rarity } from './rarity.js';
import { empowerNeighborsOfType } from '../../engine/context.js';

export const iron_grip_power = {
  id: 'iron_grip_power',
  type: 'special',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    empowerNeighborsOfType(ctx, 'offensive', 2);
  },
};
