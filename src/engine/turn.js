// src/engine/turn.js — Gestion du tour par tour.
//
// Responsabilités :
//   - Appliquer un coup validé pour produire l'état suivant.
//   - Passer la main au joueur suivant et incrémenter le compteur de tour.
//   - Orchestrer l'enchaînement : valider (rules) → muter logiquement (state).
//
// Contrainte : pur. Aucune annonce ni rendu ici — l'UI réagit au nouvel état.
//
// NOTE : ce module est un échafaudage générique antérieur au système de combat.
// La logique réelle vit désormais dans src/engine/combat.js (resolveTurn). Ces
// stubs restent pour ne pas casser scenes/game.js tant que la scène n'est pas
// recâblée sur le combat.

/**
 * Applique un coup à l'état courant (stub).
 * @param {object} state
 * @param {object} move
 * @returns {{ ok: boolean, state: object, reason?: string }}
 */
export function applyMove(state, move) {
  // TODO: produire le nouvel état après application du coup (ou supprimer ce
  // module au profit de combat.js lors du recâblage de la scène de jeu).
  void move;
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
