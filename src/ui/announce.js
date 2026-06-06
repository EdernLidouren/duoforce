// src/ui/announce.js — Annonces ARIA live par DEUX RÉGIONS ALTERNÉES.
//
// Technique préconisée par NV Access : deux régions aria-live="polite" identiques
// coexistent dans le DOM (#live-a et #live-b). À chaque annonce on bascule de
// l'une à l'autre. Comme la région qui reçoit le message passe de « vide » à
// « texte », NVDA perçoit toujours un changement — même si le message est
// strictement identique au précédent (qui, lui, vivait dans l'AUTRE région).
//
// Latence : on n'ajoute AUCUN délai pour les annonces polite. La région cible
// (`current`) est déjà vide — elle a été vidée en tant que `other` lors de
// l'annonce précédente — donc lui écrire le message est déjà une transition
// vide→texte. Inutile de passer par un setTimeout (ce qui ne ferait qu'ajouter
// de la latence avant lecture). La latence résiduelle perçue est celle, propre,
// de NVDA sur les régions polite.
//
// La région assertive (#aria-alert) reste une région unique, pour les annonces
// urgentes (fin de combat, erreurs).
//
// Seul ce module écrit dans les régions live. Aucune logique de jeu ici.

// Petit délai réservé à l'assertive (région unique) : repasser par « vide » au
// tick suivant garantit qu'un message identique consécutif soit relu. Annonces
// assertives rares → latence sans incidence perceptible.
const ASSERTIVE_DELAY = 50;

/**
 * Crée un annonceur lié aux régions live.
 * @param {{ alert: HTMLElement }} [regions]  region assertive (#aria-alert).
 *   (Les régions polite #live-a / #live-b sont résolues par id.)
 * @returns {{ polite: Function, assertive: Function }}
 */
export function createAnnouncer(regions = {}) {
  // Région polite active : 'a' ou 'b'. On alterne à chaque annonce.
  let activeRegion = 'a';

  /** Annonce non urgente, en basculant entre #live-a et #live-b. Sans délai. */
  function polite(message) {
    const current = document.getElementById(`live-${activeRegion}`);
    const other = document.getElementById(`live-${activeRegion === 'a' ? 'b' : 'a'}`);
    if (!current || !other) return;

    // `current` est déjà vide (vidé comme `other` à l'annonce précédente) :
    // l'écriture est immédiatement une transition vide→texte.
    other.textContent = '';
    activeRegion = activeRegion === 'a' ? 'b' : 'a';
    current.textContent = message;
  }

  /** Annonce urgente (région unique #aria-alert). */
  function assertive(message) {
    const region = regions.alert;
    if (!region) return;
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, ASSERTIVE_DELAY);
  }

  return { polite, assertive };
}
