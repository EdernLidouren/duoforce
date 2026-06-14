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
import { processTurnEnd } from './statuses.js';
import { getPowerById } from '../data/powers/index.js';
import { HEROES } from '../data/heroes/index.js';
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
 * Les ids inconnus sont ignorés. Chaque entrée est une COPIE distincte de la
 * définition du pouvoir : deux cartes du même id sont ainsi des instances
 * séparées, ce qui garantit que les mécaniques indexées par instance (épuisement
 * d'un pouvoir, renfort d'un voisin) ne se télescopent jamais.
 * @param {Array} heroes
 * @returns {Array} liste de pouvoirs (instances, avec doublons possibles)
 */
export function buildDeck(heroes) {
  return heroes
    .flatMap((hero) => hero.starting_powers)
    .map((id) => getPowerById(id))
    .filter((power) => power != null)
    .map((power) => ({ ...power }));
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

/**
 * Construit le plateau : 9 ZONES vides. Chaque zone (« area ») est un objet
 * { position, power, statuses } — voir docs/context-api.md.
 */
function createBoard() {
  return Array.from({ length: BOARD_SIZE }, (_, position) => ({
    position,
    power: null,
    statuses: [],
  }));
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
    board: createBoard(),
    deck,
    discard: [],
    exile: [],
    // Statuts actifs (voir src/engine/statuses.js).
    statuses: { duo: [], enemy: [], entities: new Map() },
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

  // Défausse de tous les pouvoirs encore sur le plateau. Les STATUTS de zone
  // (ex. gel) restent attachés à la zone : ils persistent d'un tour à l'autre,
  // indépendamment du pouvoir qui l'occupe.
  for (const area of state.board) {
    if (area.power != null) {
      state.discard.push(area.power);
      area.power = null;
    }
  }

  state.turn += 1;

  // Distribution : placement dans l'ordre de lecture (6,7,8,3,4,5,0,1,2).
  const drawn = drawPowers(state, HAND_SIZE);
  drawn.forEach((power, k) => {
    state.board[RESOLUTION_ORDER[k]].power = power;
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

/**
 * Applique des dégâts à une cible. La défense absorbe en priorité :
 *   - si défense >= dégâts : les PV restent inchangés (la défense est réduite
 *     d'autant) ;
 *   - sinon : la défense tombe à 0 et la différence est retirée des PV.
 * @param {{hp:number, defense:number}} target
 * @param {number} incoming  dégâts entrants (attaque de l'attaquant)
 */
function applyDamage(target, incoming) {
  if (incoming <= 0) return 0;
  if (target.defense >= incoming) {
    target.defense -= incoming;
    return 0;
  }
  const overflow = incoming - target.defense;
  target.hp -= overflow;
  target.defense = 0;
  return overflow;
}

/**
 * Résolution de tour : applique les effets du plateau, puis la phase du duo et
 * la phase ennemie. Met à jour le statut (victoire/défaite). Mute l'état et
 * renvoie un RAPPORT pour la construction des messages :
 *   { activations, damageToEnemy, damageToDuo, status }.
 * @param {object} state
 * @returns {{activations:Array, damageToEnemy:number, damageToDuo:number, status:string}}
 */
export function resolveTurn(state) {
  if (state.status !== 'ongoing') {
    return { activations: [], damageToEnemy: 0, damageToDuo: 0, status: state.status };
  }

  // Résolution sur une copie de travail ; on commet ici les valeurs obtenues
  // (les helpers ont déjà mutué la copie : sommes, multiplicateurs, soins,
  // ressources, modificateurs de statuts...).
  const r = resolveBoard(state.board, state);
  state.duo.attack = r.duo.attack;
  state.duo.defense = r.duo.defense;
  state.duo.maneuver = r.duo.maneuver;
  state.duo.strategy = r.duo.strategy;
  state.duo.credit = r.duo.credit;
  state.duo.hp = r.duo.hp;          // soins du duo déjà appliqués (plafonnés)
  state.enemy.attack = r.enemy.attack;
  state.enemy.defense = r.enemy.defense;
  state.enemy.hp = r.enemy.hp;      // soin de l'ennemi déjà appliqué

  // Phase du duo : l'attaque du duo frappe l'ennemi ; sa défense absorbe en
  // priorité, le surplus réduit ses PV.
  const damageToEnemy = applyDamage(state.enemy, state.duo.attack);
  let damageToDuo = 0;
  if (state.enemy.hp <= 0) {
    state.enemy.hp = 0;
    state.status = 'won';
  } else {
    // Phase ennemie : l'attaque ennemie frappe le duo.
    damageToDuo = applyDamage(state.duo, state.enemy.attack);
    if (state.duo.hp <= 0) {
      state.duo.hp = 0;
      state.status = 'lost';
    }
  }

  // Fin de tour : statuts (poison, décréments de durée, expirations...).
  processTurnEnd(state);
  // Un statut a pu faire tomber des PV : ré-évaluer l'issue.
  if (state.status === 'ongoing') {
    if (state.enemy.hp <= 0) { state.enemy.hp = 0; state.status = 'won'; }
    else if (state.duo.hp <= 0) { state.duo.hp = 0; state.status = 'lost'; }
  }

  return {
    activations: r.activations,
    damageToEnemy,
    damageToDuo,
    status: state.status,
  };
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
