// src/data/perks/rusted_armor_perk.js
// Signature passive. En fin de tour, +2 défense à son owner (duo ou ennemi).

export const rusted_armor_perk = {
  id: 'rusted_armor_perk',
  onTurnEnd: (combatState, ctx, owner) => {
    const subject = combatState[owner];
    if (subject) subject.defense += 2;
  },
};
