// src/engine/rules.js — Règles du jeu et validation des coups.
//
// Responsabilités :
//   - Énumérer les coups légaux pour un état donné.
//   - Valider un coup proposé (légal / illégal + raison).
//   - Déterminer les conditions de victoire / fin de partie.
//
// Contrainte : fonctions pures dérivées de l'état. Pas de DOM, pas d'aléatoire
// caché (toute source d'aléa doit être passée en paramètre pour rester testable).

/**
 * Liste les coups légaux pour le joueur actif dans l'état donné.
 * @param {object} state
 * @returns {Array<object>} coups légaux
 */
export function legalMoves(state) {
  // TODO: calculer les coups possibles à partir de state.
  return [];
}

/**
 * Valide un coup proposé.
 * @param {object} state
 * @param {object} move
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateMove(state, move) {
  // TODO: vérifier la légalité du coup ; renvoyer une raison si invalide.
  return { ok: false, reason: 'non implémenté' };
}

/**
 * Évalue la fin de partie.
 * @param {object} state
 * @returns {{ over: boolean, winner?: number|null }}
 */
export function checkVictory(state) {
  // TODO: détecter victoire / nul / partie en cours.
  return { over: false, winner: null };
}
