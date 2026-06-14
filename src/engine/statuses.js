// src/engine/statuses.js — Moteur de gestion des statuts.
//
// Une INSTANCE de status (en jeu) est minimale, selon sa cible :
//   - 'duo' / 'enemy' : { id, stacks, target }
//   - 'entity'        : { id, stacks, target:'entity', entity }   // objet visé (un pouvoir)
//   - 'area'          : { id, stacks, target:'area', position }   // case 0–8 du plateau
//   id     : référence à la définition (src/data/statuses/).
//   stacks : valeur unique, sémantique définie par la définition (intensité,
//            durée, ou les deux — à la manière de Slay the Spire).
//
// La DÉFINITION (data) décrit le comportement : { id, stackable, modifiers,
// triggers, onTurnEnd, immunityFlag?, onLimitReached? }. Voir docs/status-system.md.
//
// STOCKAGE :
//   - duo / enemy : combatState.statuses.duo / .enemy        (tableaux)
//   - entity      : combatState.statuses.entities            (Map<objet, instance[]>)
//   - area        : combatState.board[position].statuses     (tableau, sur la zone)
//
// LIMITES DE SLOTS : chaque type de cible a un nombre maximal de statuts
// simultanés (gameState.js). Quand la limite est atteinte et qu'un NOUVEL id
// arrive, le champ `onLimitReached` de la définition décide :
//   - 'overwrite'     : on évince le(s) plus ancien(s) pour faire de la place ;
//   - 'ignore'        : le nouveau statut n'est pas appliqué ;
//   - 'stack_if_same' : si un statut de même id occupe un slot, on additionne ses
//                       stacks ; sinon comportement 'ignore'.
// (Réappliquer un id DÉJÀ présent ne consomme pas de slot : voir applyStatus.)
//
// Aucun DOM.

import { getStatusDefById } from '../data/statuses/index.js';
import {
  MAX_STATUSES_PER_DUO,
  MAX_STATUSES_PER_ENEMY,
  MAX_STATUSES_PER_ENTITY,
  MAX_STATUSES_PER_AREA,
} from './gameState.js';

/** Limite de slots par type de cible. */
const SLOT_LIMIT = {
  duo: MAX_STATUSES_PER_DUO,
  enemy: MAX_STATUSES_PER_ENEMY,
  entity: MAX_STATUSES_PER_ENTITY,
  area: MAX_STATUSES_PER_AREA,
};

/** Garantit la présence du conteneur de statuts duo/enemy/entities. */
function ensureStore(combatState) {
  if (!combatState.statuses) {
    combatState.statuses = { duo: [], enemy: [], entities: new Map() };
  }
  return combatState.statuses;
}

/**
 * Clé de cible (selon `target`) extraite d'une instance :
 *   entity → l'objet ; area → la position ; duo/enemy → undefined.
 */
function targetKey(instance) {
  if (instance.target === 'entity') return instance.entity;
  if (instance.target === 'area') return instance.position;
  return undefined;
}

/**
 * Tableau de statuts d'une cible (création paresseuse si nécessaire), ou null si
 * la cible n'existe pas (ex. zone hors plateau).
 */
function getList(combatState, target, key) {
  if (target === 'duo' || target === 'enemy') {
    return ensureStore(combatState)[target];
  }
  if (target === 'entity') {
    const store = ensureStore(combatState);
    let list = store.entities.get(key);
    if (!list) { list = []; store.entities.set(key, list); }
    return list;
  }
  if (target === 'area') {
    const area = combatState.board?.[key];
    if (!area) return null;
    if (!Array.isArray(area.statuses)) area.statuses = [];
    return area.statuses;
  }
  return null;
}

/** Toutes les instances actives (duo + enemy + entities + zones), à plat. */
function activeStatuses(combatState) {
  const out = [];
  const s = combatState.statuses;
  if (s) {
    out.push(...(s.duo ?? []), ...(s.enemy ?? []));
    if (s.entities instanceof Map) {
      for (const list of s.entities.values()) out.push(...list);
    }
  }
  if (Array.isArray(combatState.board)) {
    for (const area of combatState.board) {
      if (area && Array.isArray(area.statuses)) out.push(...area.statuses);
    }
  }
  return out;
}

