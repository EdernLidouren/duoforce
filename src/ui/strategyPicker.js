// src/ui/strategyPicker.js — Menu modal de sélection de remplacement (stratégie).
//
// Composant de sélection linéaire temporairement superposé à la zone Plateau
// via le mécanisme boardKeyHandler. Réutilise resolveListMove / NavCommand /
// EDGE_MARK de listNavigation.js pour la logique de déplacement et les annonces.
//
// Cycle de vie identique à createZoneSelector :
//   boardKeyHandler = picker.handleKey;
//   picker.open();
//   // onConfirm / onCancel : ferment le picker et restituent boardKeyHandler.
//
// Touches gérées :
//   Flèches haut/bas, Origine, Fin — navigation (cycling selon preferences).
//   Entrée, Espace  — confirme l'item courant.
//   Échap           — annule sans consommer de point.

import { resolveListMove, NavCommand, EDGE_MARK } from './listNavigation.js';
import { preferences } from './preferences.js';

const KEY_TO_CMD = {
  ArrowUp:   NavCommand.PREVIOUS,
  ArrowDown: NavCommand.NEXT,
  Home:      NavCommand.FIRST,
  End:       NavCommand.LAST,
};

/**
 * Crée un sélecteur de remplacement à navigation linéaire.
 *
 * @param {object}   options
 * @param {object[]} options.items       pouvoirs candidats (au moins 2)
 * @param {(item: object) => string} options.getLabel  description annoncée de chaque item
 * @param {(text: string) => void}   options.announce  annonce NVDA (polite)
 * @param {string}   options.openMessage               annoncé à l'ouverture, suivi du premier item
 * @param {(item: object) => void}   options.onConfirm item sélectionné par le joueur
 * @param {() => void} options.onCancel                annulation (aucun point consommé)
 * @returns {{ open: Function, close: Function, handleKey: Function }}
 */
export function createStrategyPicker({ items, getLabel, announce, openMessage, onConfirm, onCancel }) {
  let cursor = 0;
  let isOpen = false;

  function announceCurrent(prefix = '') {
    announce(`${prefix}${getLabel(items[cursor])}`);
  }

  function open() {
    cursor = 0;
    isOpen = true;
    // Annonce l'instruction d'ouverture immédiatement suivie du premier choix.
    announce(`${openMessage} ${getLabel(items[0])}`);
  }

  function close() {
    isOpen = false;
  }

  /**
   * Gestionnaire de touches à brancher sur boardKeyHandler.
   * Retourne true si la touche est consommée.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function handleKey(event) {
    if (!isOpen) return false;

    const cmd = KEY_TO_CMD[event.key];
    if (cmd) {
      const { index, edge, announce: doAnnounce } = resolveListMove(
        cursor, items.length, cmd, preferences.menuCycling,
      );
      cursor = index;
      if (doAnnounce) announceCurrent(edge ? EDGE_MARK : '');
      return true;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const chosen = items[cursor];
      close();
      onConfirm(chosen);
      return true;
    }

    if (event.key === 'Escape') {
      close();
      onCancel();
      return true;
    }

    return false;
  }

  return { open, close, handleKey };
}
