// src/data/powers/power_disrupt.js
// Spécial. Débuff de l'ennemi (attaque / défense).
// (L'exil de pouvoir d'origine est retiré : pas de helper de manipulation de
// deck dans context.js pour l'instant.)

import { Rarity } from './rarity.js';
import { isInZone, hasNeighborOfType, removeEnemyAttack, removeEnemyDefense } from '../../engine/context.js';

export const power_disrupt = {
  id: 'power_disrupt',
  type: 'special',
  rarity: Rarity.RARE,
  customResolve: (ctx) => {
    if (hasNeighborOfType(ctx, 'special')) removeEnemyAttack(ctx, 3);
    else if (isInZone(ctx, [7, 4, 1])) removeEnemyDefense(ctx, 2); // colonne centrale
    else removeEnemyAttack(ctx, 1);
  },
};
