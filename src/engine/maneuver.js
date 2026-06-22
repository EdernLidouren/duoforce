// src/engine/maneuver.js — Mécanique de manœuvre.
//
// La manœuvre est un cas particulier de l'action swap_powers : distance 1
// (adjacence orthogonale stricte), coûtant 1 point de manœuvre. Le point n'est
// consommé qu'après validation et application réussie de l'échange.
//
// Flux d'une manœuvre :
//   1. canStartManeuver(combatState)  → le joueur a au moins 1 manœuvre
//   2. canManeuverFrom(...)           → la source est un choix légal
//   3. canManeuverTo(...)             → la cible est un choix légal (read-only)
//   4. executeManeuver(...)           → échange + dépense si succès
//
// Aucun DOM.

import { manhattanDistance } from './rules.js';
import { hasAreaStatus } from './statuses.js';
import { createAction, executeAction, validateAction } from './actions.js';

/** Distance maximale autorisée pour une manœuvre (adjacence orthogonale). */
const MANEUVER_DISTANCE = 1;

/** Toutes les positions valides du plateau 3×3. */
const ALL_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// --- Géométrie de portée ----------------------------------------------------

/**
 * Retourne les positions du plateau atteignables depuis `fromPos` par déplacement
 * orthogonal (Manhattan) à une distance maximale de `maxDistance`.
 * Ne comprend jamais `fromPos` lui-même.
 * @param {number} fromPos     position source (0–8)
 * @param {number} maxDistance distance maximale (entier ≥ 1)
 * @returns {number[]} positions atteignables
 */
export function reachablePositions(fromPos, maxDistance) {
  return ALL_POSITIONS.filter(
    (pos) => pos !== fromPos && manhattanDistance(fromPos, pos) <= maxDistance,
  );
}

// --- Prédicats de faisabilité -----------------------------------------------

/**
 * Retourne true si le joueur dispose d'au moins 1 point de manœuvre.
 * Utilisé par l'UI pour décider si l'interface de manœuvre peut s'ouvrir.
 * @param {object} combatState
 * @returns {boolean}
 */
export function canStartManeuver(combatState) {
  return (combatState.duo?.maneuver ?? 0) >= 1;
}

/**
 * Retourne true si la zone source est un choix légal pour initier une manœuvre.
 * Vérifie : présence d'un pouvoir, zone non ancrée. Les intercepteurs enregistrés
 * ultérieurement pour bloquer la sélection source (perk adverse, gadget…) doivent
 * être reflétés ici ou dans canManeuverTo.
 * @param {object} combatState
 * @param {number} sourcePos
 * @returns {boolean}
 */
export function canManeuverFrom(combatState, sourcePos) {
  if (!canStartManeuver(combatState)) return false;
  if (!combatState.board?.[sourcePos]?.power) return false;
  if (hasAreaStatus(combatState, sourcePos, 'area_anchor_status')) return false;
  return true;
}

/**
 * Retourne true si la zone cible est un choix légal pour achever une manœuvre
 * depuis `sourcePos`. Exécution en lecture seule via validateAction — passe par
 * tout le pipeline d'intercepteurs (distance, ancrage cible, interdictions externes).
 * @param {object} combatState
 * @param {number} sourcePos
 * @param {number} targetPos
 * @returns {boolean}
 */
export function canManeuverTo(combatState, sourcePos, targetPos) {
  const { allowed } = validateAction(combatState, createAction('swap_powers', {
    source: sourcePos,
    target: targetPos,
    data: { maxDistance: MANEUVER_DISTANCE },
  }));
  return allowed;
}

// --- Exécution --------------------------------------------------------------

/**
 * Tente d'effectuer une manœuvre : échange les pouvoirs entre sourcePos et
 * targetPos (distance 1, orthogonale uniquement). Le point de manœuvre n'est
 * consommé qu'après validation et application réussie de l'échange.
 *
 * Retourne un objet résultat :
 *   { success: true }                        — échange effectué, manœuvre dépensée
 *   { success: false, reason: string|null }  — échange annulé (raison localisée)
 *
 * @param {object} combatState
 * @param {number} sourcePos
 * @param {number} targetPos
 * @returns {{ success: boolean, reason?: string|null }}
 */
export function executeManeuver(combatState, sourcePos, targetPos) {
  if (!canStartManeuver(combatState)) {
    return { success: false, reason: 'action.blocked.no_maneuver' };
  }

  const action = createAction('swap_powers', {
    source: sourcePos,
    target: targetPos,
    data: { maxDistance: MANEUVER_DISTANCE },
  });
  executeAction(combatState, action);

  if (action.cancelled) {
    return { success: false, reason: action.reason };
  }

  // Manœuvre dépensée uniquement après échange réussi.
  executeAction(combatState, createAction('spend_maneuver', {
    target: 'duo',
    value: 1,
  }));

  return { success: true };
}
