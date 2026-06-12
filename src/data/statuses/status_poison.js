// src/data/statuses/status_poison.js
// Poison : inflige `stacks` dégâts en fin de tour. `stacks` = intensité. PAS de
// décrémentation automatique — c'est au poison de décider s'il se réduit (ici,
// il persiste tant qu'il n'est pas retiré explicitement).

export const status_poison = {
  id: 'status_poison',
  stackable: true, // réappliquer cumule l'intensité
  modifiers: [],
  triggers: [],
  onTurnEnd: (status, combatState) => {
    const subject = combatState[status.target]; // duo / enemy
    if (subject) subject.hp -= status.stacks; // dégâts = stacks, sans décrément
  },
};
