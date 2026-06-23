// src/ui/zoneSelector.js — Sélecteur générique de zone sur le plateau.
//
// Composant réutilisable : manœuvre, gadgets ciblant une zone, effets de perk.
// Ce composant ne connaît aucune règle de jeu — la logique de validité est
// entièrement fournie par l'appelant via `getZoneState`.
//
// Utilisation :
//   const selector = createZoneSelector({ tdByIndex, strings, announce,
//     getZoneState, describeCell, openMessage, forbiddenPrefix,
//     onConfirm, onCancel, initialPosition });
//   // Ouvrir — remplacer le gestionnaire de touches du plateau :
//   boardKeyHandler = selector.handleKey;
//   selector.open();
//   // Fermer (depuis onConfirm / onCancel) — restaurer le gestionnaire normal.
//
// Gestion du clavier (appelée via la zone Plateau de zones.js) :
//   Flèches : déplace le curseur (bord = clamp, pas de wrap)
//   Entrée   : confirme si sélectionnable ; annonce le motif sinon
//   Échap    : annule
//
// Classes CSS ajoutées aux <td> du plateau :
//   zone-sel--cursor       — case courante
//   zone-sel--selectable   — sélectionnable
//   zone-sel--out-of-range — hors de portée
//   zone-sel--forbidden    — interdite
//
// NVDA : toutes les annonces passent par announce.polite(). Aucun DOM propre.

import { indexToXY, xyToIndex, BOARD_ROWS } from './boardText.js';

const ARROW_DELTAS = {
  ArrowLeft:  [-1,  0],
  ArrowRight: [ 1,  0],
  ArrowUp:    [ 0, -1],
  ArrowDown:  [ 0,  1],
};

const CSS_STATES = ['zone-sel--selectable', 'zone-sel--out-of-range', 'zone-sel--forbidden'];
const CSS_CURSOR = 'zone-sel--cursor';

/**
 * Crée un sélecteur de zone réutilisable.
 *
 * @param {object} options
 * @param {Map<number, HTMLElement>} options.tdByIndex        cellules du plateau
 * @param {object}   options.strings                          pack de langue
 * @param {object}   options.announce                         { polite }
 * @param {(pos: number) => {status: string, sources?: string[]}} options.getZoneState
 *   Retourne le statut de la zone : 'selectable', 'out_of_range' ou 'forbidden'.
 *   `sources` est une liste de raisons (optionnelle, pour 'forbidden').
 * @param {(pos: number) => string} options.describeCell      description NVDA d'une case
 * @param {string}   options.openMessage                      annoncé à l'ouverture
 * @param {string}   [options.forbiddenPrefix]                préfixe pour les zones interdites
 * @param {(pos: number) => void} options.onConfirm           confirmation d'une zone
 * @param {() => void} options.onCancel                       annulation
 * @param {number}   [options.initialPosition=4]              position initiale du curseur
 * @returns {{ open: Function, close: Function, handleKey: Function }}
 */
export function createZoneSelector({
  tdByIndex,
  strings,
  announce,
  getZoneState,
  describeCell,
  openMessage,
  forbiddenPrefix,
  onConfirm,
  onCancel,
  initialPosition = 4,
}) {
  let cursorPos = initialPosition;
  let isOpen = false;

  // --- Visuels ---------------------------------------------------------------

  function clearVisuals() {
    for (const td of tdByIndex.values()) {
      td.classList.remove(CSS_CURSOR, ...CSS_STATES);
    }
  }

  function applyVisuals() {
    for (const [pos, td] of tdByIndex) {
      td.classList.remove(CSS_CURSOR, ...CSS_STATES);
      const { status } = getZoneState(pos);
      if (status === 'selectable')   td.classList.add('zone-sel--selectable');
      if (status === 'out_of_range') td.classList.add('zone-sel--out-of-range');
      if (status === 'forbidden')    td.classList.add('zone-sel--forbidden');
      if (pos === cursorPos)         td.classList.add(CSS_CURSOR);
    }
  }

  // --- Annonces NVDA ---------------------------------------------------------

  function outOfRangeLabel() {
    return strings?.zoneSelector?.outOfRange ?? 'Out of range';
  }

  function announceCursor() {
    const { status } = getZoneState(cursorPos);
    const desc = describeCell(cursorPos);
    if (status === 'selectable') {
      announce.polite(desc);
    } else if (status === 'out_of_range') {
      announce.polite(`${outOfRangeLabel()}. ${desc}`);
    } else {
      const prefix = forbiddenPrefix ?? strings?.zoneSelector?.forbidden ?? 'Forbidden';
      announce.polite(`${prefix}. ${desc}`);
    }
  }

  // --- Clavier ---------------------------------------------------------------

  function tryConfirm() {
    const { status } = getZoneState(cursorPos);
    if (status === 'selectable') {
      close();
      onConfirm(cursorPos);
    } else if (status === 'out_of_range') {
      announce.polite(outOfRangeLabel());
    } else {
      const prefix = forbiddenPrefix ?? strings?.zoneSelector?.forbidden ?? 'Forbidden';
      announce.polite(prefix);
    }
  }

  function tryCancel() {
    close();
    onCancel();
  }

  /**
   * Gestionnaire de touches à brancher sur la zone Plateau (remplace onBoardKey).
   * Retourne true si la touche est consommée.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function handleKey(event) {
    if (!isOpen) return false;

    const delta = ARROW_DELTAS[event.key];
    if (delta) {
      const { x, y } = indexToXY(cursorPos);
      const nx = Math.max(0, Math.min(2, x + delta[0]));
      const ny = Math.max(0, Math.min(BOARD_ROWS.length - 1, y + delta[1]));
      const newPos = xyToIndex(nx, ny);
      if (newPos !== cursorPos) {
        cursorPos = newPos;
        applyVisuals();
        announceCursor();
      }
      return true;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      tryConfirm();
      return true;
    }

    if (event.key === 'Escape') {
      tryCancel();
      return true;
    }

    return false;
  }

  // --- Cycle de vie ----------------------------------------------------------

  function open() {
    isOpen = true;
    cursorPos = initialPosition;
    applyVisuals();
    announce.polite(openMessage);
  }

  function close() {
    isOpen = false;
    clearVisuals();
  }

  return { open, close, handleKey };
}
