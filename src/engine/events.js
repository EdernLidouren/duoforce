// src/engine/events.js — Event bus centralisé du combat.
//
// Un EVENT est un fait de jeu daté : { type, turn, data }. On émet des events
// pour tout ce qui mérite d'être observé (pouvoir bloqué, statut appliqué, …),
// puis d'autres mécaniques les CONSULTENT (ex. un perk qui réagit au nombre de
// pouvoirs bloqués ce tour).
//
// Trois niveaux de journaux, peuplés simultanément à chaque émission :
//   - turn        : vidé au début de chaque tour (clearTurnLog) ;
//   - combat      : vidé à l'initialisation d'un combat (clearCombatLog) ;
//   - progression : JAMAIS vidé automatiquement ; persiste au-delà des combats et
//                   des parties (en mémoire pour l'instant — prêt à être sérialisé).
//
// Stockage : combatState.events = { turn: [], combat: [], progression: [] }.
// Le journal de progression est partagé PAR RÉFÉRENCE entre tous les combats (var
// de module ci-dessous) : un nouveau combat repart avec turn/combat vierges mais
// la même progression.
//
// Aucun DOM.

/** Journal de progression persistant (partagé entre tous les combats). */
let progressionLog = [];

/**
 * Conteneur d'events d'un combat : turn/combat neufs, progression partagée.
 * @returns {{turn:Array, combat:Array, progression:Array}}
 */
export function createEventStore() {
  return { turn: [], combat: [], progression: progressionLog };
}

/** Garantit la présence du conteneur d'events sur le combatState. */
function ensureStore(combatState) {
  if (!combatState.events) combatState.events = createEventStore();
  return combatState.events;
}

/**
 * Crée un event (daté du tour courant) et l'ajoute aux TROIS journaux.
 * @param {object} combatState
 * @param {string} type
 * @param {object} [data]  contexte libre selon le type
 * @returns {{type:string, turn:number, data:object}} l'event créé
 */
export function emitEvent(combatState, type, data = {}) {
  const store = ensureStore(combatState);
  const event = { type, turn: combatState.turn ?? 0, data };
  store.turn.push(event);
  store.combat.push(event);
  store.progression.push(event);
  return event;
}

/**
 * Tous les events d'un type donné dans un scope.
 * @param {object} combatState
 * @param {string} type
 * @param {'turn'|'combat'|'progression'} scope
 * @returns {Array}
 */
export function getEvents(combatState, type, scope) {
  const log = combatState.events?.[scope];
  return Array.isArray(log) ? log.filter((e) => e.type === type) : [];
}

/** Nombre d'events d'un type donné dans un scope. */
export function countEvents(combatState, type, scope) {
  return getEvents(combatState, type, scope).length;
}

/** Vide le journal du tour (appelé en début de nouveau tour). */
export function clearTurnLog(combatState) {
  ensureStore(combatState).turn = [];
}

/** Vide le journal du combat (appelé à l'initialisation d'un combat). Ne touche pas la progression. */
export function clearCombatLog(combatState) {
  ensureStore(combatState).combat = [];
}

/**
 * Émet un event directement dans le journal de progression (sans journal de tour
 * ni de combat). À utiliser pour les events de run (gadgets, hub) émis hors combat.
 * @param {string} type
 * @param {object} [data]
 * @param {number|null} [turn]
 * @returns {{ type, turn, data }}
 */
export function emitProgressionEvent(type, data = {}, turn = null) {
  const event = { type, turn, data };
  progressionLog.push(event);
  return event;
}
