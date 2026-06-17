// src/ui/listNavigation.js — Navigation verticale réutilisable (type menu).
//
// Mutualise la logique « curseur sur une liste de lignes » utilisée par la
// plupart des menus standard et par plusieurs zones de combat (duo, ennemi,
// historique…) : flèches haut/bas, Origine/Fin, et l'option de cyclage
// (preferences.menuCycling). Centralise le comportement pour éviter la
// duplication et permettre d'ajouter des préférences plus tard.
//
// Deux niveaux d'API :
//   - resolveListMove(...) : décision PURE (index suivant + bord + faut-il annoncer),
//     réutilisée par les menus (AbstractMenu) comme par le navigateur ci-dessous.
//   - createListNavigator(...) : navigateur prêt à l'emploi pour les zones de
//     combat (lit getItems(), annonce lui-même).
//
// Annonces :
//   - déplacement normal        → la nouvelle entrée, sans préfixe ;
//   - bord atteint sans cyclage → l'entrée COURANTE, préfixée de « * » ;
//   - bord atteint avec cyclage → la nouvelle entrée (après bouclage), préfixée « * » ;
//   - Origine / Fin             → la nouvelle entrée sans préfixe, ou rien si le
//                                 curseur y est déjà.
//
// Aucun accès DOM ici (getItems/announce encapsulent l'UI).

import { preferences } from './preferences.js';

/** Préfixe d'annonce signalant un évènement de bord (blocage ou bouclage). */
export const EDGE_MARK = '* ';

/** Commandes de navigation normalisées. */
export const NavCommand = Object.freeze({
  PREVIOUS: 'previous', // vers le haut / précédent
  NEXT: 'next',         // vers le bas / suivant
  FIRST: 'first',       // Origine
  LAST: 'last',         // Fin
});

const KEY_TO_COMMAND = {
  ArrowUp: NavCommand.PREVIOUS,
  ArrowDown: NavCommand.NEXT,
  Home: NavCommand.FIRST,
  End: NavCommand.LAST,
};

/**
 * Décide du déplacement du curseur, SANS effet de bord.
 * @param {number} cursor   index courant
 * @param {number} length   nombre d'entrées
 * @param {string} command  NavCommand.*
 * @param {boolean} cycling  preferences.menuCycling
 * @returns {{ index:number, edge:boolean, announce:boolean }}
 *   index    : nouvel index ;
 *   edge     : un évènement de bord a eu lieu (blocage ou bouclage) → préfixe « * » ;
 *   announce : faut-il annoncer (false pour Origine/Fin déjà sur la cible).
 */
export function resolveListMove(cursor, length, command, cycling) {
  if (length === 0) return { index: 0, edge: false, announce: false };
  const last = length - 1;
  switch (command) {
    case NavCommand.NEXT:
      if (cursor < last) return { index: cursor + 1, edge: false, announce: true };
      if (cycling) return { index: 0, edge: true, announce: true };
      return { index: cursor, edge: true, announce: true }; // bloqué
    case NavCommand.PREVIOUS:
      if (cursor > 0) return { index: cursor - 1, edge: false, announce: true };
      if (cycling) return { index: last, edge: true, announce: true };
      return { index: cursor, edge: true, announce: true }; // bloqué
    case NavCommand.FIRST:
      return { index: 0, edge: false, announce: cursor !== 0 };
    case NavCommand.LAST:
      return { index: last, edge: false, announce: cursor !== last };
    default:
      return { index: cursor, edge: false, announce: false };
  }
}

/**
 * Crée un navigateur de liste verticale (zones de combat).
 * @param {object} options
 * @param {() => string[]} options.getItems   lignes courantes (dynamiques)
 * @param {(text: string) => void} options.announce  annonce une ligne
 * @returns {{ onKey: Function, move: Function, reset: Function, toLast: Function, current: Function }}
 */
export function createListNavigator({ getItems, announce }) {
  let cursor = 0;
  const clamp = (n, len) => Math.max(0, Math.min(n, len - 1));

  function current() {
    const items = getItems();
    if (items.length === 0) return '';
    cursor = clamp(cursor, items.length);
    return items[cursor];
  }

  function reset() {
    cursor = 0;
    return current();
  }

  function toLast() {
    const items = getItems();
    cursor = Math.max(0, items.length - 1);
    return current();
  }

  /** Applique une NavCommand : déplace le curseur et annonce si nécessaire. */
  function move(command) {
    const items = getItems();
    if (items.length === 0) return;
    cursor = clamp(cursor, items.length);
    const { index, edge, announce: doAnnounce } = resolveListMove(
      cursor, items.length, command, preferences.menuCycling,
    );
    cursor = index;
    if (doAnnounce) announce((edge ? EDGE_MARK : '') + items[cursor]);
  }

  /** Gère une touche brute. Renvoie true si consommée. */
  function onKey(event) {
    const command = KEY_TO_COMMAND[event.key];
    if (!command) return false;
    move(command);
    return true;
  }

  return { onKey, move, reset, toLast, current };
}
