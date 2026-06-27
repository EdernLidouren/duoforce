// src/ui/applyPreferences.js — Point d'accroche centralisé pour l'application des préférences.
//
// Appelé à deux moments :
//   1. Au démarrage (main.js), pour appliquer les préférences chargées depuis localStorage.
//   2. À la validation du menu Options, pour que les changements prennent effet immédiatement.
//
// Pour connecter un nouveau système à une préférence :
//   1. Ajouter la clé dans createProfile().preferences (profile.js).
//   2. Ajouter le champ dans le schema de options.js (DraftEditor).
//   3. Ajouter l'application ici (ex. audio.setVolume, announce.setSpeed).
//   4. Ajouter les chaînes de localisation dans les deux packs de langue.

import { preferences } from './preferences.js';

/**
 * Applique un objet de préférences aux systèmes qui en dépendent.
 * @param {object} prefs  profile.preferences (préférences sauvegardées ou brouillon validé).
 */
export function applyPreferences(prefs) {
  preferences.menuCycling = prefs.menuCycling ?? false;
  // Futurs systèmes : audio.setVolume(prefs.testVolume), announce.setSpeed(prefs.announceSpeed), etc.
}
