// src/data/powers/power_sabotage.js
// Offensif. Sape les statistiques de l'ennemi, sinon frappe.
// (La défausse/exil d'origine est retirée : pas de helper de manipulation de
// deck dans context.js pour l'instant — re-thématisé en débuff/attaque.)

import { Rarity } from './rarity.js';
import { isInZone, hasNeighborOfType, removeEnemyDefense, removeEnemyAttack, addAttack } from '../../engine/context.js';

export const power_sabotage = {
  id: 'power_sabotage',
  type: 'offensive',
  rarity: Rarity.LEGENDARY,
  customResolve: (ctx) => {
    if (hasNeighborOfType(ctx, 'offensive')) removeEnemyDefense(ctx, 2);
    else if (isInZone(ctx, [8, 5, 2])) removeEnemyAttack(ctx, 1); // droite
    else addAttack(ctx, 1);
  },
};
