// src/engine/turn.js — Gestion du tour par tour.
//
// Responsabilités :
//   - Appliquer un coup validé pour produire l'état suivant.
//   - Passer la main au joueur suivant et incrémenter le compteur de tour.
//   - Orchestrer l'enchaînement : valider (rules) → muter logiquement (state).
//
// Contrainte : pur. Aucune annonce ni rendu ici — l'UI réagit au nouvel état.

import { validateMove } from './rules.js';

/**
 * Applique un coup à l'état courant.
 * @param {object} state
 * @param {object} move
 * @returns {{ ok: boolean, state: object, reason?: string }}
 *   ok=false renvoie l'état inchangé + la raison (coup refusé).
 */
export function applyMove(state, move) {
  const check = validateMove(state, move);
  if (!check.ok) {
    return { ok: false, state, reason: check.reason };
  }
  // TODO: produire le nouvel état après application du coup.
  return { ok: true, state };
}

/**
 * Passe au joueur suivant (rotation) et incrémente le tour.
 * @param {object} state
 * @returns {object} nouvel état
 */
export function nextTurn(state) {
  // TODO: faire tourner activePlayer et incrémenter turn sans muter `state`.
  return state;
}
