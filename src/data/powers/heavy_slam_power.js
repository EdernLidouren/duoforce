// src/data/powers/heavy_slam_power.js
// Offensif. +4 attaque. Épuise le pouvoir directement en dessous (1 tour), s'il
// existe une case en dessous contenant un pouvoir. Un pouvoir immunisé
// (immuneToExhaustion) n'est pas affecté — vérifié par l'intercepteur d'immunité
// dans actions.js.

import { Rarity } from './rarity.js';
import { getNeighbor, addAttack } from '../../engine/context.js';
import { executeAction, createAction } from '../../engine/actions.js';

export const heavy_slam_power = {
  id: 'heavy_slam_power',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    addAttack(ctx, 4);
    const below = getNeighbor(ctx, 'below');
    if (below) {
      executeAction(ctx.combatState, createAction('apply_status', {
        source: ctx.power,
        target: { type: 'entity', entity: below },
        value: { statusId: 'power_exhaustion_status', stacks: 1 },
      }));
    }
  },
};
