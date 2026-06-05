// src/engine/rules.js — Moteur de règles des pouvoirs.
//
// Implémente la résolution déclarative décrite dans docs/rules_system.md :
//   - Pour chaque pouvoir présent sur le plateau, on évalue ses `rules` dans
//     l'ordre ; la PREMIÈRE condition satisfaite produit son effet, les règles
//     suivantes sont ignorées. Si `customResolve` est une fonction, elle
//     remplace entièrement `rules`.
//   - Les pouvoirs sont résolus dans l'ordre de lecture : 6,7,8,3,4,5,0,1,2.
//   - Les valeurs de combat sont accumulées ; les multiplicateurs sont appliqués
//     une seule fois, à la fin, avant le calcul des dégâts.
//
// resolveBoard(boardState, combatState) retourne un objet d'effets accumulés
// { attack, defense, enemyAttack, enemyDefense, heal, enemyHeal, maneuver,
//   strategy, credit, draw, discard, exile }.
//
// Contrainte : logique pure, AUCUN DOM. Ne dépend que des données.

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
function neighborInDirection(pos, direction) {
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

/** Indices de la ligne d'une case. */
function rowIndices(pos) {
  return LAYOUT[COORD[pos].r].slice();
}

/** Indices de la colonne d'une case. */
function colIndices(pos) {
  const { c } = COORD[pos];
  return [LAYOUT[0][c], LAYOUT[1][c], LAYOUT[2][c]];
}

// --- Conditions -------------------------------------------------------------

/**
 * Évalue une condition de règle dans le contexte d'un pouvoir.
 * (Voir le guide d'implémentation de docs/rules_system.md.)
 * @param {string|number[]} condition
 * @param {object} context  { position, neighbors, boardState, combatState }
 * @returns {boolean}
 */
export function resolveCondition(condition, context) {
  if (condition === 'default') return true;
  if (Array.isArray(condition)) return condition.includes(context.position);
  if (condition === 'isolated') return context.neighbors.length === 0;
  if (typeof condition === 'string' && condition.startsWith('adjacent_to:')) {
    const target = condition.split(':')[1];
    return context.neighbors.some((n) => n.type === target || n.id === target);
  }
  return false;
}

// --- Cibles -----------------------------------------------------------------

/**
 * Résout une cible d'effet en une liste d'indices de cases (non filtrés).
 * @param {string|number[]} target
 * @param {number} pos
 * @returns {number[]}
 */
function resolveTargets(target, pos) {
  if (Array.isArray(target)) return target.slice();
  switch (target) {
    case 'self': return [pos];
    case 'above':
    case 'below':
    case 'left':
    case 'right': {
      const i = neighborInDirection(pos, target);
      return i === null ? [] : [i];
    }
    case 'neighbors': return neighborIndices(pos);
    case 'row': return rowIndices(pos);
    case 'col': return colIndices(pos);
    default: return [];
  }
}

// --- Accumulateur d'effets --------------------------------------------------

function createAccumulator() {
  return {
    addAttack: 0,
    addDefense: 0,
    addEnemyAttack: 0,
    addEnemyDefense: 0,
    multAttack: 1,
    multDefense: 1,
    multEnemyAttack: 1,
    multEnemyDefense: 1,
    heal: 0,
    enemyHeal: 0,
    maneuver: 0,
    strategy: 0,
    credit: 0,
    draw: 0,
    discard: [],
    exile: [],
  };
}

/**
 * Applique un effet à l'accumulateur. Pour discard/exile, mute `board` (copie de
 * travail) en retirant les cases ciblées : un pouvoir retiré ne sera ni résolu
 * ni compté comme voisin par la suite (cohérent avec « le pouvoir précédent sera
 * inactif » de docs/combats.md).
 * @param {object} acc
 * @param {{effect:string,value:number,target?:any}} eff
 * @param {number} pos
 * @param {Array} board  copie de travail mutable
 */
function applyEffect(acc, eff, pos, board) {
  const v = eff.value ?? 0;
  switch (eff.effect) {
    case 'add_attack': acc.addAttack += v; break;
    case 'remove_attack': acc.addAttack -= v; break;
    case 'add_defense': acc.addDefense += v; break;
    case 'remove_defense': acc.addDefense -= v; break;
    case 'add_enemy_attack': acc.addEnemyAttack += v; break;
    case 'remove_enemy_attack': acc.addEnemyAttack -= v; break;
    case 'add_enemy_defense': acc.addEnemyDefense += v; break;
    case 'remove_enemy_defense': acc.addEnemyDefense -= v; break;

    case 'multiply_attack': acc.multAttack *= v; break;
    case 'multiply_defense': acc.multDefense *= v; break;
    case 'multiply_enemy_attack': acc.multEnemyAttack *= v; break;
    case 'multiply_enemy_defense': acc.multEnemyDefense *= v; break;

    case 'heal': acc.heal += v; break;
    case 'enemy_heal': acc.enemyHeal += v; break;
    case 'maneuver': acc.maneuver += v; break;
    case 'strategy': acc.strategy += v; break;
    case 'credit': acc.credit += v; break;
    case 'draw': acc.draw += v; break;

    case 'discard':
    case 'exile': {
      // « jusqu'à N pouvoirs » parmi les cases ciblées non vides.
      const candidates = resolveTargets(eff.target, pos).filter((i) => board[i] != null);
      const sink = eff.effect === 'exile' ? acc.exile : acc.discard;
      for (const i of candidates.slice(0, v)) {
        board[i] = null;
        sink.push(i);
      }
      break;
    }

    default: break; // effet inconnu : ignoré silencieusement
  }
}

// --- Résolution d'un pouvoir ------------------------------------------------

/** Construit le contexte passé aux conditions / customResolve. */
function buildContext(pos, board, combatState) {
  const neighbors = neighborIndices(pos)
    .map((i) => board[i])
    .filter((p) => p != null);
  return { position: pos, neighbors, boardState: board, combatState };
}

/**
 * Détermine les effets produits par un pouvoir : customResolve si présent,
 * sinon la première règle dont la condition est satisfaite.
 * @returns {Array<{effect:string,value:number,target?:any}>}
 */
function resolvePowerEffects(power, context) {
  if (typeof power.customResolve === 'function') {
    const out = power.customResolve(context);
    return Array.isArray(out) ? out : [];
  }
  for (const rule of power.rules) {
    if (resolveCondition(rule.condition, context)) {
      return [{ effect: rule.effect, value: rule.value, target: rule.target }];
    }
  }
  return [];
}

// --- Finalisation -----------------------------------------------------------

/** Applique les multiplicateurs aux sommes additives et borne à 0. */
function finalize(acc, combatState) {
  const duo = combatState?.duo ?? { attack: 0, defense: 0 };
  const enemy = combatState?.enemy ?? { attack: 0, defense: 0 };
  const clamp = (n) => Math.max(0, n);

  return {
    attack: clamp((duo.attack + acc.addAttack) * acc.multAttack),
    defense: clamp((duo.defense + acc.addDefense) * acc.multDefense),
    enemyAttack: clamp((enemy.attack + acc.addEnemyAttack) * acc.multEnemyAttack),
    enemyDefense: clamp((enemy.defense + acc.addEnemyDefense) * acc.multEnemyDefense),
    heal: acc.heal,
    enemyHeal: acc.enemyHeal,
    maneuver: acc.maneuver,
    strategy: acc.strategy,
    credit: acc.credit,
    draw: acc.draw,
    discard: acc.discard,
    exile: acc.exile,
  };
}

// --- API principale ---------------------------------------------------------

/**
 * Résout l'ensemble du plateau et retourne les effets accumulés.
 * @param {Array} boardState   9 cases (index 0–8), null si vide.
 * @param {object} combatState { duo: { attack, defense, ... }, enemy: { attack, defense, ... } }
 * @returns {object} effets accumulés (voir en-tête de fichier).
 */
export function resolveBoard(boardState, combatState) {
  // Copie de travail : discard/exile retirent des cases sans toucher l'entrée.
  const board = boardState.slice();
  const acc = createAccumulator();

  for (const pos of RESOLUTION_ORDER) {
    const power = board[pos];
    if (!power) continue; // case vide ou pouvoir retiré pendant la résolution

    const context = buildContext(pos, board, combatState);
    const effects = resolvePowerEffects(power, context);
    for (const eff of effects) {
      applyEffect(acc, eff, pos, board);
    }
  }

  return finalize(acc, combatState);
}
