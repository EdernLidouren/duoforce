// src/ui/announce.js — Pont vers les régions ARIA live (accessibilité NVDA).
//
// Responsabilités :
//   - Pousser des messages texte dans les régions live définies dans index.html :
//       - status (aria-live="polite")    : annonces non urgentes,
//       - alert  (aria-live="assertive") : annonces urgentes (erreurs, coups refusés).
//   - Gérer la « relance » d'annonce (vider puis réécrire) pour que NVDA
//     reprononce un message identique consécutif.
//
// Seul ce module écrit dans les régions live. Aucune logique de jeu ici.

/**
 * Crée un annonceur lié aux régions live.
 * @param {{ status: HTMLElement, alert: HTMLElement }} regions
 * @returns {{ polite: Function, assertive: Function }}
 */
export function createAnnouncer(regions) {
  /**
   * Écrit un message dans une région en forçant une relecture.
   * @param {HTMLElement} region
   * @param {string} message
   */
  function write(region, message) {
    if (!region) return;
    // Vider puis réécrire au tick suivant : garantit que NVDA détecte le
    // changement même si le texte est identique au précédent.
    region.textContent = '';
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }

  return {
    /** Annonce non urgente. */
    polite(message) {
      write(regions.status, message);
    },
    /** Annonce urgente (erreur, coup invalide). */
    assertive(message) {
      write(regions.alert, message);
    },
  };
}
