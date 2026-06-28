// src/engine/actions.js — Pipeline de validation, d'interception et d'exécution
// d'actions.
//
// Toute action significative du jeu (statuts, dégâts hors résolution, déplacements,
// soins…) transite par executeAction. Les intercepteurs peuvent bloquer ou modifier
// l'action avant exécution ; le dispatcher (dispatch) route ensuite vers l'exécuteur
// correspondant si l'action n'est pas annulée.
//
// Voir docs/action-system.md pour le guide complet.
//
// Types d'action supportés et encodage de leur target/value :
//
//   'apply_status'  target: { type, entity?, position? }  value: { statusId, stacks }
//   'remove_status' target: { type, entity?, position? }  value: { statusId }
//   'modify_status' target: { type, entity?, position? }  value: { statusId, stacksDelta }
//   'deal_damage'   target: 'duo'|'enemy'                 value: number  data.unblockable?
//   'add_attack'    target: 'duo'|'enemy'                 value: number
//   'add_defense'   target: 'duo'|'enemy'                 value: number
//   'swap_powers'   source: number (pos source)  target: number (pos cible)
//                   data.maxDistance?: number
//   'spend_maneuver' target: 'duo'|'enemy'               value: number
//   'move_power'    source: number (position)             target: number (position)
//
// Pour target de type statut :
//   type 'duo'    → héros du joueur
//   type 'enemy'  → ennemi
//   type 'entity' → entité (pouvoir), clé = entity (ref objet)
//   type 'area'   → zone du plateau, clé = position (0–8)
//
// Aucun DOM.

import {
  hasAreaStatus,
  applyStatus as rawApplyStatus,
  removeStatus as rawRemoveStatus,
  removeEntityStatus as rawRemoveEntityStatus,
  removeAreaStatus as rawRemoveAreaStatus,
  modifyStatusStacks,
} from './statuses.js';
import { getStatusDefById } from '../data/statuses/index.js';
import { manhattanDistance } from './rules.js';
import { MAX_ACTION_DEPTH } from './gameState.js';

// --- Registre ---------------------------------------------------------------

/** Tableau de { actionType, fn } — réinitialisé à chaque combat via initInterceptors. */
const registry = [];

/**
 * Enregistre un intercepteur pour un type d'action (ou '*' pour tous les types).
 * `fn(action, combatState)` peut muter l'action (cancelled, reason, value…).
 * @param {string} actionType
 * @param {(action:object, combatState:object) => void} fn
 */
export function registerInterceptor(actionType, fn) {
  registry.push({ actionType, fn });
}

/** Vide le registre. Préférer initInterceptors() qui réenregistre les natifs. */
export function clearInterceptors() {
  registry.length = 0;
}

// --- Fabrique d'action ------------------------------------------------------

/**
 * Crée un objet action avec les valeurs par défaut.
 * @param {string} type
 * @param {object} [fields]
 * @returns {{ type, source, target, value, data, cancelled, reason }}
 */
export function createAction(type, { source = null, target = null, value = null, data = {} } = {}) {
  return { type, source, target, value, data, cancelled: false, reason: null };
}

// --- Pipeline ---------------------------------------------------------------

/** Compteur de profondeur d'appel pour le garde-fou anti-cascade. */
let actionDepth = 0;

/**
 * Fait passer l'action par les intercepteurs uniquement (sans exécution).
 * Exporté pour validateAction et usages avancés — les appelants normaux
 * utilisent executeAction.
 * @param {object} combatState
 * @param {object} action
 * @returns {object} l'action (possiblement modifiée)
 */
export function processAction(combatState, action) {
  for (const { actionType, fn } of registry) {
    if (action.cancelled) break;
    if (actionType === '*' || actionType === action.type) {
      fn(action, combatState);
    }
  }
  return action;
}

/**
 * Vérifie la faisabilité d'une action en lecture seule (même verdict que
 * processAction, mais sur une copie — l'action originale n'est pas mutée).
 *
 * `data.sources` est réinitialisé sur la copie : les intercepteurs peuvent y
 * pousser l'origine de leur blocage (nom de statut, perk…). Le tableau retourné
 * dans `sources` liste toutes les origines collectées.
 *
 * @param {object} combatState
 * @param {object} action
 * @returns {{ allowed: boolean, reason: string|null, sources: string[] }}
 */
export function validateAction(combatState, action) {
  const clone = { ...action, data: { ...action.data, sources: [] } };
  for (const { actionType, fn } of registry) {
    if (clone.cancelled) break;
    if (actionType === '*' || actionType === action.type) {
      fn(clone, combatState);
    }
  }
  return { allowed: !clone.cancelled, reason: clone.reason ?? null, sources: clone.data.sources };
}

