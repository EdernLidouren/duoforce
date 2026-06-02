// src/engine/board.js — Représentation du plateau.
//
// Responsabilités :
//   - Définir la structure de données du plateau (grille, cases, contenu).
//   - Fournir des helpers de lecture/écriture PURS (accès case, voisinage,
//     bornes, copie). Toute « écriture » renvoie une nouvelle structure.
//
// Contrainte : logique pure, pas de DOM. Le rendu du plateau est la
// responsabilité de src/ui/render.js.

/**
 * Crée un plateau vide selon les options fournies.
 * @param {object} [options]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {object} plateau
 */
export function createBoard(options = {}) {
  const width = options.width ?? 0;
  const height = options.height ?? 0;
  // TODO: allouer la grille (ex. tableau de cases) selon width/height.
  return { width, height, cells: [] };
}

/**
 * Indique si une coordonnée est dans les limites du plateau.
 * @param {object} board
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function inBounds(board, x, y) {
  return x >= 0 && y >= 0 && x < board.width && y < board.height;
}

/**
 * Lit le contenu d'une case.
 * @param {object} board
 * @param {number} x
 * @param {number} y
 * @returns {any}
 */
export function getCell(board, x, y) {
  // TODO: retourner la case à (x, y).
  return undefined;
}

/**
 * Renvoie un NOUVEAU plateau avec la case (x, y) remplacée.
 * @param {object} board
 * @param {number} x
 * @param {number} y
 * @param {any} value
 * @returns {object} nouveau plateau
 */
export function setCell(board, x, y, value) {
  // TODO: copier le plateau et écrire la case sans muter `board`.
  return board;
}
