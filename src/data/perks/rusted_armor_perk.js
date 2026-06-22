// src/data/perks/rusted_armor_perk.js
// Signature passive. En fin de tour, +2 défense à son owner (duo ou ennemi).
// Passe par executeAction('add_defense') pour permettre aux futures mécaniques
// d'intercepter ou de plafonner ce gain sans modifier ce fichier.

import { createAction, executeAction } from '../../engine/actions.js';

export const rusted_armor_perk = {
  id: 'rusted_armor_perk',
  onTurnEnd: (combatState, _ctx, owner) => {
    executeAction(combatState, createAction('add_defense', {
      source: 'rusted_armor_perk',
      target: owner,
      value: 2,
    }));
  },
};
