// src/data/statuses/area_freeze_status.js
// Gel — cible une ZONE du plateau (`target: 'area'`, identifiée par sa position).
// `stacks` = nombre de tours restants ; onTurnEnd décrémente, le moteur retire le
// status à 0.
//
// Effet : un pouvoir OFFENSIF ou de SOUTIEN placé sur une zone gelée ne résout
// pas (ses effets sont annulés) ; les pouvoirs « special » résolvent normalement.
// Ce blocage est appliqué par resolveBoard (isResolutionBlocked), pas ici.
//
// Limite de slots des zones = 1 (gameState.MAX_STATUSES_PER_AREA). En cas de
// conflit, onLimitReached 'overwrite' : un nouveau gel remplace l'ancien.

export const area_freeze_status = {
  id: 'area_freeze_status',
  stackable: false,
  onLimitReached: 'overwrite',
  modifiers: [],
  triggers: [],
  onTurnEnd: (status) => {
    status.stacks -= 1;
  },
};
