// src/engine/combatPhases.js — Transition centralisée et helpers de phase.
//
// setPhase(state, newPhase) est le SEUL endroit autorisé à écrire state.phase.
// Tout autre code ne fait que lire via getPhase ou les helpers sémantiques.
//
// L'event 'phase_changed' émis à chaque transition permet à des effets, triggers
// ou futures annonces de réagir sans coupler leur logique aux fonctions de combat.
//
// Effets actifs sur plusieurs phases :
//   isPhaseActiveFor(state, [PHASE_A, PHASE_B]) retourne vrai si la phase
//   courante est dans l'ensemble fourni. Permet à un effet de déclarer sur
//   quelles phases il est actif sans comparaison directe à l'enum.
//
// Aucun DOM.

import { emitEvent } from './events.js';
import { COMBAT_PHASES } from './gameState.js';

/**
 * Transition centralisée vers une nouvelle phase.
 * Seul point autorisé à modifier combatState.phase.
 * Émet 'phase_changed' { phase } via l'event bus.
 *
 * @param {object} state
 * @param {string} newPhase  valeur de COMBAT_PHASES
 */
export function setPhase(state, newPhase) {
  state.phase = newPhase;
  emitEvent(state, 'phase_changed', { phase: newPhase });
}

/**
 * Retourne la phase courante du combat.
 * @param {object} state
 * @returns {string|null}
 */
export function getPhase(state) {
  return state.phase ?? null;
}

/**
 * Retourne vrai si le joueur peut agir (manœuvre, stratégie, gadget…).
 * Centralisé ici pour que la condition reste à un seul endroit si elle évolue.
 * @param {object} state
 * @returns {boolean}
 */
export function canPlayerAct(state) {
  return state.phase === COMBAT_PHASES.PLAY && state.status === 'ongoing';
}

/**
 * Retourne vrai si la phase courante appartient à l'ensemble fourni.
 * Permet à un effet, trigger ou hook de déclarer les phases où il est actif
 * sans comparaison directe à l'enum.
 *
 * Exemple (usage futur) :
 *   if (isPhaseActiveFor(state, [COMBAT_PHASES.DISTRIBUTION, COMBAT_PHASES.PLAY])) { … }
 *
 * @param {object}   state
 * @param {string[]} phases  ensemble de valeurs COMBAT_PHASES
 * @returns {boolean}
 */
export function isPhaseActiveFor(state, phases) {
  return phases.includes(state.phase);
}