/**
 * Point d'entrée principal : intercepteurs → exécution si non annulée.
 *
 * Garde-fou anti-cascade : si executeAction est appelé recursivement au-delà
 * de MAX_ACTION_DEPTH, l'action est annulée et un avertissement identifiant
 * le type fautif est loggé. En jeu normal la profondeur est toujours 1.
 *
 * @param {object} combatState
 * @param {object} action
 * @returns {object} l'action (possiblement modifiée ou annulée)
 */
export function executeAction(combatState, action) {
  if (++actionDepth > MAX_ACTION_DEPTH) {
    console.warn(
      `[executeAction] MAX_ACTION_DEPTH (${MAX_ACTION_DEPTH}) dépassé` +
      ` — cascade sur le type '${action.type}'. Action annulée.`,
    );
    action.cancelled = true;
    action.reason = 'action.error.cascade';
    actionDepth--;
    return action;
  }
  try {
    processAction(combatState, action);
    if (!action.cancelled) dispatch(combatState, action);
  } finally {
    actionDepth--;
  }
  return action;
}

// --- Dispatcher (exécution par type) ----------------------------------------

function dispatch(combatState, action) {
  switch (action.type) {
    case 'apply_status':    execApplyStatus(combatState, action);        break;
    case 'remove_status':   execRemoveStatus(combatState, action);       break;
    case 'modify_status':   execModifyStatus(combatState, action);       break;
    case 'deal_damage':     execDealDamage(combatState, action);         break;
    case 'add_attack':      execAddStat(combatState, action, 'attack');  break;
    case 'add_defense':     execAddStat(combatState, action, 'defense'); break;
    case 'swap_powers':     execSwapPowers(combatState, action);         break;
    case 'spend_maneuver':  execSpendManeuver(combatState, action);      break;
    case 'remove_power':   execRemovePower(combatState, action);         break;
    case 'discard_power':  execDiscardPower(combatState, action);        break;
    case 'place_power':    execPlacePower(combatState, action);          break;
    case 'spend_strategy': execSpendStrategy(combatState, action);       break;
    case 'heal':           execHeal(combatState, action);                break;
    // 'draw_power'  : validation uniquement, pas d'exécuteur.
    // 'move_power'  : exécuteur à venir (déplacement unilatéral, sans cible).
    default: break;
  }
}

// --- Exécuteurs -------------------------------------------------------------

function execApplyStatus(combatState, action) {
  const { type, entity, position } = action.target ?? {};
  const { statusId, stacks = 1 } = action.value ?? {};
  if (!statusId) return;

  if (type === 'area') {
    // Application différée : enregistrée pendant la résolution, committée après
    // processTurnEnd dans resolveTurn. Le statut devient actif au tour suivant.
    (combatState._pendingAreaStatuses ??= []).push({ position, statusId, stacks });
  } else if (type === 'entity') {
    rawApplyStatus(combatState, { id: statusId, stacks, target: 'entity', entity });
  } else if (type === 'duo' || type === 'enemy') {
    rawApplyStatus(combatState, { id: statusId, stacks, target: type });
  }
}

function execRemoveStatus(combatState, action) {
  const { type, entity, position } = action.target ?? {};
  const { statusId } = action.value ?? {};
  if (!statusId) return;
  if (type === 'entity')                         rawRemoveEntityStatus(combatState, entity, statusId);
  else if (type === 'area')                      rawRemoveAreaStatus(combatState, position, statusId);
  else if (type === 'duo' || type === 'enemy')   rawRemoveStatus(combatState, statusId, type);
}

function execModifyStatus(combatState, action) {
  const { type, entity, position } = action.target ?? {};
  const { statusId, stacksDelta } = action.value ?? {};
  if (!statusId || stacksDelta === undefined) return;
  modifyStatusStacks(combatState, type, statusId, stacksDelta, entity, position);
}

function execDealDamage(combatState, action) {
  const subject = combatState[action.target];
  if (!subject || typeof action.value !== 'number') return;
  subject.hp -= action.value; // imblocable par défaut ; la défense n'absorbe pas
}

/** Soigne une cible (duo ou ennemi) jusqu'à son maxHp. */
function execHeal(combatState, action) {
  const subject = combatState[action.target];
  if (!subject || typeof action.value !== 'number') return;
  const max = subject.maxHp ?? Infinity;
  subject.hp = Math.min(max, subject.hp + action.value);
}

function execAddStat(combatState, action, stat) {
  const subject = combatState[action.target];
  if (!subject || typeof action.value !== 'number') return;
  subject[stat] += action.value;
}

/**
 * Échange les pouvoirs entre deux zones. Les statuts de zone restent attachés
 * à leur zone physique ; les statuts d'entité voyagent avec le pouvoir (stockés
 * dans combatState.statuses.entities par référence d'objet — la Map n'est pas
 * modifiée, seules les références dans les zones bougent).
 *
 * Si la zone cible est vide, le pouvoir source s'y déplace et laisse sa zone
 * d'origine vide.
 */
