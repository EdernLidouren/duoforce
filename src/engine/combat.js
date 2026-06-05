// src/engine/combat.js — Logique de combat (cf. docs/combats.md).
//
// Un combat oppose le duo du joueur à un unique ennemi, en tour par tour,
// jusqu'à victoire (PV ennemi à 0) ou défaite (PV duo à 0).
//
// Responsabilités :
//   - Initialisation : fusion + mélange des decks des deux héros, états de départ.
//   - Début de tour : défausse du plateau, distribution de 9 pouvoirs, top-up des
//     manœuvres/stratégies (valeurs par défaut depuis gameState.js), remise à 0
//     de l'attaque/défense du duo, réévaluation de l'ennemi.
//   - Résolution de tour : resolveBoard, application des effets, phase du duo,
//     phase ennemie.
//   - Conditions de victoire / défaite.
//
// Contrainte : logique pure côté règles, AUCUN DOM, aucun import depuis src/ui/.
// L'état de combat est muté en place (deck, défausse, exil sont intrinsèquement
// à état) ; chaque fonction retourne l'état pour permettre le chaînage.

import { resolveBoard, RESOLUTION_ORDER } from './rules.js';
import { getPowerById } from '../data/powers.js';
import { HEROES } from '../data/heroes.js';
import {
  BOARD_SIZE,
  HAND_SIZE,
  DEFAULT_MANEUVERS,
  DEFAULT_STRATEGIES,
  DEFAULT_DUO_HP,
  STARTING_CREDIT,
  DEFAULT_ENEMY_HP,
  DEFAULT_ENEMY_ATTACK,
  DEFAULT_ENEMY_DEFENSE,
} from './gameState.js';

// --- Utilitaires ------------------------------------------------------------

/**
 * Mélange Fisher-Yates. Renvoie un nouveau tableau ; n'altère pas l'entrée.
 * La source d'aléa est injectable (testabilité).
 * @param {Array} array
 * @param {() => number} [rng]
 * @returns {Array}
 */
export function shuffle(array, rng = Math.random) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Construit le deck combiné de plusieurs héros (ids → objets pouvoir).
 * Les ids inconnus sont ignorés.
 * @param {Array} heroes
 * @returns {Array} liste de pouvoirs (avec doublons)
 */
export function buildDeck(heroes) {
  return heroes
    .flatMap((hero) => hero.starting_powers)
    .map((id) => getPowerById(id))
    .filter((power) => power != null);
}

/** Construit l'état initial de l'ennemi. */
function createEnemy(overrides = {}) {
  const maxHp = overrides.maxHp ?? overrides.hp ?? DEFAULT_ENEMY_HP;
  return {
    id: overrides.id ?? 'enemy_dummy',
    nameId: overrides.nameId ?? 'enemy_dummy',
    // Type de combat : un ennemi classique → combat normal ; un boss → true.
    isBoss: overrides.isBoss ?? false,
    maxHp,
    hp: overrides.hp ?? maxHp,
    // Valeurs de base réévaluées chaque tour (dépendront du niveau à terme).
    baseAttack: overrides.baseAttack ?? DEFAULT_ENEMY_ATTACK,
    baseDefense: overrides.baseDefense ?? DEFAULT_ENEMY_DEFENSE,
    attack: overrides.baseAttack ?? DEFAULT_ENEMY_ATTACK,
    defense: overrides.baseDefense ?? DEFAULT_ENEMY_DEFENSE,
  };
}

// --- Pioche -----------------------------------------------------------------

/**
 * Pioche jusqu'à n pouvoirs. Reconstitue la pioche depuis la défausse quand elle
 * est vide ; si tout est épuisé, pioche moins que demandé. Mute l'état.
 * @param {object} state
 * @param {number} n
 * @returns {Array} pouvoirs piochés
 */
function drawPowers(state, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break; // pioche et défausse vides
      state.deck = shuffle(state.discard, state.rng);
      state.discard = [];
    }
    drawn.push(state.deck.pop());
  }
  return drawn;
}

// --- Initialisation ---------------------------------------------------------

/**
 * Initialise un combat : deck fusionné et mélangé, états de départ des deux camps.
 * @param {object} [options]
 * @param {Array}  [options.heroes]  deux héros du duo (défaut : les deux placeholders).
 * @param {object} [options.enemy]   surcharges d'ennemi.
 * @param {() => number} [options.rng]
 * @returns {object} état de combat
 */
export function initCombat({ heroes = HEROES.slice(0, 2), enemy = {}, rng = Math.random } = {}) {
  const deck = shuffle(buildDeck(heroes), rng);

  return {
    heroes,
    rng,
    turn: 0,
    status: 'ongoing', // 'ongoing' | 'won' | 'lost'
    board: new Array(BOARD_SIZE).fill(null),
    deck,
    discard: [],
    exile: [],
    duo: {
      hp: DEFAULT_DUO_HP,
      maxHp: DEFAULT_DUO_HP,
      attack: 0,
      defense: 0,
      maneuver: 0,
      strategy: 0,
      credit: STARTING_CREDIT,
    },
    enemy: createEnemy(enemy),
  };
}

