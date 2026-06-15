// src/data/statuses/power_exhaustion_status.js
// Épuisement — cible une ENTITÉ (un pouvoir sur le plateau). `stacks` = nombre de
// tours restants. Tant que le status est actif, le customResolve du pouvoir n'est
// PAS exécuté : ce saut est assuré par resolveBoard (src/engine/rules.js).
// onTurnEnd décrémente la durée ; le moteur retire le status à 0.
//
// Immunité : un pouvoir portant le drapeau `immuneToExhaustion` ne peut pas
// recevoir ce status (vérifié par applyStatus, cf. src/engine/statuses.js).

export const power_exhaustion_status = {
  id: 'power_exhaustion_status',
  stackable: false, // réappliquer réinitialise la durée (ne cumule pas)
  onLimitReached: 'overwrite', // (entité illimitée : sans effet en pratique)
  immunityFlag: 'immuneToNegativeStatus',
  modifiers: [],
  triggers: [],
  onTurnEnd: (status) => {
    status.stacks -= 1;
  },
};
