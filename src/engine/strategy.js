// src/engine/strategy.js — Mécanique de stratégie (remplacement d'un pouvoir).
//
// La stratégie permet de retirer un pouvoir du plateau, de le défausser, et de
// le remplacer par un pouvoir tiré depuis la pioche — à choisir parmi les
// premiers pouvoirs éligibles (jusqu'à STRATEGY_PICK candidats).
//
// Composition des capacités atomiques (src/engine/powerActions.js) :
//   - Pouvoir source (remplacé) : doit être remove_power ET discard_power.
//   - Pouvoir remplaçant (tiré) : doit être draw_power ET place_power.
// Aucune permission propre à la stratégie n'est introduite ici : la stratégie
// est une composition de capacités déjà interceptables.
//
// Contraintes : aucun DOM, aucun import depuis src/ui/.

import { STRATEGY_PICK } from './gameState.js';
import { canRemove, canDiscard, canPlace, canDraw } from './powerActions.js';
import { createAction, executeAction } from './actions.js';
import { reconstituteDeck } from './combat.js';

// --- Vérification de la source -----------------------------------------------

/**
 * Vérifie si le pouvoir source peut être remplacé (removable ET discardable).
 * Retourne le premier refus rencontré, ou { allowed: true } si tout passe.
 *
 * @param {object} state
 * @param {object} power    pouvoir dans la zone source
 * @param {number} pos      index 0–8 de la zone source
 * @returns {{ allowed: boolean, reason: string|null, sources: string[] }}
 */
export function canUseStrategySource(state, power, pos) {
  const r = canRemove(state, power, pos);
  if (!r.allowed) return r;
  return canDiscard(state, power, pos);
}

// --- Construction des candidats -----------------------------------------------

/**
 * Construit la liste des pouvoirs candidats au remplacement depuis la pioche.
 *
 * - Si la pioche contient moins de STRATEGY_PICK pouvoirs, elle est reconstituée
 *   (défausse mélangée, puis exil si nécessaire — avec pénalité PV éventuelle).
 * - Parcours dans l'ordre de tirage (du sommet vers le fond).
 * - Un candidat raté (non drawable ou non placeable) est ignoré et reste en
 *   place dans la pioche — il n'est ni tiré ni déplacé.
 * - On s'arrête dès STRATEGY_PICK candidats valides ou la fin de la pioche.
 *
 * @param {object} state
 * @param {number} sourcePos  index 0–8 de la zone source (pour canPlace)
 * @returns {object[]}  jusqu'à STRATEGY_PICK objets pouvoir candidats
 */
export function buildCandidates(state, sourcePos) {
  if (state.deck.length < STRATEGY_PICK) reconstituteDeck(state);

  const candidates = [];
  // Le sommet de la pioche est le dernier élément (deck.pop() pioche depuis le haut).
  for (let i = state.deck.length - 1; i >= 0 && candidates.length < STRATEGY_PICK; i--) {
    const power = state.deck[i];
    if (canDraw(state, power).allowed && canPlace(state, power, sourcePos).allowed) {
      candidates.push(power);
    }
  }
  return candidates;
}

// --- Exécution ---------------------------------------------------------------

/**
 * Exécute le remplacement complet après validation et sélection du remplaçant :
 *   1. Retire le pouvoir source de sa zone (remove_power via executeAction).
 *   2. L'envoie en défausse (discard_power via executeAction).
 *   3. Retire le pouvoir choisi de la pioche par référence (manipulation directe).
 *   4. Le pose dans la zone source (place_power via executeAction).
 *   5. Consomme 1 point de stratégie (spend_strategy via executeAction).
 *
 * Le point de stratégie est consommé en dernier, après succès de l'ensemble.
 * Précondition : canUseStrategySource et la candidature ont déjà été validés.
 *
 * @param {object} state
 * @param {number} sourcePos    index 0–8 de la zone source
 * @param {object} chosenPower  pouvoir remplaçant (référence issue de state.deck)
 */
export function executeStrategy(state, sourcePos, chosenPower) {
  const sourcePower = state.board[sourcePos].power;

  executeAction(state, createAction('remove_power',  { source: sourcePower, target: sourcePos }));
  executeAction(state, createAction('discard_power', { source: sourcePower, target: sourcePos }));

  const deckIdx = state.deck.indexOf(chosenPower);
  if (deckIdx >= 0) state.deck.splice(deckIdx, 1);

  executeAction(state, createAction('place_power',    { source: chosenPower, target: sourcePos }));
  executeAction(state, createAction('spend_strategy', { target: 'duo', value: 1 }));
}
