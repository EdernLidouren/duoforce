// src/engine/profile.js — Objet profil et sérialisation.
//
// Le profil est l'unité racine de sauvegarde. Il contient :
//   - la run en cours (ou null)
//   - la méta-progression (métamonnaie, déblocages, statistiques)
//   - les préférences joueur
//   - les métadonnées de version
//
// Frontière profil ↔ run :
//   - La run vit dans profile.run ; elle n'est pas une sauvegarde séparée.
//   - La progression dans la run (jour/mission) reste dans run.progression.
//   - Le méta-progrès (métamonnaie, déblocages, stats cumulées) vit ici.
//
// Aucun DOM, aucune dépendance vers src/ui/.

import { SAVE_FORMAT_VERSION } from '../config/version.js';
import { serialize as serializeRun, deserialize as deserializeRun } from './run.js';

// --- Création ---------------------------------------------------------------

/**
 * Initialise un profil neuf : run absente, compteurs à zéro, préférences par défaut.
 *
 * @returns {object} profil vivant
 */
export function createProfile() {
  return {
    run:          null,
    metaCurrency: 0,
    unlocks:      [],
    stats: {
      runsStarted:   0,
      runsCompleted: 0,
      wins:          0,
      losses:        0,
      abandons:      0,
      playTimeMs:    0,
    },
    preferences: {
      menuCycling:    false,
      testListChoice: 'optA',
      testVolume:     70,
    },
    meta: {
      saveFormatVersion: SAVE_FORMAT_VERSION,
      createdAt:         Date.now(),
    },
  };
}

// --- Sérialisation ----------------------------------------------------------

/**
 * Produit un save object plat et JSON-sérialisable depuis le profil vivant.
 * Si une run est présente, elle est sérialisée via le serialize de run.js.
 *
 * @param {object} profile
 * @returns {object} save object (plain JSON)
 */
export function serializeProfile(profile) {
  return {
    saveFormatVersion: profile.meta.saveFormatVersion,
    createdAt:         profile.meta.createdAt,
    run:          profile.run ? serializeRun(profile.run) : null,
    metaCurrency: profile.metaCurrency,
    unlocks:      [...profile.unlocks],
    stats:        { ...profile.stats },
    preferences:  { ...profile.preferences },
  };
}

/**
 * Reconstruit un profil vivant depuis un save object.
 * Reconstruit la run via deserializeRun si elle est présente.
 * Logue un avertissement si la version du format ne correspond pas.
 *
 * @param {object} saveObject
 * @returns {object} profil vivant
 */
export function deserializeProfile(saveObject) {
  const savedVersion = saveObject.saveFormatVersion ?? 0;
  if (savedVersion !== SAVE_FORMAT_VERSION) {
    console.warn(
      `[profile] Incompatibilité de format de sauvegarde : ` +
      `save v${savedVersion}, attendu v${SAVE_FORMAT_VERSION}. ` +
      `Le profil est peut-être corrompu ou issu d'une version incompatible.`,
    );
  }

  return {
    run:          saveObject.run ? deserializeRun(saveObject.run) : null,
    metaCurrency: saveObject.metaCurrency ?? 0,
    unlocks:      [...(saveObject.unlocks ?? [])],
    stats: {
      runsStarted:   saveObject.stats?.runsStarted   ?? 0,
      runsCompleted: saveObject.stats?.runsCompleted ?? 0,
      wins:          saveObject.stats?.wins          ?? 0,
      losses:        saveObject.stats?.losses        ?? 0,
      abandons:      saveObject.stats?.abandons      ?? 0,
      playTimeMs:    saveObject.stats?.playTimeMs    ?? 0,
    },
    preferences: {
      menuCycling:    saveObject.preferences?.menuCycling    ?? false,
      testListChoice: saveObject.preferences?.testListChoice ?? 'optA',
      testVolume:     saveObject.preferences?.testVolume     ?? 70,
    },
    meta: {
      saveFormatVersion: savedVersion,
      createdAt:         saveObject.createdAt ?? Date.now(),
    },
  };
}
