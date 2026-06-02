// src/ui/render.js — Rendu de l'état du jeu vers le DOM.
//
// Responsabilités :
//   - Transformer un état (engine) en éléments DOM accessibles dans un conteneur.
//   - Produire un balisage sémantique + attributs ARIA cohérents avec la
//     navigation clavier custom (rôles, libellés, états aria-*).
//
// Contrainte : ce module LIT l'état mais ne le modifie jamais. Il ne contient
// aucune règle de jeu (déléguer à engine). Les interactions passent par input.js.

/**
 * Rend l'état du jeu dans le conteneur fourni (remplace son contenu).
 * @param {HTMLElement} container
 * @param {object} state
 * @param {object} strings  Pack de langue (libellés).
 */
export function renderGame(container, state, strings) {
  // TODO: construire le DOM du plateau / des infos de partie à partir de state.
  container.replaceChildren();
}

/**
 * Met à jour un rendu existant sans tout reconstruire (optimisation ultérieure).
 * @param {HTMLElement} container
 * @param {object} state
 * @param {object} strings
 */
export function updateGame(container, state, strings) {
  // TODO: diff minimal ; pour l'instant, déléguer à renderGame.
  renderGame(container, state, strings);
}
