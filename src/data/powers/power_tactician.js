// src/data/powers/power_tactician.js
// Spécial. Économie de ressources (crédit / stratégie / manœuvre).
// (Les effets de pioche/défausse d'origine sont retirés : pas de helper de
// manipulation de deck dans context.js pour l'instant — re-thématisé en ressources.)

import { Rarity } from './rarity.js';
import { isInZone, isIsolated, grantCredit, grantStrategy, grantManeuver } from '../../engine/context.js';

export const power_tactician = {
  id: 'power_tactician',
  type: 'special',
  rarity: Rarity.EPIC,
  customResolve: (ctx) => {
    if (isInZone(ctx, [4])) grantCredit(ctx, 1);       // coeur
    else if (isIsolated(ctx)) grantStrategy(ctx, 1);
    else grantManeuver(ctx, 1);
  },
};