/**
 * Applique un status à sa cible.
 *
 * 1. Si un statut de MÊME id occupe déjà un slot : on met à jour ses stacks sans
 *    consommer de slot — on additionne si la définition est `stackable` (ou si
 *    `onLimitReached === 'stack_if_same'`), sinon on remplace.
 * 2. Sinon, s'il reste de la place : on ajoute l'instance.
 * 3. Sinon (limite atteinte, ids différents) : on applique `onLimitReached`.
 *
 * Cible entity : `instance.entity` requis, et l'IMMUNITÉ est respectée — si la
 * définition déclare `immunityFlag` et que l'entité porte ce drapeau, rien n'est
 * appliqué. Cible area : `instance.position` requis.
 *
 * @param {object} combatState
 * @param {{id:string, stacks:number, target:string, entity?:object, position?:number}} instance
 */
export function applyStatus(combatState, instance) {
  const { id, target } = instance;
  const stacks = instance.stacks ?? 0;
  const def = getStatusDefById(id);
  const key = targetKey(instance);

  // Immunité (entités uniquement).
  if (target === 'entity' && def?.immunityFlag && key?.[def.immunityFlag]) return;

  const list = getList(combatState, target, key);
  if (!list) return;

  // 1) Même id déjà présent : mise à jour des stacks, pas de slot consommé.
  const existing = list.find((st) => st.id === id);
  if (existing) {
    const add = def?.stackable || def?.onLimitReached === 'stack_if_same';
    existing.stacks = add ? existing.stacks + stacks : stacks;
    return;
  }

  const limit = SLOT_LIMIT[target] ?? Infinity;

  // 2) De la place disponible : on ajoute.
  if (list.length < limit) {
    list.push(makeInstance(id, stacks, target, instance));
    return;
  }

  // 3) Limite atteinte (ids tous différents) : selon onLimitReached.
  switch (def?.onLimitReached) {
    case 'overwrite':
      while (list.length >= limit) list.shift(); // évince le(s) plus ancien(s)
      list.push(makeInstance(id, stacks, target, instance));
      break;
    case 'stack_if_same': // aucun même id ici → comme 'ignore'
    case 'ignore':
    default:
      break;
  }
}

/** Construit une instance de status stockable selon sa cible. */
function makeInstance(id, stacks, target, source) {
  const inst = { id, stacks, target };
  if (target === 'entity') inst.entity = source.entity;
  else if (target === 'area') inst.position = source.position;
  return inst;
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

/** Retire un status d'une zone. */
export function removeAreaStatus(combatState, position, statusId) {
  const area = combatState.board?.[position];
  if (area && Array.isArray(area.statuses)) {
    area.statuses = area.statuses.filter((st) => st.id !== statusId);
  }
}

/** Présence d'un status sur une cible duo/enemy. */
export function hasStatus(combatState, statusId, target) {
  const list = combatState.statuses?.[target];
  return Array.isArray(list) && list.some((st) => st.id === statusId);
}

/** Présence d'un status sur une entité. */
export function hasEntityStatus(combatState, entity, statusId) {
  const list = combatState.statuses?.entities?.get(entity);
  return Array.isArray(list) && list.some((st) => st.id === statusId);
}

/** Présence d'un status sur une zone. */
export function hasAreaStatus(combatState, position, statusId) {
  const list = combatState.board?.[position]?.statuses;
  return Array.isArray(list) && list.some((st) => st.id === statusId);
}

/** Stacks d'un status duo/enemy, ou 0. */
export function getStacks(combatState, statusId, target) {
  const list = combatState.statuses?.[target];
  return list?.find((st) => st.id === statusId)?.stacks ?? 0;
}

/** Stacks d'un status d'entité, ou 0. */
export function getEntityStacks(combatState, entity, statusId) {
  const list = combatState.statuses?.entities?.get(entity);
  return list?.find((st) => st.id === statusId)?.stacks ?? 0;
}

/** Stacks d'un status de zone, ou 0. */
export function getAreaStacks(combatState, position, statusId) {
  const list = combatState.board?.[position]?.statuses;
  return list?.find((st) => st.id === statusId)?.stacks ?? 0;
}

/**
 * Applique tous les modificateurs actifs au combatState (à appeler chaque tour,
 * avant la résolution). Chaque modifier altère combatState[target][property].
 * Les statuts dont la cible n'a pas d'objet de stats (entity, area) sont ignorés.
 */
export function applyModifiers(combatState) {
  for (const status of activeStatuses(combatState)) {
    const def = getStatusDefById(status.id);
    if (!def) continue;
    const subject = combatState[status.target]; // duo / enemy ; sinon undefined
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

/** Retire les statuts épuisés (stacks <= 0) sur toutes les cibles. */
function pruneStatuses(combatState) {
  const s = combatState.statuses;
  if (s) {
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
  if (Array.isArray(combatState.board)) {
    for (const area of combatState.board) {
      if (area && Array.isArray(area.statuses)) {
        area.statuses = area.statuses.filter((st) => st.stacks > 0);
      }
    }
  }
}
