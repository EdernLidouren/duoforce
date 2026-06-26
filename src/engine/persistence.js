// src/engine/persistence.js — Couche de persistance localStorage.
//
// Orchestre le où et le quand de la sauvegarde du profil.
// Le profil ne sait pas où il est stocké ; cette couche le décide.
//
// Responsabilités :
//   - Écrire le profil sérialisé dans localStorage.
//   - Lire et désérialiser le profil depuis localStorage.
//   - Tester la présence d'un profil sauvegardé.
//
// Aucun DOM. L'usage de localStorage est acceptable hors src/ui/ : c'est de
// la persistance, pas du rendu.

import { PROFILE_STORAGE_KEY } from '../config/storageKeys.js';
import { serializeProfile, deserializeProfile } from './profile.js';

/**
 * Sérialise le profil et l'écrit dans localStorage.
 * Les erreurs de stockage (quota, navigation privée) sont silencieusement ignorées.
 *
 * @param {object} profile  profil vivant
 */
export function saveProfileToLocal(profile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(serializeProfile(profile)));
  } catch {
    /* quota, navigation privée — on continue sans crasher */
  }
}

/**
 * Lit la clé localStorage et reconstruit le profil vivant.
 * Retourne null si aucun profil n'est présent ou si la lecture échoue.
 *
 * @returns {object|null}
 */
export function loadProfileFromLocal() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return deserializeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Indique si un profil sauvegardé est présent en localStorage.
 *
 * @returns {boolean}
 */
export function hasLocalProfile() {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
