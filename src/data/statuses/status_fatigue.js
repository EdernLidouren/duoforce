// src/data/statuses/status_fatigue.js
// Fatigue : malus de défense FIXE tant qu'elle est active. `stacks` = nombre de
// tours restants (durée), décrémenté à chaque fin de tour ; expire à 0.

export const status_fatigue = {
  id: 'status_fatigue',
  stackable: false, // réappliquer remplace la durée (ne cumule pas)
  modifiers: [
    // Malus fixe, indépendant des stacks (la valeur ignore `stacks`).
    { property: 'defense', operation: 'add', value: () => -2 },
  ],
  triggers: [],
  // Décrémente la durée ; le moteur retire le status quand stacks <= 0.
  onTurnEnd: (status) => {
    status.stacks -= 1;
  },
};
