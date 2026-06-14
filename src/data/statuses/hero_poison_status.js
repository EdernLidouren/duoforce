// src/data/statuses/hero_poison_status.js
// Poison — cible un héros (`duo` ou `enemy`). `stacks` = dégâts infligés en fin de
// tour. onTurnEnd retire `stacks` points de vie DIRECTEMENT (dégâts imblocables :
// ils ignorent la défense), puis décrémente `stacks` de 1 (le poison s'estompe).
// Le moteur retire le status quand `stacks` atteint 0.

export const hero_poison_status = {
  id: 'hero_poison_status',
  stackable: true, // réappliquer cumule l'intensité
  modifiers: [],
  triggers: [],
  onTurnEnd: (status, combatState) => {
    const subject = combatState[status.target]; // duo / enemy
    if (subject) subject.hp -= status.stacks; // imblocable : ignore la défense
    status.stacks -= 1;
  },
};