// --- Déroulement d'un tour --------------------------------------------------

/** Réévalue l'attaque/défense de l'ennemi (placeholder : valeurs de base). */
function evaluateEnemy(state) {
  state.enemy.attack = state.enemy.baseAttack;
  state.enemy.defense = state.enemy.baseDefense;
}

/**
 * Début de tour : défausse du plateau, distribution de 9 pouvoirs, top-up des
 * ressources, remise à 0 du duo, réévaluation de l'ennemi. Mute et renvoie l'état.
 * @param {object} state
 * @returns {object} state
 */
export function startTurn(state) {
  if (state.status !== 'ongoing') return state;

  // Défausse de tous les pouvoirs encore sur le plateau.
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] != null) {
      state.discard.push(state.board[i]);
      state.board[i] = null;
    }
  }

  state.turn += 1;

  // Distribution : placement dans l'ordre de lecture (6,7,8,3,4,5,0,1,2).
  const drawn = drawPowers(state, HAND_SIZE);
  drawn.forEach((power, k) => {
    state.board[RESOLUTION_ORDER[k]] = power;
  });

  // Gain de ressources jusqu'aux valeurs par défaut (top-up, sans réduire).
  state.duo.maneuver = Math.max(state.duo.maneuver, DEFAULT_MANEUVERS);
  state.duo.strategy = Math.max(state.duo.strategy, DEFAULT_STRATEGIES);

  // Attaque / défense du duo remises à 0 ; ennemi réévalué.
  state.duo.attack = 0;
  state.duo.defense = 0;
  evaluateEnemy(state);

  return state;
}

// --- Résolution d'un tour ---------------------------------------------------

/** Déplace les pouvoirs des cases données vers une pile, puis vide les cases. */
function moveCardsFromBoard(state, positions, pile) {
  for (const i of positions) {
    if (state.board[i] != null) {
      state[pile].push(state.board[i]);
      state.board[i] = null;
    }
  }
}

/**
 * Résolution de tour : applique les effets du plateau, puis la phase du duo et
 * la phase ennemie. Met à jour le statut (victoire/défaite). Mute et renvoie l'état.
 * @param {object} state
 * @returns {object} state
 */
export function resolveTurn(state) {
  if (state.status !== 'ongoing') return state;

  const result = resolveBoard(state.board, state);

  // Valeurs de combat finales (multiplicateurs déjà appliqués par resolveBoard).
  state.duo.attack = result.attack;
  state.duo.defense = result.defense;
  state.enemy.attack = result.enemyAttack;
  state.enemy.defense = result.enemyDefense;

  // Ressources.
  state.duo.maneuver += result.maneuver;
  state.duo.strategy += result.strategy;
  state.duo.credit += result.credit;
  state.duo.hp = Math.min(state.duo.maxHp, state.duo.hp + result.heal);
  state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + result.enemyHeal);

  // Manipulation de deck décidée pendant la résolution.
  moveCardsFromBoard(state, result.exile, 'exile');
  moveCardsFromBoard(state, result.discard, 'discard');

  // Effet "draw" : on remplit les cases vides (placeholder — ces pouvoirs ne se
  // résolvent pas ce tour-ci).
  if (result.draw > 0) {
    const empty = RESOLUTION_ORDER.filter((pos) => state.board[pos] == null);
    const extra = drawPowers(state, Math.min(result.draw, empty.length));
    extra.forEach((power, k) => { state.board[empty[k]] = power; });
  }

  // Phase du duo : dégâts à l'ennemi = attaque du duo - défense ennemie.
  const dmgToEnemy = Math.max(0, state.duo.attack - state.enemy.defense);
  state.enemy.hp -= dmgToEnemy;
  if (state.enemy.hp <= 0) {
    state.enemy.hp = 0;
    state.status = 'won';
    return state;
  }

  // Phase ennemie : dégâts au duo = attaque ennemie - défense du duo.
  const dmgToDuo = Math.max(0, state.enemy.attack - state.duo.defense);
  state.duo.hp -= dmgToDuo;
  if (state.duo.hp <= 0) {
    state.duo.hp = 0;
    state.status = 'lost';
    return state;
  }

  return state;
}

/**
 * Joue un tour complet : début de tour puis résolution. Mute et renvoie l'état.
 * (Sans phase d'interaction joueur — manœuvres/stratégies — qui viendra avec l'UI.)
 * @param {object} state
 * @returns {object} state
 */
export function playTurn(state) {
  startTurn(state);
  resolveTurn(state);
  return state;
}

// --- Conditions de fin ------------------------------------------------------

/** @returns {boolean} le combat est-il terminé ? */
export function isOver(state) {
  return state.status !== 'ongoing';
}

/** @returns {'ongoing'|'won'|'lost'} issue courante du combat. */
export function getOutcome(state) {
  return state.status;
}
