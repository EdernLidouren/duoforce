// src/data/statuses/hero_poison_status.js
// Poison — cible un héros (`duo` ou `enemy`). `stacks` = dégâts infligés en fin de
// tour. onTurnEnd exécute une action 'deal_damage' (imblocable : ignorent la
// défense), puis décrémente `stacks` de 1 (le poison s'estompe). Le moteur retire
// le status quand `stacks` atteint 0.
//
// Passer par executeAction permet aux futures mécaniques (résistance au poison,
// immunité temporaire) d'intercepter ces dégâts via registerInterceptor, sans
// modifier ce fichier.

import { createAction, executeAction } from '../../engine/actions.js';

export const hero_poison_status = {
  id: 'hero_poison_status',
  stackable: true, // réappliquer cumule l'intensité
  modifiers: [],
  triggers: [],
  onTurnEnd: (status, combatState) => {
    executeAction(combatState, createAction('deal_damage', {
      source: status,
      target: status.target, // 'duo' | 'enemy'
      value: status.stacks,
      data: { unblockable: true },
    }));
    status.stacks -= 1;
  },
};
