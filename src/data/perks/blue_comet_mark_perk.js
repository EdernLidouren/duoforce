// src/data/perks/blue_comet_mark_perk.js
// Signature passive. En fin de tour, +1 attaque à son owner pour chaque tranche
// de 3 pouvoirs bloqués par une zone ce tour (events power_blocked_by_area, scope
// 'turn'). Voir docs/context-api.md (event bus) et docs/status-system.md.

import { countEvents } from '../../engine/context.js';

export const blue_comet_mark_perk = {
  id: 'blue_comet_mark_perk',
  onTurnEnd: (combatState, ctx, owner) => {
    const blocked = countEvents(ctx, 'power_blocked_by_area', 'turn');
    const bonus = Math.floor(blocked / 3);
    if (bonus > 0) {
      const subject = combatState[owner];
      if (subject) subject.attack += bonus;
    }
  },
};
