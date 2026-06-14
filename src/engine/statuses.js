// src/engine/statuses.js — Moteur de gestion des statuts.
//
// Une INSTANCE de status (en jeu) est minimale :
//   - cible duo/enemy : { id, stacks, target }.
//   - cible entity     : { id, stacks, target:'entity', entity } — `entity` est
//                        l'objet visé (ex. un pouvoir sur le plateau).
//   id     : référence à la définition (src/data/statuses/).
//   stacks : valeur unique, sémantique définie par la définition (intensité,
//            durée, ou les deux — à la manière de Slay the Spire).
//
// La DÉFINITION (data) décrit le comportement : { id, stackable, modifiers,
// triggers, onTurnEnd, immunityFlag? }. Voir docs/status-system.md.
//
// Stockage : combatState.statuses = { duo: [], enemy: [], entities: Map }.
//   - duo / enemy : tableaux d'instances.
//   - entities    : Map indexée par OBJET visé → tableau d'instances. Permet
//                   plusieurs entités statutées simultanément (ex. plusieurs
//                   pouvoirs épuisés), chacune pouvant porter plusieurs statuts.
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
  if (s.entities instanceof Map) {
    for (const list of s.entities.values()) out.push(...list);
  }
  return out;
}

/** Retrouve l'instance d'un status duo/enemy, ou null. */
function findStatus(combatState, statusId, target) {
  const list = combatState.statuses?.[target];
  return Array.isArray(list) ? (list.find((st) => st.id === statusId) ?? null) : null;
}

/**
 * Applique un status : si déjà présent sur la cible, cumule les stacks (status
 * stackable) ou remplace (sinon) ; sinon ajoute l'instance.
 *
 * Cible entity : `statusInstance.entity` est requis. Une IMMUNITÉ peut bloquer
 * l'application — si la définition déclare `immunityFlag` et que l'entité porte
 * ce drapeau (ex. `immuneToExhaustion: true`), le status n'est pas appliqué.
 *
 * @param {object} combatState
 * @param {{id:string, stacks:number, target:string, entity?:object}} statusInstance
 */
export function applyStatus(combatState, statusInstance) {
  const store = ensureStore(combatState);
  const { id, target } = statusInstance;
  const stacks = statusInstance.stacks ?? 0;
  const def = getStatusDefById(id);

  if (target === 'entity') {
    const entity = statusInstance.entity;
    if (!entity) return;
    // Immunité : un drapeau sur l'entité peut bloquer ce status.
    if (def?.immunityFlag && entity[def.immunityFlag]) return;
    const list = store.entities.get(entity) ?? [];
    const existing = list.find((st) => st.id === id);
    if (existing) {
      existing.stacks = def?.stackable ? existing.stacks + stacks : stacks;
    } else {
      list.push({ id, stacks, target, entity });
      store.entities.set(entity, list);
    }
    return;
  }

  const existing = findStatus(combatState, id, target);
  if (existing) {
    existing.stacks = def?.stackable ? existing.stacks + stacks : stacks;
    return;
  }
  if (Array.isArray(store[target])) store[target].push({ id, stacks, target });
}

/** Retire un status d'une cible duo/enemy. */
export function removeStatus(combatState, statusId, target) {
  const list = combatState.statuses?.[target];
  if (Array.isArray(list)) {
    const i = list.findIndex((st) => st.id === statusId);
    if (i >= 0) list.splice(i, 1);
  }
}

/** Retire un status d'une entité. */
export function removeEntityStatus(combatState, entity, statusId) {
  const map = combatState.statuses?.entities;
  if (!(map instanceof Map)) return;
  const list = map.get(entity);
  if (!list) return;
  const kept = list.filter((st) => st.id !== statusId);
  if (kept.length === 0) map.delete(entity);
  else map.set(entity, kept);
}

/** Présence d'un status sur une cible duo/enemy. */
export function hasStatus(combatState, statusId, target) {
  return findStatus(combatState, statusId, target) !== null;
}

/** Présence d'un status sur une entité. */
export function hasEntityStatus(combatState, entity, statusId) {
  const list = combatState.statuses?.entities?.get(entity);
  return Array.isArray(list) && list.some((st) => st.id === statusId);
}

/** Stacks d'un status duo/enemy, ou 0. */
export function getStacks(combatState, statusId, target) {
  return findStatus(combatState, statusId, target)?.stacks ?? 0;
}

/** Stacks d'un status d'entité, ou 0. */
export function getEntityStacks(combatState, entity, statusId) {
  const list = combatState.statuses?.entities?.get(entity);
  return list?.find((st) => st.id === statusId)?.stacks ?? 0;
}

/**
 * Applique tous les modificateurs actifs au combatState (à appeler chaque tour,
 * avant la résolution). Chaque modifier altère combatState[target][property].
 * Les statuts d'entité (target absent de combatState) sont ignorés ici.
 */
export function applyModifiers(combatState) {
  for (const status of activeStatuses(combatState)) {
    const def = getStatusDefById(status.id);
    if (!def) continue;
    const subject = combatState[status.target]; // objet duo / enemy ('entity' : aucun)
    if (!subject) continue;
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
    for (const [entity, list] of s.entities) {
      const kept = list.filter((st) => st.stacks > 0);
      if (kept.length === 0) s.entities.delete(entity);
      else s.entities.set(entity, kept);
    }
  }
}
