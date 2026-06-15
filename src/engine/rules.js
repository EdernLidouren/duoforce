// src/engine/rules.js — Résolution du plateau (modèle impératif).
//
// Le plateau (boardState) est un tableau de 9 ZONES (« area ») :
//   { position, power: PowerInstance|null, statuses: [] }.
//
// Chaque pouvoir fournit une fonction customResolve(ctx) qui MUTE le combatState
// via les helpers de context.js (voir docs/context-api.md). resolveBoard :
//   1. travaille sur une COPIE du combatState ET des zones (pureté : l'estimateur
//      et le vrai état ne sont pas corrompus ; resolveTurn commet les valeurs) ;
//   2. applique les modificateurs de statuts AVANT la résolution ;
//   3. pour chaque zone, dans l'ordre de lecture (6,7,8,3,4,5,0,1,2) : le POUVOIR
//      résout, PUIS la ZONE résout. Concrètement, isResolutionBlocked(ctx) est
//      vérifié EN AMONT (épuisement du pouvoir, puis gel de la zone) ; si rien ne
//      bloque, customResolve s'exécute. Les triggers de statuts sont évalués
//      après chaque pouvoir ;
//   4. retourne les valeurs résolues + un journal d'activation (pour les messages).
//
// Contrainte : logique pure, AUCUN DOM. Ne dépend que des données et de statuses.js.

import {
  applyModifiers,
  evaluateTriggers,
  hasEntityStatus,
  hasAreaStatus,
} from './statuses.js';
import { emitEvent } from './events.js';
import { applyPerkModifiers, evaluatePerkTriggers } from './perks.js';

/** Id du status qui rend un pouvoir inactif (cf. data/statuses). */
const EXHAUSTION_ID = 'power_exhaustion_status';
/** Id du status de zone qui gèle les pouvoirs offensifs / de soutien placés là. */
const FREEZE_ID = 'area_freeze_status';
/** Types de pouvoir affectés par le gel de zone (les « special » résolvent quand même). */
const FREEZABLE_TYPES = new Set(['offensive', 'support']);

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
 *   position, power (le pouvoir de la zone), area (la zone courante),
 *   neighbors (pouvoirs voisins), neighborsByDir ({left,right,above,below} → pouvoir),
 *   neighborAreasByDir (idem → zone), boardState (les zones), combatState.
 * Les voisins exposés comme « pouvoirs » restent des objets pouvoir (pas des
 * zones) pour ne pas casser les customResolve existants.
 */
function buildContext(pos, board, combatState) {
  const neighbors = neighborIndices(pos)
    .map((i) => board[i]?.power)
    .filter((p) => p != null);

  const neighborsByDir = {};
  const neighborAreasByDir = {};
  for (const dir of ['left', 'right', 'above', 'below']) {
    const i = neighborInDirection(pos, dir);
    const area = i == null ? null : (board[i] ?? null);
    neighborAreasByDir[dir] = area;
    neighborsByDir[dir] = area?.power ?? null;
  }

  const area = board[pos] ?? null;
  return {
    position: pos,
    power: area?.power ?? null,
    area,
    neighbors,
    neighborsByDir,
    neighborAreasByDir,
    boardState: board,
    combatState,
  };
}

/** Clone profond du conteneur de statuts (instances copiées, références d'entité conservées). */
function cloneStatuses(s) {
  if (!s) return { duo: [], enemy: [], entities: new Map() };
  const cloneList = (list) => (Array.isArray(list) ? list.map((st) => ({ ...st })) : []);
  const entities = new Map();
  if (s.entities instanceof Map) {
    for (const [key, list] of s.entities) {
      entities.set(key, Array.isArray(list) ? list.map((st) => ({ ...st })) : []);
    }
  }
  return { duo: cloneList(s.duo), enemy: cloneList(s.enemy), entities };
}

/** Clone des zones (chaque zone copiée, ses statuts copiés, le pouvoir partagé). */
function cloneBoard(board) {
  if (!Array.isArray(board)) return board;
  return board.map((area) =>
    area
      ? {
          ...area,
          statuses: Array.isArray(area.statuses) ? area.statuses.map((st) => ({ ...st })) : [],
        }
      : area,
  );
}

/**
 * Copie de travail du combatState. duo/enemy ET les statuts (duo/enemy/entités)
 * sont clonés en profondeur ; les ZONES sont clonées par resolveBoard. La
 * résolution peut donc appliquer des statuts (épuisement d'un voisin, gel d'une
 * zone) SANS muter l'état réel. Cela garantit la pureté de resolveBoard, utilisée
 * aussi par l'estimateur.
 */
function cloneForResolve(combatState) {
  return {
    ...combatState,
    duo: { ...combatState.duo },
    enemy: { ...combatState.enemy },
    statuses: cloneStatuses(combatState.statuses),
  };
}

