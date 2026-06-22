// src/ui/zones.js — Navigation par « zones » pour interfaces pilotées au clavier.
//
// Objectif accessibilité : maintenir le lecteur d'écran en MODE FORMULAIRE
// (focus mode) sur toute une interface, afin que les touches soient envoyées
// directement à l'application plutôt qu'interceptées par le mode navigation.
// Pour cela, le conteneur reçoit role="application" : NVDA passe alors toutes
// les frappes à la page, et c'est nous qui gérons entièrement le clavier.
//
// Modèle : une interface est découpée en ZONES. On cycle la zone active avec
// Tabulation (suivante) / Maj+Tabulation (précédente), en bouclant. Changer de
// zone déplace le focus DOM vers l'élément de la zone et l'annonce via la région
// ARIA live. Chaque zone gère ses propres touches (ex. flèches 2D sur un plateau).
//
// Zone activée par défaut : à la CRÉATION de l'interface (mount), c'est la zone
// par défaut qui reçoit le focus — uniquement à ce moment, pas à chaque
// changement de focus ensuite. Indiquée via `defaultZone` (id de zone ou index) ;
// si non précisée, la première zone (index 0). Pour restaurer la zone d'un menu
// précédent (sous-menus à venir), il suffira de passer l'index sauvegardé comme
// `defaultZone` à la recréation du contrôleur.
//
// Cette mécanique n'a AUCUN impact visuel ni sur la navigation souris : les
// éléments restent cliquables, la mise en page est inchangée.
//
// --- Contrat d'une zone -----------------------------------------------------
//   {
//     id?     : string,                 // identifiant (cible possible de defaultZone)
//     element : HTMLElement,            // conteneur focusable de la zone
//     label   : string,                 // nom annoncé en entrant dans la zone
//     role?   : string,                 // rôle ARIA de l'élément (défaut "group")
//     noAria? : boolean,                // si true, aucun role ni aria-label posé sur l'élément
//     focus?  : () => void,             // déplace le focus (défaut: element.focus())
//     onEnter?: () => (string|null),    // résumé du contenu annoncé à l'entrée
//     onKey?  : (event) => boolean,     // gère une touche ; true si consommée
//   }

/**
 * Résout `defaultZone` (id, label ou index) en un index valide ; 0 par défaut.
 * @param {string|number|undefined} defaultZone
 * @param {Array} zones
 * @returns {number}
 */
function resolveDefaultIndex(defaultZone, zones) {
  if (typeof defaultZone === 'number' && defaultZone >= 0 && defaultZone < zones.length) {
    return defaultZone;
  }
  if (typeof defaultZone === 'string') {
    const i = zones.findIndex((z) => z.id === defaultZone || z.label === defaultZone);
    if (i >= 0) return i;
  }
  return 0;
}

/**
 * Crée un contrôleur de zones sur un conteneur.
 * @param {object} options
 * @param {HTMLElement} options.container         conteneur (recevra role="application")
 * @param {{polite:Function, assertive:Function}} [options.announce]
 * @param {string} [options.label]                libellé accessible du conteneur
 * @param {Array}  options.zones                  zones (voir contrat ci-dessus)
 * @param {string|number} [options.defaultZone]   zone activée à la création
 *   (id, label ou index) ; première zone si non précisée.
 * @returns {object} API du contrôleur
 */
export function createZoneController({ container, announce, label, zones, defaultZone }) {
  const defaultIndex = resolveDefaultIndex(defaultZone, zones);
  let activeIndex = defaultIndex;
  let keydownHandler = null;

  function wrap(index) {
    const n = zones.length;
    return ((index % n) + n) % n;
  }

  /** Construit le message d'annonce d'une zone (label + résumé éventuel). */
  function zoneMessage(zone) {
    const parts = [zone.label];
    const extra = typeof zone.onEnter === 'function' ? zone.onEnter() : null;
    if (extra) parts.push(extra);
    return parts.filter(Boolean).join('. ');
  }

  function announceZone(zone) {
    if (announce) announce.polite(zoneMessage(zone));
  }

  /**
   * Active une zone : déplace le focus et (sauf silencieux) l'annonce.
   * @param {number} index
   * @param {{silent?: boolean}} [opts]
   */
  function activate(index, { silent = false } = {}) {
    activeIndex = wrap(index);
    const zone = zones[activeIndex];
    if (typeof zone.focus === 'function') zone.focus();
    else zone.element.focus();
    if (!silent) announceZone(zone);
  }

  /** Réannonce la zone active sans changer le focus (ex. après un tour de jeu). */
  function announceActive() {
    announceZone(zones[activeIndex]);
  }

  /** Message d'annonce de la zone active, sans l'annoncer (pour composer un accueil). */
  function describeActive() {
    return zoneMessage(zones[activeIndex]);
  }

  function handleKeydown(event) {
    // Tabulation : cycle de zones (priorité sur tout le reste).
    if (event.key === 'Tab') {
      event.preventDefault();
      activate(activeIndex + (event.shiftKey ? -1 : 1));
      return;
    }
    // Toute autre touche est déléguée à la zone active.
    const zone = zones[activeIndex];
    if (zone && typeof zone.onKey === 'function') {
      const consumed = zone.onKey(event);
      if (consumed) event.preventDefault();
    }
  }

  /**
   * Branche le contrôleur : role=application, zones focusables, écoute clavier,
   * puis active la zone PAR DÉFAUT (focus seul ; la scène compose son annonce
   * d'entrée). N'a lieu qu'ici, à la création — pas à chaque changement de focus.
   */
  function mount() {
    container.setAttribute('role', 'application');
    if (label) container.setAttribute('aria-label', label);

    zones.forEach((zone) => {
      zone.element.tabIndex = -1;
      if (!zone.noAria) {
        zone.element.setAttribute('role', zone.role ?? 'group');
        if (zone.label) zone.element.setAttribute('aria-label', zone.label);
      }
    });

    keydownHandler = handleKeydown;
    container.addEventListener('keydown', keydownHandler);

    activate(defaultIndex, { silent: true });
  }

  /** Débranche l'écoute clavier (à appeler au unmount de la scène). */
  function dispose() {
    if (keydownHandler) {
      container.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  }

  return {
    mount,
    dispose,
    activate,
    announceActive,
    describeActive,
    get activeIndex() { return activeIndex; },
  };
}
