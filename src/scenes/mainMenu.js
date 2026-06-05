// src/scenes/mainMenu.js — Scène « menu principal ».
//
// Affiche le titre du jeu et une liste verticale de choix :
//   Nouvelle partie · Options · Quitter  (stubs pour l'instant).
// Navigation : ↑/↓ entre les choix, Entrée pour confirmer. Le choix actif est
// annoncé via la région ARIA live à chaque déplacement (fourni par AbstractMenu).
//
// Choix d'architecture : le menu principal est une CONFIGURATION de LinearMenu
// (orientation verticale), PAS une sous-classe. La hiérarchie de menus reste
// ainsi à deux niveaux — base abstraite (AbstractMenu) + classes concrètes
// (LinearMenu, GridMenu) — et les menus spécifiques sont de simples instances
// dont le comportement des choix est branché via le callback onConfirm.
//
// La scène ne manipule pas le DOM : elle délègue tout le rendu et le cycle de
// vie au composant LinearMenu (module ui/). Elle se contente de passer le
// conteneur racine et de réagir aux confirmations.

import { LinearMenu } from '../ui/menus/LinearMenu.js';

/** Identifiants stables des choix (découplés des libellés traduits). */
export const MainMenuChoice = Object.freeze({
  NEW_GAME: 'new-game',
  OPTIONS: 'options',
  QUIT: 'quit',
  COMBAT_TEST: 'combat-test',
});

/**
 * Fabrique de scène pour le routeur.
 * @returns {{ mount: Function, unmount: Function }}
 */
export function createMainMenuScene() {
  let menu = null;

  return {
    mount(context) {
      const { root, announce, strings, debug } = context;

      const items = [
        { id: MainMenuChoice.NEW_GAME, label: strings?.menu?.start ?? 'Nouvelle partie' },
        { id: MainMenuChoice.OPTIONS, label: strings?.menu?.options ?? 'Options' },
        { id: MainMenuChoice.QUIT, label: strings?.menu?.quit ?? 'Quitter' },
      ];

      // Option de développement : visible uniquement quand DEBUG est actif.
      if (debug) {
        items.push({ id: MainMenuChoice.COMBAT_TEST, label: strings?.menu?.combatTest ?? 'Combat test' });
      }

      menu = new LinearMenu({
        container: root,
        announce,
        orientation: 'vertical',
        title: strings?.menu?.title ?? 'Duoforce',
        ariaLabel: strings?.menu?.label ?? 'Menu principal',
        items,
        onConfirm: (item) => {
          if (item.id === MainMenuChoice.COMBAT_TEST) {
            context.router.go('combat');
            return;
          }
          // Stubs : pas de logique derrière les autres boutons pour l'instant.
          // TODO: NEW_GAME → context.router.go('game') ; OPTIONS → scène options ; QUIT → …
          console.log('[mainMenu] choix sélectionné :', item.id);
        },
      });

      menu.mount();
    },
    unmount() {
      if (menu) {
        menu.unmount();
        menu = null;
      }
    },
  };
}
