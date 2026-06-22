// src/data/perks/blue_comet_mark_perk.js
// Signature passive. Accumule sur tout le combat les pouvoirs bloqués par un
// statut de zone via un compteur fill-and-fire (seuil 2). Dès que le compteur
// atteint 2, +1 attaque pour le duo et le compteur repart à 0.
// Le compteur persiste entre les tours ; il se réinitialise naturellement à 0
// au début d'un nouveau combat (combatState recréé).

import { createEffectCounter } from '../../engine/effectCounter.js';

const counter = createEffectCounter('blue_comet_mark_perk', 2);

export const blue_comet_mark_perk = {
  id: 'blue_comet_mark_perk',

  onPowerBlockedByArea: (combatState, _area, owner) => {
    const fired = counter.increment(combatState);
    if (!fired) return null;
    const subject = combatState[owner];
    if (subject) subject.attack += 1;
    return { perkId: 'blue_comet_mark_perk', effects: [{ effect: 'add_attack', value: 1 }] };
  },

  descriptionData: (combatState) => ({
    counter: counter.getValue(combatState),
  }),
};
