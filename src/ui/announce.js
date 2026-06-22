// src/ui/announce.js — Annonces ARIA live.
//
// Trois canaux, tous masqués visuellement mais lus par NVDA :
//
//   - polite(message)  : annonce polie IMMÉDIATE via DEUX RÉGIONS ALTERNÉES
//     (#live-a / #live-b). Technique préconisée par NV Access : à chaque écriture
//     on bascule de l'une à l'autre, ce qui garantit que NVDA perçoit un
//     changement même si le message est identique au précédent. Pour la
//     navigation, les requêtes, les annonces uniques (le plus récent gagne).
//
//   - enqueue(message) : journal SÉQUENTIEL via une région role="log" (#live-log).
//     On y AJOUTE un nœud par message ; le lecteur d'écran met naturellement les
//     ajouts en file d'attente polie (aria-relevant=additions implicite,
//     aria-atomic=false). Les messages sont donc lus les uns après les autres,
//     SANS délai artificiel — les lecteurs d'écran gèrent très bien cette file.
//
//   - assertive(message) : région unique immédiate (#aria-alert), urgences.
//
// Seul ce module écrit dans les régions live. Aucune logique de jeu ici.

// Nombre maximal de nœuds conservés dans la région journal (garde le DOM léger ;
// les ajouts plus anciens ont déjà été annoncés, on peut les élaguer).
const LOG_MAX_NODES = 30;

/**
 * Crée un annonceur lié aux régions live.
 * @param {{ alert: HTMLElement }} [regions]  region assertive (#aria-alert).
 * @returns {{ polite: Function, enqueue: Function, assertive: Function, clearLog: Function }}
 */
export function createAnnouncer(regions = {}) {
  let activeRegion = 'a'; // région polite courante : 'a' ou 'b'

  /** Écrit un message dans la région polite courante, en basculant. */
  function writeToActive(message) {
    const current = document.getElementById(`live-${activeRegion}`);
    const other = document.getElementById(`live-${activeRegion === 'a' ? 'b' : 'a'}`);
    if (!current || !other) return;
    other.textContent = '';
    activeRegion = activeRegion === 'a' ? 'b' : 'a';
    current.textContent = message;
  }

  /** Annonce immédiate (la plus récente gagne). */
  function polite(message) {
    writeToActive(message);
  }

  /**
   * Annonce séquentielle : ajoute un nœud à la région journal (role="log").
   * Le lecteur d'écran les met en file et les lit un par un, sans délai imposé.
   */
  function enqueue(message) {
    const log = document.getElementById('live-log');
    if (!log) { writeToActive(message); return; } // repli si la région manque
    const line = document.createElement('div');
    line.textContent = message;
    log.append(line);
    while (log.children.length > LOG_MAX_NODES) log.removeChild(log.firstChild);
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

  /** Vide la région journal (#live-log) sans déclencher d'annonce. */
  function clearLog() {
    const log = document.getElementById('live-log');
    if (log) log.replaceChildren();
  }

  return { polite, enqueue, assertive, clearLog };
}
