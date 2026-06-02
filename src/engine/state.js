// src/engine/state.js — Modèle d'état du jeu.
//
// Responsabilités :
//   - Définir la forme de l'état de partie (joueurs, plateau, tour courant…).
//   - Fournir une fabrique d'état initial.
//   - Fournir des transitions PURES : (state, action) → nouvel état, sans muter
//     l'entrée et sans effet de bord.
//
// Contrainte d'architecture : AUCUN accès au DOM, à window, ni à document.
// Ce module est testable en isolation totale du navigateur.

import { createBoard } from './board.js';

/** Phases possibles d'une partie. */
export const Phase = Object.freeze({
  SETUP: 'setup',
  PLAYING: 'playing',
  OVER: 'over',
});

/**
 * Construit l'état initial d'une partie.
 * @param {object} [options]
 * @returns {object} état immuable de départ
 */
export function createInitialState(options = {}) {
  // TODO: initialiser joueurs, plateau, joueur actif, phase.
  return {
    phase: Phase.SETUP,
    board: createBoard(options),
    players: [],
    activePlayer: 0,
    turn: 0,
    winner: null,
  };
}

/**
 * Transition pure : applique une action à un état et renvoie un NOUVEL état.
 * @param {object} state
 * @param {{type: string, payload?: any}} action
 * @returns {object} nouvel état
 */
export function reduce(state, action) {
  // TODO: brancher les transitions (déléguer à rules.js / turn.js au besoin).
  switch (action.type) {
    default:
      return state;
  }
}
