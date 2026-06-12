// src/engine/rules.js — Résolution du plateau (modèle impératif).
//
// Chaque pouvoir fournit une fonction customResolve(ctx) qui MUTE le combatState
// via les helpers de context.js (voir docs/context-api.md). resolveBoard :
//   1. travaille sur une COPIE du combatState (pureté : l'estimateur et le vrai
//      état ne sont pas corrompus ; resolveTurn commet ensuite les valeurs) ;
//   2. applique les modificateurs de statuts AVANT la résolution ;
//   3. résout les pouvoirs dans l'ordre de lecture (6,7,8,3,4,5,0,1,2), chacun
//      mutant la copie ; évalue les triggers de statuts APRÈS chaque pouvoir ;
//   4. retourne les valeurs résolues + un journal d'activation (pour les messages).
//
// Contrainte : logique pure, AUCUN DOM. Ne dépend que des données et de statuses.js.

import { applyModifiers, evaluateTriggers } from './statuses.js';

// --- Disposition du plateau -------------------------------------------------
//
//   6 | 7 | 8     (ciel)
//   3 | 4 | 5     (surface)
//   0 | 1 | 2     (terre)

const LAYOUT = [
  [6, 7, 8],
  [3, 4, 5],
  [0, 1, 2],
];

/** Ordre de résolution / distribution (ordre de lecture). */
export const RESOLUTION_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2];

/** index de case → { r, c } (ligne, colonne) dans LAYOUT. */
const COORD = {};
LAYOUT.forEach((row, r) => row.forEach((index, c) => { COORD[index] = { r, c }; }));

/** Décalages des voisins orthogonaux. */
const DIRECTIONS = {
  above: [-1, 0],
  below: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

// --- Helpers de géométrie ---------------------------------------------------

/**
 * Index du voisin d'une case dans une direction, ou null si hors plateau.
 * @param {number} pos
 * @param {keyof DIRECTIONS} direction
 * @returns {number|null}
 */
export function neighborInDirection(pos, direction) {
  const { r, c } = COORD[pos];
  const [dr, dc] = DIRECTIONS[direction];
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nr > 2 || nc < 0 || nc > 2) return null;
  return LAYOUT[nr][nc];
}

/** Indices des voisins orthogonaux existants d'une case. */
function neighborIndices(pos) {
  return Object.keys(DIRECTIONS)
    .map((dir) => neighborInDirection(pos, dir))
    .filter((i) => i !== null);
}

// --- Contexte ---------------------------------------------------------------

/**
 * Construit le contexte passé à customResolve d'un pouvoir.
 *   position, neighbors (tableau), neighborsByDir ({left,right,above,below}),
 *   boardState, combatState (copie de travail).
 */
function buildContext(pos, board, combatState) {
  const neighbors = neighborIndices(pos)
    .map((i) => board[i])
    .filter((p) => p != null);

  const neighborsByDir = {};
  for (const dir of ['left', 'right', 'above', 'below']) {
    const i = neighborInDirection(pos, dir);
    neighborsByDir[dir] = i == null ? null : (board[i] ?? null);
  }

  return { position: pos, neighbors, neighborsByDir, boardState: board, combatState };
}

/** Copie de travail du combatState (duo/enemy clonés, statuts partagés en lecture). */
function cloneForResolve(combatState) {
  return {
    ...combatState,
    duo: { ...combatState.duo },
    enemy: { ...combatState.enemy },
  };
}

// --- API principale ---------------------------------------------------------

/**
 * Résout l'ensemble du plateau SANS muter l'entrée (travaille sur une copie).
 * @param {Array} boardState   9 cases (index 0–8), null si vide.
 * @param {object} combatState { duo:{...}, enemy:{...}, statuses }
 * @returns {{ duo:object, enemy:object, activations:Array }}
 *   duo : { attack, defense, hp, maneuver, strategy, credit } (valeurs résolues)
 *   enemy : { attack, defense, hp }
 *   activations : [{ position, powerId, effects:[{effect,value}] }] (ordre de résolution)
 */
export function resolveBoard(boardState, combatState) {
  const work = cloneForResolve(combatState);
  const board = boardState.slice();

  // 1) Modificateurs de statuts, avant la résolution.
  applyModifiers(work);

  const activations = [];
  for (const pos of RESOLUTION_ORDER) {
    const power = board[pos];
    if (!power) continue;

    const ctx = buildContext(pos, board, work);
    ctx.effects = []; // journal des effets de ce pouvoir (pour les messages)
    if (typeof power.customResolve === 'function') power.customResolve(ctx);

    // 2) Triggers de statuts, après chaque pouvoir résolu.
    evaluateTriggers(work, ctx);

    if (ctx.effects.length > 0) {
      activations.push({ position: pos, powerId: power.id, effects: ctx.effects });
    }
  }

  const clamp = (n) => Math.max(0, n);
  return {
    duo: {
      attack: clamp(work.duo.attack),
      defense: clamp(work.duo.defense),
      hp: work.duo.hp,
      maneuver: work.duo.maneuver,
      strategy: work.duo.strategy,
      credit: work.duo.credit,
    },
    enemy: {
      attack: clamp(work.enemy.attack),
      defense: clamp(work.enemy.defense),
      hp: work.enemy.hp,
    },
    activations,
  };
}