function execSwapPowers(combatState, action) {
  const board = combatState.board;
  if (!board) return;
  const srcArea = board[action.source];
  const tgtArea = board[action.target];
  if (!srcArea || !tgtArea) return;
  const tmp = srcArea.power;
  srcArea.power = tgtArea.power;
  tgtArea.power = tmp;
}

/**
 * Décrémente une ressource de manœuvre (ou autre) du camp cible.
 */
function execSpendManeuver(combatState, action) {
  const subject = combatState[action.target ?? 'duo'];
  if (!subject || typeof action.value !== 'number') return;
  subject.maneuver -= action.value;
}

/** Retire un pouvoir de sa zone de plateau (laisse la zone vide). */
function execRemovePower(combatState, action) {
  const area = combatState.board?.[action.target];
  if (!area) return;
  area.power = null;
}

/** Envoie le pouvoir source en défausse (indépendamment de son emplacement). */
function execDiscardPower(combatState, action) {
  if (action.source != null) combatState.discard.push(action.source);
}

/** Pose le pouvoir source dans la zone cible. */
function execPlacePower(combatState, action) {
  const area = combatState.board?.[action.target];
  if (!area) return;
  area.power = action.source ?? null;
}

/** Décrémente le compteur de stratégies du camp cible. */
function execSpendStrategy(combatState, action) {
  const subject = combatState[action.target ?? 'duo'];
  if (!subject || typeof action.value !== 'number') return;
  subject.strategy -= action.value;
}

// --- Intercepteurs natifs ----------------------------------------------------

const ANCHOR_ID = 'area_anchor_status';

/**
 * Bloque tout déplacement (move_power / swap_powers) dont la source ou la cible
 * est une zone portant area_anchor_status.
 */
function anchorInterceptor(action, combatState) {
  const positions = [action.source, action.target].filter((p) => typeof p === 'number');
  for (const pos of positions) {
    if (hasAreaStatus(combatState, pos, ANCHOR_ID)) {
      action.cancelled = true;
      action.reason = 'action.blocked.anchored';
      return;
    }
  }
}

/**
 * Bloque l'application d'un statut si la cible est immunisée (immunityFlag).
 * Remplace le check hardcodé qui était dans applyStatus (statuses.js).
 *
 * Immunité entity : le pouvoir ciblé porte le drapeau.
 * Immunité area   : le pouvoir occupant la zone porte le drapeau.
 */
function immunityInterceptor(action, combatState) {
  const { statusId } = action.value ?? {};
  const def = getStatusDefById(statusId);
  if (!def?.immunityFlag) return;
  const { type, entity, position } = action.target ?? {};
  if (type === 'entity' && entity?.[def.immunityFlag]) {
    action.cancelled = true;
    action.reason = 'action.blocked.immune';
    return;
  }
  if (type === 'area') {
    const power = combatState.board?.[position]?.power;
    if (power?.[def.immunityFlag]) {
      action.cancelled = true;
      action.reason = 'action.blocked.immune';
    }
  }
}

/**
 * Bloque swap_powers si la zone source ne contient pas de pouvoir.
 * Un échange sans pouvoir source n'a aucun sens — c'est une précondition
 * fondamentale, pas un choix de règles, d'où son rôle d'intercepteur natif.
 */
function sourcePowerInterceptor(action, combatState) {
  if (!combatState.board?.[action.source]?.power) {
    action.cancelled = true;
    action.reason = 'action.blocked.no_source_power';
  }
}

/**
 * Bloque swap_powers si la cible est hors de la portée maximale autorisée
 * (data.maxDistance, en distance de Manhattan orthogonale). Sans maxDistance
 * dans data, aucune limite n'est appliquée.
 */
function distanceInterceptor(action) {
  const maxDistance = action.data?.maxDistance;
  if (maxDistance == null) return;
  if (manhattanDistance(action.source, action.target) > maxDistance) {
    action.cancelled = true;
    action.reason = 'action.blocked.out_of_range';
  }
}

/**
 * Réinitialise le registre et enregistre les intercepteurs natifs du jeu de base.
 * À appeler au début de chaque combat (initCombat dans combat.js).
 *
 * Convention d'extension : pour ajouter un intercepteur lié à un perk ou un
 * gadget, appelez registerInterceptor APRÈS initInterceptors(), depuis le code
 * d'initialisation de cet élément. Aucune modification du pipeline ne sera
 * nécessaire.
 */
export function initInterceptors() {
  clearInterceptors();
  registerInterceptor('move_power',    anchorInterceptor);
  registerInterceptor('swap_powers',   anchorInterceptor);
  registerInterceptor('swap_powers',   sourcePowerInterceptor);
  registerInterceptor('swap_powers',   distanceInterceptor);
  registerInterceptor('apply_status',  immunityInterceptor);
}
