// src/engine/endRun.js — Point d'entrée unique de fin de run.
//
// Toutes les fins de partie (victoire, défaite, abandon) passent par ici.
// Garantit que les compteurs sont mis à jour de façon uniforme et que le profil
// est sauvegardé, quel que soit le chemin qui a mené à la fin.
//
// Ordre des opérations :
//   1. Lire profile.run AVANT de la mettre à null (pour computeRunResult).
//   2. Calculer le rapport via computeRunResult (sans effet de bord).
//   3. Appliquer le rapport au profil : metaCurrency, stats.
//   4. Mettre profile.run à null.
//   5. Sauvegarder le profil.
//   6. Retourner le rapport (les scènes de fin l'affichent).
//
// Le module runResult.js calcule ; endRun applique.
// Aucun DOM. Aucune dépendance vers src/ui/.

import { saveProfileToLocal }  from './persistence.js';
import { computeRunResult }    from './runResult.js';

/**
 * Termine la run en cours, applique le résultat au profil et le sauvegarde.
 *
 * @param {object} profile   Profil vivant (modifié en place).
 * @param {'victory'|'defeat'|'abandon'} outcome
 * @returns {import('./runResult.js').RunResult}  Rapport à exploiter par la scène.
 */
export function endRun(profile, outcome) {
  // Lire la progression AVANT de mettre run à null.
  const run     = profile.run;
  const day     = run?.progression?.round ?? 1;
  const mission = run?.progression?.phase ?? 1;

  // Calcul pur — pas d'effet de bord.
  const result = computeRunResult({ outcome, day, mission });

  // Appliquer le rapport au profil.
  profile.metaCurrency = (profile.metaCurrency ?? 0) + result.metaPoints;
  profile.stats.runsCompleted++;
  if (outcome === 'victory') profile.stats.wins++;
  else if (outcome === 'defeat') profile.stats.losses++;
  else if (outcome === 'abandon') profile.stats.abandons++;

  profile.run = null;
  saveProfileToLocal(profile);

  return result;
}
