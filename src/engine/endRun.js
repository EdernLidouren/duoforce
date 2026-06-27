// src/engine/endRun.js — Point d'entrée unique de fin de run.
//
// Toutes les fins de partie (victoire, défaite, abandon) passent par ici.
// Garantit que les compteurs sont mis à jour de façon uniforme et que le profil
// est sauvegardé, quel que soit le chemin qui a mené à la fin.
//
// Ordre des opérations :
//   1. Lire profile.run AVANT d'appeler endRun si le contenu est nécessaire
//      pour affichage (jour atteint, etc.) — la run est mise à null ici.
//   2. Mettre profile.run à null.
//   3. Incrémenter runsCompleted (toujours) et le compteur de l'outcome.
//   4. Sauvegarder le profil.
//
// Aucun DOM. Aucune dépendance vers src/ui/.

import { saveProfileToLocal } from './persistence.js';

/**
 * Termine la run en cours et met à jour le profil.
 *
 * @param {object} profile   Profil vivant (modifié en place).
 * @param {'victory'|'defeat'|'abandon'} outcome
 */
export function endRun(profile, outcome) {
  profile.run = null;
  profile.stats.runsCompleted++;

  if (outcome === 'victory') profile.stats.wins++;
  else if (outcome === 'defeat') profile.stats.losses++;
  else if (outcome === 'abandon') profile.stats.abandons++;

  saveProfileToLocal(profile);
}
