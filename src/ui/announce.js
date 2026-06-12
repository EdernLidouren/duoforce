// src/ui/announce.js — Annonces ARIA live par DEUX RÉGIONS ALTERNÉES.
//
// Technique préconisée par NV Access : deux régions aria-live="polite" identiques
// coexistent (#live-a et #live-b). À chaque écriture on bascule de l'une à
// l'autre, ce qui garantit que NVDA perçoit un changement même si le message est
// identique au précédent.
//
// Deux modes d'annonce polie :
//   - polite(message)  : IMMÉDIAT. Vide la file et annonce tout de suite ; le
//     plus récent gagne. Pour la navigation, les requêtes, les annonces uniques.
//   - enqueue(message) : SÉQUENTIEL. Met en file ; les messages sont émis un par
//     un, espacés, et donc lus les uns après les autres. Pour les rafales de
//     messages (ex. journal de fin de tour) : sans cela, tout serait écrit dans
//     le même tick et seul le dernier serait lu. Une annonce polite() en cours
//     de file l'interrompt (le joueur peut consulter le journal dans la zone
//     Messages).
//
// La région assertive (#aria-alert) reste une région unique immédiate.
//
// Seul ce module écrit dans les régions live. Aucune logique de jeu ici.

// Intervalle entre deux messages de la file séquentielle (ms), ajustable.
const MESSAGE_GAP = 250;

/**
 * Crée un annonceur lié aux régions live.
 * @param {{ alert: HTMLElement }} [regions]  region assertive (#aria-alert).
 * @returns {{ polite: Function, enqueue: Function, assertive: Function }}
 */
export function createAnnouncer(regions = {}) {
  let activeRegion = 'a'; // région polite courante : 'a' ou 'b'
  const queue = [];
  let timer = null;

  /** Écrit un message dans la région polite courante, en basculant. */
  function writeToActive(message) {
    const current = document.getElementById(`live-${activeRegion}`);
    const other = document.getElementById(`live-${activeRegion === 'a' ? 'b' : 'a'}`);
    if (!current || !other) return;
    other.textContent = '';
    activeRegion = activeRegion === 'a' ? 'b' : 'a';
    current.textContent = message;
  }

  /** Émet le prochain message de la file, puis se reprogramme s'il en reste. */
  function pump() {
    if (queue.length === 0) {
      timer = null;
      return;
    }
    writeToActive(queue.shift());
    timer = setTimeout(pump, MESSAGE_GAP);
  }

  /** Annonce immédiate (vide la file en cours). */
  function polite(message) {
    queue.length = 0;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    writeToActive(message);
  }

  /** Annonce séquentielle : mise en file, lue après les précédentes. */
  function enqueue(message) {
    queue.push(message);
    if (timer === null) pump(); // démarre : premier message immédiat
  }

  /** Annonce urgente (région unique #aria-alert), immédiate. */
  function assertive(message) {
    const region = regions.alert;
    if (!region) return;
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 50);
  }

  return { polite, enqueue, assertive };
}
