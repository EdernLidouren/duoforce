// src/data/powers/power_curse.js
// Spécial à double tranchant. Manipule les statistiques de l'ennemi.

import { Rarity } from './rarity.js';
import {
  isInZone,
  hasNeighborOfType,
  multiplyEnemyDefense,
  addEnemyDefense,
  multiplyEnemyAttack,
  addEnemyAttack,
} from '../../engine/context.js';

export const power_curse = {
  id: 'power_curse',
  type: 'special',
  rarity: Rarity.EPIC,
  customResolve: (ctx) => {
    if (isInZone(ctx, [4])) multiplyEnemyDefense(ctx, 0);             // coeur : annule la défense
    else if (hasNeighborOfType(ctx, 'offensive')) addEnemyDefense(ctx, 1); // revers
    else if (isInZone(ctx, [0, 1, 2])) multiplyEnemyAttack(ctx, 2);   // terre : revers
    else addEnemyAttack(ctx, 1);                                      // revers
  },
};
