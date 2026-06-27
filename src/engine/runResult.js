// src/engine/runResult.js — Calcul du résultat de fin de run.
//
// Module purement calculatoire, sans effet de bord et sans accès au profil ni
// au DOM. Mêmes entrées → mêmes sorties (testable de façon isolée).
//
// C'est endRun() qui applique le rapport au profil ; ce module ne fait que
// produire les données.
//
// Formule de base (v1) :
//   base         = phase × round          (max 30 : round 10, phase 3)
//   victory      → metaPoints = base
//   defeat|abandon → metaPoints = floor(base / 2)
//
// Jour 1 phase 1 en défaite/abandon : floor(1/2) = 0 — voulu (anti-farm).
// Défaite et abandon partagent la même branche aujourd'hui mais restent des
// paramètres distincts pour permettre une divergence future sans refonte.

/**
 * Calcule le rapport de fin de run.
 *
 * @param {object} params
 * @param {'victory'|'defeat'|'abandon'} params.outcome
 * @param {number} params.day      Jour atteint (run.progression.round, 1-10).
 * @param {number} params.mission  Mission atteinte (run.progression.phase, 1-3).
 * @returns {RunResult}
 *
 * @typedef {object} RunResult
 * @property {'victory'|'defeat'|'abandon'} outcome
 * @property {number} day
 * @property {number} mission
 * @property {number} base          Produit brut (mission × day).
 * @property {number} metaPoints    Méta-points gagnés.
 * @property {object} breakdown     Termes intermédiaires pour un futur écran de score.
 * @property {string} breakdown.formula
 * @property {number} breakdown.base
 * @property {number} breakdown.divisor   1 pour victoire, 2 pour défaite/abandon.
 */
export function computeRunResult({ outcome, day, mission }) {
  const base = mission * day;

  let metaPoints;
  if (outcome === 'victory') {
    metaPoints = base;
  } else if (outcome === 'defeat') {
    metaPoints = Math.floor(base / 2);
  } else if (outcome === 'abandon') {
    metaPoints = Math.floor(base / 2);
  } else {
    metaPoints = 0;
  }

  const divisor = outcome === 'victory' ? 1 : 2;

  return {
    outcome,
    day,
    mission,
    base,
    metaPoints,
    breakdown: {
      formula:  outcome === 'victory' ? 'mission × day' : 'floor(mission × day / 2)',
      base,
      divisor,
    },
  };
}
