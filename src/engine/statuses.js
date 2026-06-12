// src/engine/statuses.js — Moteur de gestion des statuts.
//
// Une INSTANCE de status (en jeu) est minimale : { id, stacks, target }.
//   - id     : référence à la définition (src/data/statuses/).
//   - stacks : valeur unique, sémantique définie par la définition (intensité,
//              durée, ou les deux — à la manière de Slay the Spire).
//   - target : 'duo' | 'enemy' | 'entity'.
//
// La DÉFINITION (data) décrit le comportement : { id, stackable, modifiers,
// triggers, onTurnEnd }. Voir docs/status-system.md.
//
// Stockage : combatState.statuses = { duo: [], enemy: [], entities: Map }.
//   - duo / enemy : tableaux d'instances.
//   - entities    : Map indexée par id de status (une instance par id) — support
//                   minimal des statuts d'entité (pas d'identité d'entité dans
//                   l'API actuelle).
//
// Aucun DOM.

import { getStatusDefById } from '../data/statuses/index.js';

/** Garantit la présence du conteneur de statuts. */
function ensureStore(combatState) {
  if (!combatState.statuses) {
    combatState.statuses = { duo: [], enemy: [], entities: new Map() };
  }
  return combatState.statuses;
}

/** Toutes les instances actives (duo + enemy + entities), à plat. */
function activeStatuses(combatState) {
  const s = combatState.statuses;
  if (!s) return [];
  const out = [...(s.duo ?? []), ...(s.enemy ?? [])];
  if (s.entities instanceof Map) out.push(...s.entities.values());
  return out;
}

/** Retrouve l'instance d'un status sur une cible, ou null. */
function findStatus(combatState, statusId, target) {
  const s = combatState.statuses;
  if (!s) return null;
  if (target === 'entity') return s.entities?.get(statusId) ?? null;
  const list = s[target];
  return Array.isArray(list) ? (list.find((st) => st.id === statusId) ?? null) : null;
}

/**
 * Applique un status : si déjà présent, cumule les stacks (status stackable) ou
 * remplace (sinon) ; sinon ajoute l'instance.
 * @param {object} combatState
 * @param {{id:string, stacks:number, target:string}} statusInstance
 */
export function applyStatus(combatState, statusInstance) {
  const store = ensureStore(combatState);
  const { id, target } = statusInstance;
  const stacks = statusInstance.stacks ?? 0;
  const def = getStatusDefById(id);

  const existing = findStatus(combatState, id, target);
  if (existing) {
    if (def?.stackable) existing.stacks += stacks;
    else existing.stacks = stacks;
    return;
  }

  const fresh = { id, stacks, target };
  if (target === 'entity') store.entities.set(id, fresh);
  else if (Array.isArray(store[target])) store[target].push(fresh);
}

/** Retire un status d'une cible. */
export function removeStatus(combatState, statusId, target) {
  const s = combatState.statuses;
  if (!s) return;
  if (target === 'entity') {
    s.entities?.delete(statusId);
    return;
  }
  const list = s[target];
  if (Array.isArray(list)) {
    const i = list.findIndex((st) => st.id === statusId);
    if (i >= 0) list.splice(i, 1);
  }
}

/** Présence d'un status sur une cible. */
export function hasStatus(combatState, statusId, target) {
  return findStatus(combatState, statusId, target) !== null;
}

/** Stacks d'un status sur une cible, ou 0. */
export function getStacks(combatState, statusId, target) {
  return findStatus(combatState, statusId, target)?.stacks ?? 0;
}

/**
 * Applique tous les modificateurs actifs au combatState (à appeler chaque tour,
 * avant la résolution). Chaque modifier altère combatState[target][property].
 */
export function applyModifiers(combatState) {
  for (const status of activeStatuses(combatState)) {
    const def = getStatusDefById(status.id);
    if (!def) continue;
    const subject = combatState[status.target]; // objet duo / enemy
    if (!subject) continue; // 'entity' : pas de cible de statistique
    for (const mod of def.modifiers ?? []) {
      const n = mod.value(status.stacks);
      const prop = mod.property;
      if (mod.operation === 'add') subject[prop] = (subject[prop] ?? 0) + n;
      else if (mod.operation === 'multiply') subject[prop] = (subject[prop] ?? 0) * n;
      else if (mod.operation === 'override') subject[prop] = n;
    }
  }
}

/**
 * Évalue et déclenche les triggers actifs (à appeler en cours de tour, après
 * chaque pouvoir résolu). Les effets mutent via le contexte (helpers context.js).
 * @param {object} combatState
 * @param {object} ctx  contexte du pouvoir courant
 */
export function evaluateTriggers(combatState, ctx) {
  for (const status of activeStatuses(combatState)) {
    const def = getStatusDefById(status.id);
    if (!def) continue;
    for (const trig of def.triggers ?? []) {
      if (trig.condition(combatState)) trig.effect(ctx, status.stacks);
    }
  }
}

/**
 * Fin de tour : appelle onTurnEnd de chaque status, puis retire ceux dont les
 * stacks sont tombés à 0 ou moins.
 * @param {object} combatState
 */
export function processTurnEnd(combatState) {
  for (const status of activeStatuses(combatState)) {
    const def = getStatusDefById(status.id);
    if (def && typeof def.onTurnEnd === 'function') def.onTurnEnd(status, combatState);
  }
  pruneStatuses(combatState);
}

/** Retire les statuts épuisés (stacks <= 0). */
function pruneStatuses(combatState) {
  const s = combatState.statuses;
  if (!s) return;
  if (Array.isArray(s.duo)) s.duo = s.duo.filter((st) => st.stacks > 0);
  if (Array.isArray(s.enemy)) s.enemy = s.enemy.filter((st) => st.stacks > 0);
  if (s.entities instanceof Map) {
    for (const [key, st] of s.entities) {
      if (st.stacks <= 0) s.entities.delete(key);
    }
  }
}
