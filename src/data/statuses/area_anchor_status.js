// src/data/statuses/area_anchor_status.js
// Ancrage — cible une ZONE du plateau (`target: 'area'`, identifiée par sa
// position). `stacks` = nombre de tours restants ; onTurnEnd décrémente, le
// moteur retire le status à 0.
//
// Effet : empêche le DÉPLACEMENT du pouvoir de cette zone sur le plateau (ex.
// échange via une manœuvre). N'affecte PAS la résolution du pouvoir : un pouvoir
// ancré résout normalement (contrairement au gel). L'interdiction de déplacement
// sera vérifiée par le système de déplacement (à venir) via
// hasAreaStatus(combatState, position, 'area_anchor_status').
//
// Limite de slots des zones = 1 (gameState.MAX_STATUSES_PER_AREA). En cas de
// conflit, onLimitReached 'overwrite' : un nouvel ancrage remplace l'ancien.

export const area_anchor_status = {
  id: 'area_anchor_status',
  stackable: false,
  onLimitReached: 'overwrite',
  modifiers: [],
  triggers: [],
  onTurnEnd: (status) => {
    status.stacks -= 1;
  },
};
