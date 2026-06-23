// src/engine/powerActions.js — Helpers de faisabilité pour les opérations sur les pouvoirs.
//
// Chaque helper encapsule la construction d'une action et un appel à validateAction
// (lecture seule). Il retourne { allowed, reason, sources } :
//   - allowed  : boolean — l'opération est autorisée
//   - reason   : clé de localisation du motif de blocage, ou null
//   - sources  : tableau des origines d'interdiction poussées par les intercepteurs
//                (ex. nom du statut, du perk) — utile pour les annonces NVDA
//
// Ces helpers servent à interroger le pipeline d'intercepteurs SANS exécuter
// l'action. Une mécanique de haut niveau (ex. stratégie) se compose en combinant
// plusieurs capacités : un pouvoir source devra être à la fois `remove_power` et
// `discard_power` ; un remplaçant à la fois `draw_power` et `place_power`.
//
// Aucun DOM. Aucun exécuteur ici — l'exécution relève de la mécanique concernée.

import { createAction, validateAction } from './actions.js';

// --- Helpers internes -------------------------------------------------------

/**
 * Construit une action du type donné, initialise data.sources, et retourne
 * le résultat de validateAction.
 */
function query(combatState, type, source, target, value = null, extraData = {}) {
  const action = createAction(type, { source, target, value, data: { ...extraData, sources: [] } });
  return validateAction(combatState, action);
}

// --- Capacités atomiques ----------------------------------------------------

/**
 * Un pouvoir peut-il être envoyé à la défausse ?
 *
 * Action : `discard_power`
 *   source : objet pouvoir à défausser
 *   target : index 0–8 de sa zone actuelle
 *
 * Les intercepteurs sur `discard_power` peuvent bloquer l'opération et pousser
 * leur identité dans `action.data.sources`.
 *
 * @param {object} combatState
 * @param {object} power       pouvoir à défausser
 * @param {number} position    zone actuelle (0–8)
 * @returns {{ allowed: boolean, reason: string|null, sources: string[] }}
 */
export function canDiscard(combatState, power, position) {
  return query(combatState, 'discard_power', power, position);
}

/**
 * Un pouvoir peut-il être retiré de sa zone (sans présumer de la destination) ?
 *
 * Action : `remove_power`
 *   source : objet pouvoir à retirer
 *   target : index 0–8 de sa zone actuelle
 *
 * Distinct de `discard_power` : retirer un pouvoir ne présume pas qu'il va en
 * défausse (il peut partir en exil, en main, ou être replacé ailleurs).
 *
 * @param {object} combatState
 * @param {object} power
 * @param {number} position
 * @returns {{ allowed: boolean, reason: string|null, sources: string[] }}
 */
export function canRemove(combatState, power, position) {
  return query(combatState, 'remove_power', power, position);
}

/**
 * Un pouvoir peut-il être posé sur une zone donnée ?
 *
 * Action : `place_power`
 *   source : objet pouvoir à poser
 *   target : index 0–8 de la zone destination
 *
 * Les intercepteurs peuvent bloquer selon l'état de la zone (statut d'interdiction
 * de dépôt, zone déjà occupée, etc.).
 *
 * @param {object} combatState
 * @param {object} power
 * @param {number} position    zone destination (0–8)
 * @returns {{ allowed: boolean, reason: string|null, sources: string[] }}
 */
export function canPlace(combatState, power, position) {
  return query(combatState, 'place_power', power, position);
}

/**
 * Un pouvoir de la pioche peut-il être proposé (candidature, jamais exécution) ?
 *
 * Action : `draw_power`
 *   source : objet pouvoir candidat
 *   target : null (pas de destination présumée au moment du filtrage)
 *
 * Sert à filtrer les candidats présentés au joueur lors d'une stratégie, avant
 * toute sélection. L'exécution réelle du tirage relève de la mécanique appelante.
 *
 * @param {object} combatState
 * @param {object} power       pouvoir candidat
 * @returns {{ allowed: boolean, reason: string|null, sources: string[] }}
 */
export function canDraw(combatState, power) {
  return query(combatState, 'draw_power', power, null);
}
