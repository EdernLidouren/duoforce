// src/engine/run.js — Objet run et sérialisation.
//
// La run regroupe tout l'état propre à la partie en cours : duo, inventaire,
// PV partagés, crédit, seed et progression. Elle vit entre les combats et
// constitue la source de vérité persistante.
//
// Trois couches d'état (docs/run-state.md) :
//   Profile   — progression longue (hors scope de ce module)
//   Run       — la partie en cours  ← ce module
//   Combat    — un seul combat, éphémère
//
// Contrat Run ↔ Combat (branchement implémenté ultérieurement) :
//   - Init combat  : lit run.heroes (construction du deck) et run.hp (PV de départ).
//   - Résolution   : réécrit run.hp (PV restants) et run.credit (crédits gagnés).
//   - La run ne connaît jamais l'état interne d'un combat en cours.
//
// Aucun DOM, aucun import depuis src/ui/.

import { STARTING_CREDIT } from './gameState.js';
import { getHeroById } from '../data/heroes/index.js';
import { GAME_VERSION, SAVE_FORMAT_VERSION } from '../config/version.js';
import { debug } from '../config/debug.js';

// --- Programmation des ennemis -----------------------------------------------
//
// Pools par rôle de phase (enrichis quand du contenu est ajouté au catalogue).
// Phase 1 = éclaireurs, phase 2 = lieutenants, phase 3 = boss.

const POOL_MINION      = ['enemy_dummy'];
const POOL_LIEUTENANT  = ['enemy_dummy'];
const POOL_BOSS        = ['enemy_dummy'];

/**
 * Produit un flottant [0, 1) déterministe à partir de deux entiers.
 * Algorithme : double multiplication par des constantes Murmur3/Knuth.
 */
function seededFloat(seed, index) {
  let h = (seed ^ Math.imul(index, 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0;
  return (h >>> 0) / 0x100000000;
}

function seededPick(seed, index, pool) {
  return pool[Math.floor(seededFloat(seed, index) * pool.length)];
}

/**
 * Retourne l'id de l'ennemi à affronter pour un combat linéaire donné.
 * Déterministe : même (seed, combatIndex) → même résultat, toujours.
 *
 * @param {number} seed
 * @param {number} combatIndex  1-indexé (1 = round 1 phase 1, 3 = round 1 phase 3…)
 * @returns {string}  id d'ennemi
 */
export function getEnemyId(seed, combatIndex) {
  const phase = ((combatIndex - 1) % 3) + 1;
  if (phase === 3) return seededPick(seed, combatIndex, POOL_BOSS);
  if (phase === 2) return seededPick(seed, combatIndex, POOL_LIEUTENANT);
  return seededPick(seed, combatIndex, POOL_MINION);
}

// --- Index de combat linéaire ------------------------------------------------

/**
 * Retourne l'index de combat 1-indexé correspondant à la progression courante.
 * Exemples : round 1 phase 1 → 1 ; round 3 phase 2 → 8 ; round 10 phase 3 → 30.
 *
 * @param {object} run
 * @returns {number}
 */
export function getCombatIndex(run) {
  const { round, phase } = run.progression;
  return (round - 1) * 3 + phase;
}

// --- Progression -------------------------------------------------------------

/**
 * Avance la progression d'une phase.
 * Si la phase dépasse 3, passe au round suivant et remet la phase à 1.
 * Mute run.progression en place.
 *
 * @param {object} run
 */
export function advancePhase(run) {
  if (run.progression.phase < 3) {
    run.progression.phase++;
  } else {
    run.progression.round++;
    run.progression.phase = 1;
  }
}

/**
 * Indique si la run est gagnée.
 * Doit être appelée APRÈS advancePhase : la victoire est détectée quand la
 * progression dépasse le round 10 (boss du round 10 vaincu).
 *
 * @param {object} run
 * @returns {boolean}
 */
export function isRunWon(run) {
  return run.progression.round > 10;
}

// --- Création ----------------------------------------------------------------

/**
 * Initialise une run neuve.
 *
 * Les PV max du duo sont la somme des PV de chaque héros (modèle de pool
 * partagé, docs/run-state.md). Le seed est généré si absent.
 *
 * @param {{ heroes: object[], seed?: number }} options
 * @returns {object}  run vivante
 */
export function createRun({ heroes, seed }) {
  // Priorité : argument explicite > forcedSeed (si debug actif) > aléatoire.
  const resolvedSeed = seed
    ?? (debug.enabled && debug.forcedSeed !== null ? debug.forcedSeed : undefined)
    ?? ((Math.random() * 0x100000000) >>> 0);
  const maxHp = heroes.reduce((sum, h) => sum + (h.hp ?? 0), 0);
  return {
    progression: { round: 1, phase: 1 },
    heroes: heroes.map((h) => ({ ...h })),
    gadgets:   [],
    sidekicks: [],
    abilities: [],
    hp:     maxHp,
    maxHp,
    credit: STARTING_CREDIT,
    seed:   resolvedSeed,
  };
}

// --- Sérialisation -----------------------------------------------------------

/**
 * Produit un save object plat (JSON pur) depuis la run vivante.
 * Stocke seed + progression, pas les données dérivées (pas de liste d'ennemis).
 * Les héros sont réduits à leur id (catalogue côté client).
 *
 * @param {object} run
 * @returns {object}
 */
export function serialize(run) {
  return {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    gameVersion:       GAME_VERSION,
    seed:        run.seed,
    progression: { ...run.progression },
    heroes:   run.heroes.map((h) => ({ id: h.id })),
    gadgets:  run.gadgets.map((g)  => ({ id: g.id })),
    sidekicks: run.sidekicks.map((s) => ({ id: s.id })),
    abilities: run.abilities.map((a) => ({ id: a.id })),
    hp:     run.hp,
    credit: run.credit,
  };
}

/**
 * Reconstruit une run vivante depuis un save object, en régénérant l'état
 * dérivé (programmation des ennemis) depuis le seed.
 *
 * @param {object} saveObject
 * @returns {object}  run vivante
 */
export function deserialize(saveObject) {
  const savedVersion = saveObject.saveFormatVersion ?? 0;
  if (savedVersion !== SAVE_FORMAT_VERSION) {
    console.warn(
      `[run] Incompatibilité de format de sauvegarde : ` +
      `save v${savedVersion}, attendu v${SAVE_FORMAT_VERSION}. ` +
      `La sauvegarde est peut-être corrompue ou issue d'une version incompatible.`,
    );
  }

  const heroes = saveObject.heroes
    .map((h) => getHeroById(h.id))
    .filter(Boolean)
    .map((h) => ({ ...h }));
  const maxHp = heroes.reduce((sum, h) => sum + (h.hp ?? 0), 0);
  return {
    progression: { ...saveObject.progression },
    heroes,
    gadgets:   [],
    sidekicks: [],
    abilities: [],
    hp:     saveObject.hp,
    maxHp,
    credit: saveObject.credit,
    seed:   saveObject.seed,
  };
}
