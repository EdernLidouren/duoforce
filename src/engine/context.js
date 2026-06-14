// src/engine/context.js — Helpers de lecture/écriture du contexte de combat.
//
// Le « contexte » (ctx) est construit par resolveBoard pour chaque pouvoir résolu :
//   {
//     position,            // index 0–8 de la zone
//     power,               // le pouvoir de la zone courante (objet)
//     area,                // la zone courante : { position, power, statuses }
//     neighbors,           // POUVOIRS voisins orthogonaux (tableau, peut être vide)
//     neighborsByDir,      // { left, right, above, below } → pouvoir voisin ou null
//     neighborAreasByDir,  // { left, right, above, below } → ZONE voisine ou null
//     boardState,          // les 9 zones (copie de travail)
//     combatState,         // état de combat (copie de travail mutée par les écritures)
//     effects,             // (optionnel) journal des effets, pour les messages
//   }
//
// Les helpers de voisinage qui retournent un « voisin » renvoient des objets
// POUVOIR (pas des zones), pour ne pas casser les customResolve existants. Pour
// accéder aux statuts d'une zone voisine, utiliser getNeighborArea.
//
// LECTURE : helpers sur le plateau (position, voisins).
// ÉCRITURE : helpers qui MUTENT ctx.combatState directement et ne retournent
// rien. Chaque écriture enregistre aussi un descripteur { effect, value } dans
// ctx.effects (s'il existe) pour la construction des messages de fin de tour.
//
// Aucun DOM.

// --- Lecture du plateau -----------------------------------------------------

/**
 * Pouvoir voisin dans une direction, ou null.
 * @param {object} ctx
 * @param {'left'|'right'|'above'|'below'} dir
 * @returns {object|null}
 */
export function getNeighbor(ctx, dir) {
  return ctx.neighborsByDir?.[dir] ?? null;
}

/**
 * Zone voisine dans une direction, ou null. Utile pour lire les statuts de la
 * zone voisine (`area.statuses`) ou son pouvoir (`area.power`).
 * @param {object} ctx
 * @param {'left'|'right'|'above'|'below'} dir
 * @returns {object|null}
 */
export function getNeighborArea(ctx, dir) {
  return ctx.neighborAreasByDir?.[dir] ?? null;
}

/** true si ctx.position appartient au tableau de cases. */
export function isInZone(ctx, cells) {
  return Array.isArray(cells) && cells.includes(ctx.position);
}

/** true s'il existe un voisin orthogonal du type donné. */
export function hasNeighborOfType(ctx, type) {
  return ctx.neighbors.some((n) => n.type === type);
}

/** true s'il existe un voisin orthogonal de l'id donné. */
export function hasNeighborById(ctx, id) {
  return ctx.neighbors.some((n) => n.id === id);
}

/** true si le pouvoir n'a aucun voisin orthogonal. */
export function isIsolated(ctx) {
  return ctx.neighbors.length === 0;
}

/** Nombre de voisins orthogonaux du type donné. */
export function countNeighborsOfType(ctx, type) {
  return ctx.neighbors.filter((n) => n.type === type).length;
}

// --- Écriture du combat (mutations de ctx.combatState) ----------------------

/** Enregistre un effet pour les messages, si un journal est présent. */
function record(ctx, effect, value) {
  if (Array.isArray(ctx.effects)) ctx.effects.push({ effect, value });
}

export function addAttack(ctx, n) {
  ctx.combatState.duo.attack += n;
  record(ctx, 'add_attack', n);
}
export function removeAttack(ctx, n) {
  ctx.combatState.duo.attack -= n;
  record(ctx, 'remove_attack', n);
}
export function addDefense(ctx, n) {
  ctx.combatState.duo.defense += n;
  record(ctx, 'add_defense', n);
}
export function removeDefense(ctx, n) {
  ctx.combatState.duo.defense -= n;
  record(ctx, 'remove_defense', n);
}

export function addEnemyAttack(ctx, n) {
  ctx.combatState.enemy.attack += n;
  record(ctx, 'add_enemy_attack', n);
}
export function removeEnemyAttack(ctx, n) {
  ctx.combatState.enemy.attack -= n;
  record(ctx, 'remove_enemy_attack', n);
}
export function addEnemyDefense(ctx, n) {
  ctx.combatState.enemy.defense += n;
  record(ctx, 'add_enemy_defense', n);
}
export function removeEnemyDefense(ctx, n) {
  ctx.combatState.enemy.defense -= n;
  record(ctx, 'remove_enemy_defense', n);
}

export function multiplyAttack(ctx, n) {
  ctx.combatState.duo.attack *= n;
  record(ctx, 'multiply_attack', n);
}
export function multiplyDefense(ctx, n) {
  ctx.combatState.duo.defense *= n;
  record(ctx, 'multiply_defense', n);
}
export function multiplyEnemyAttack(ctx, n) {
  ctx.combatState.enemy.attack *= n;
  record(ctx, 'multiply_enemy_attack', n);
}
export function multiplyEnemyDefense(ctx, n) {
  ctx.combatState.enemy.defense *= n;
  record(ctx, 'multiply_enemy_defense', n);
}

export function heal(ctx, n) {
  const duo = ctx.combatState.duo;
  duo.hp = Math.min(duo.maxHp ?? Infinity, duo.hp + n);
  record(ctx, 'heal', n);
}
export function enemyHeal(ctx, n) {
  const enemy = ctx.combatState.enemy;
  enemy.hp = Math.min(enemy.maxHp ?? Infinity, enemy.hp + n);
  record(ctx, 'enemy_heal', n);
}

/**
 * Renforce les voisins orthogonaux d'un type donné : enregistre un bonus
 * d'attaque qui sera attribué à CHAQUE voisin au moment où la résolution se
 * finalise (cf. resolveBoard), indépendamment de l'ordre de résolution. Le bonus
 * compte donc dans l'attaque du duo et apparaît dans le message du voisin, pas
 * dans celui du pouvoir qui renforce.
 * @param {object} ctx
 * @param {string} type   type de pouvoir voisin à renforcer (ex. 'offensive')
 * @param {number} amount bonus d'attaque par voisin concerné
 */
export function empowerNeighborsOfType(ctx, type, amount) {
  const cs = ctx.combatState;
  if (!(cs._attackBonus instanceof Map)) cs._attackBonus = new Map();
  for (const n of ctx.neighbors) {
    if (n.type === type) cs._attackBonus.set(n, (cs._attackBonus.get(n) ?? 0) + amount);
  }
}

export function grantManeuver(ctx, n) {
  ctx.combatState.duo.maneuver += n;
  record(ctx, 'maneuver', n);
}
export function grantStrategy(ctx, n) {
  ctx.combatState.duo.strategy += n;
  record(ctx, 'strategy', n);
}
export function grantCredit(ctx, n) {
  ctx.combatState.duo.credit += n;
  record(ctx, 'credit', n);
}
