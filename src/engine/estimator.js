// src/engine/estimator.js — Estimation (preview) de la résolution du plateau.
//
// Donne, à tout moment du tour, une PROJECTION des valeurs de combat telles
// qu'elles seraient si le tour était résolu maintenant — sans rien muter. Sert
// notamment aux raccourcis a / Maj+A / d / Maj+D (attaque/défense projetées du
// duo et de l'ennemi), et à terme à tout affichage « prévisionnel ».
//
// Conçu pour AGRÉGER PLUSIEURS SOURCES d'effets. Aujourd'hui une seule source :
// le plateau (resolveBoard). Demain : side-kicks, gadgets, talents, signatures…
// On enregistre une source via addSource(fn) ; chaque source ajuste l'estimation.
//
// CACHE — choix « invalidation explicite + calcul paresseux » :
//   - get() renvoie l'estimation mémorisée ; si elle est marquée obsolète, elle
//     est recalculée puis mémorisée.
//   - invalidate() marque l'estimation obsolète. À appeler à CHAQUE changement
//     pouvant l'affecter (plateau réagencé, pioche, ennemi ré-évalué, source
//     ajoutée…).
// Pourquoi pas « recalculer à chaque action » : même fraîcheur, mais on ne
// calcule jamais une estimation que personne ne consulte, et surtout cela
// GÉNÉRALISE aux sources hors plateau — un cache auto-basé sur le contenu du
// plateau ne « verrait » pas l'activation d'un gadget, alors qu'un invalidate()
// explicite fonctionne pour n'importe quelle source.
//
// Logique pure — aucun DOM.

import { resolveBoard } from './rules.js';

/** Estimation vierge : valeurs de combat projetées + ressources projetées. */
function createEmptyEstimate() {
  return {
    duo: { attack: 0, defense: 0 },
    enemy: { attack: 0, defense: 0 },
    resources: { heal: 0, enemyHeal: 0, maneuver: 0, strategy: 0, credit: 0, draw: 0 },
    activations: [],
  };
}

/**
 * Source « plateau » : applique la résolution du plateau à l'estimation.
 * resolveBoard incorpore déjà les valeurs de base du combatState (attaque/défense
 * actuelles du duo et de l'ennemi) + additifs + multiplicateurs.
 * @param {object} estimate
 * @param {{board:Array, combatState:object}} ctx
 */
function boardSource(estimate, { board, combatState }) {
  // resolveBoard travaille sur une copie (aucune mutation de combatState) et
  // renvoie les valeurs résolues : { duo:{...}, enemy:{...}, activations }.
  const r = resolveBoard(board, combatState);
  estimate.duo.attack = r.duo.attack;
  estimate.duo.defense = r.duo.defense;
  estimate.enemy.attack = r.enemy.attack;
  estimate.enemy.defense = r.enemy.defense;
  estimate.activations = r.activations;
}

/**
 * Crée un estimateur de résolution.
 * @param {object} options
 * @param {() => Array} options.getBoard          accès au plateau courant
 * @param {() => object} options.getCombatState   accès à l'état de combat courant
 * @param {Array<Function>} [options.sources]     sources additionnelles initiales
 * @returns {{ get: Function, invalidate: Function, addSource: Function }}
 */
export function createEstimator({ getBoard, getCombatState, sources = [] } = {}) {
  // La source plateau est toujours évaluée en premier ; les autres l'ajustent.
  const allSources = [boardSource, ...sources];
  let cache = null;
  let dirty = true;

  /** Marque l'estimation obsolète (à appeler après tout changement pertinent). */
  function invalidate() {
    dirty = true;
  }

  /** Ajoute une source d'effets (side-kick, gadget…) et invalide le cache. */
  function addSource(source) {
    allSources.push(source);
    dirty = true;
  }

  function compute() {
    const ctx = { board: getBoard(), combatState: getCombatState() };
    const estimate = createEmptyEstimate();
    for (const source of allSources) source(estimate, ctx);
    return estimate;
  }

  /** Renvoie l'estimation courante (recalcul paresseux si obsolète). */
  function get() {
    if (dirty || cache === null) {
      cache = compute();
      dirty = false;
    }
    return cache;
  }

  return { get, invalidate, addSource };
}