/**
 * La résolution d'une zone est-elle bloquée ? On vérifie d'abord le POUVOIR
 * (épuisement), puis la ZONE (gel). Le gel n'affecte que les pouvoirs offensifs
 * ou de soutien ; les « special » résolvent normalement.
 *
 * Conceptuellement « le pouvoir résout, puis la zone résout » : ce contrôle a
 * lieu en amont mais le gel représente un effet de la zone, postérieur à celui
 * du pouvoir dans la hiérarchie conceptuelle.
 *
 * Si `emit` est vrai, on émet l'event correspondant à la cause du blocage
 * (`power_blocked_by_exhaustion` ou `power_blocked_by_area`). On ne l'émet QUE
 * depuis la boucle de résolution réelle — pas depuis l'estimateur, ni depuis la
 * passe de finalisation — pour ne pas dédoubler ni polluer les journaux.
 * @param {object} work   combatState de travail
 * @param {object} area   zone courante (avec ses statuts)
 * @param {object} power  pouvoir de la zone (non nul)
 * @param {boolean} [emit]
 * @returns {boolean}
 */
function isResolutionBlocked(work, area, power, emit = false) {
  if (hasEntityStatus(work, power, EXHAUSTION_ID)) { // pouvoir d'abord
    if (emit) {
      emitEvent(work, 'power_blocked_by_exhaustion', { position: area.position, powerId: power.id });
    }
    return true;
  }
  if (hasAreaStatus(work, area.position, FREEZE_ID) && FREEZABLE_TYPES.has(power.type)) { // zone ensuite
    if (emit) {
      emitEvent(work, 'power_blocked_by_area', { position: area.position, powerId: power.id });
    }
    return true;
  }
  return false;
}

// --- API principale ---------------------------------------------------------

/**
 * Résout l'ensemble du plateau SANS muter l'entrée (travaille sur des copies).
 * @param {Array} boardState   9 zones (index 0–8) : { position, power, statuses }.
 * @param {object} combatState { duo:{...}, enemy:{...}, statuses, board, events }
 * @param {object} [options]
 * @param {boolean} [options.emit]  émettre les events de blocage (true pour la
 *   résolution réelle ; false pour l'estimateur, afin de ne pas polluer les journaux).
 * @returns {{ duo:object, enemy:object, activations:Array }}
 *   duo : { attack, defense, hp, maneuver, strategy, credit } (valeurs résolues)
 *   enemy : { attack, defense, hp }
 *   activations : [{ position, powerId, effects:[{effect,value}] }] (ordre de résolution)
 */
export function resolveBoard(boardState, combatState, { emit = false } = {}) {
  const work = cloneForResolve(combatState);
  // Zones clonées ; le moteur de statuts (statuses d'area) lit work.board.
  const board = cloneBoard(boardState);
  work.board = board;

  // 1) Modificateurs de statuts ET de signatures, avant la résolution.
  applyModifiers(work);
  applyPerkModifiers(work);

  const activationByPos = {};
  for (const pos of RESOLUTION_ORDER) {
    const area = board[pos];
    const power = area?.power;
    if (!power) continue;

    // Le pouvoir résout, puis la zone : si l'un ou l'autre bloque, customResolve
    // n'est pas exécuté (aucun effet). C'est ici (et seulement ici) qu'on émet
    // l'event de blocage.
    if (isResolutionBlocked(work, area, power, emit)) continue;

    const ctx = buildContext(pos, board, work);
    ctx.effects = []; // journal des effets de ce pouvoir (pour les messages)
    if (typeof power.customResolve === 'function') power.customResolve(ctx);

    // 2) Triggers de statuts ET de signatures, après chaque pouvoir résolu.
    evaluateTriggers(work, ctx);
    evaluatePerkTriggers(work, ctx);

    activationByPos[pos] = { position: pos, powerId: power.id, effects: ctx.effects };
  }

  // 3) Finalisation des renforts (empowerNeighborsOfType) : appliqués APRÈS la
  // boucle pour toucher tous les voisins concernés quel que soit l'ordre. Le
  // bonus compte dans l'attaque du duo et est attribué au pouvoir renforcé.
  if (work._attackBonus instanceof Map) {
    for (const pos of RESOLUTION_ORDER) {
      const area = board[pos];
      const power = area?.power;
      if (!power || isResolutionBlocked(work, area, power)) continue;
      const bonus = work._attackBonus.get(power);
      if (!bonus) continue;
      work.duo.attack += bonus;
      const act = activationByPos[pos]
        ?? (activationByPos[pos] = { position: pos, powerId: power.id, effects: [] });
      const existing = act.effects.find((e) => e.effect === 'add_attack');
      if (existing) existing.value += bonus;
      else act.effects.push({ effect: 'add_attack', value: bonus });
    }
  }

  // Activations dans l'ordre de résolution, seulement celles ayant des effets.
  const activations = [];
  for (const pos of RESOLUTION_ORDER) {
    const act = activationByPos[pos];
    if (act && act.effects.length > 0) activations.push(act);
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
