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
import { SubMenu } from '../ui/menus/SubMenu.js';

/** Identifiants stables des choix (découplés des libellés traduits). */
export const MainMenuChoice = Object.freeze({
  NEW_GAME: 'new-game',
  OPTIONS: 'options',
  QUIT: 'quit',
  COMBAT_TEST: 'combat-test',
  SUBMENU_TEST_INFO:   'submenu-test-info',
  SUBMENU_TEST_SINGLE: 'submenu-test-single',
  SUBMENU_TEST_MULTI:  'submenu-test-multi',
});

/**
 * Fabrique de scène pour le routeur.
 * @returns {{ mount: Function, unmount: Function }}
 */
export function createMainMenuScene() {
  let activeMenu = null; // LinearMenu principal ou SubMenu courant

  return {
    mount(context) {
      const { root, announce, strings, debug } = context;
      mountMainMenu();

      function mountMainMenu() {
        if (activeMenu) { activeMenu.unmount(); activeMenu = null; }

        const items = [
          { id: MainMenuChoice.NEW_GAME, label: strings?.menu?.start ?? 'Nouvelle partie' },
          { id: MainMenuChoice.OPTIONS,  label: strings?.menu?.options ?? 'Options' },
          { id: MainMenuChoice.QUIT,     label: strings?.menu?.quit ?? 'Quitter' },
        ];

        if (debug?.enabled && debug?.showTestCombat) {
          const sm = strings?.submenu ?? {};
          items.push({ id: MainMenuChoice.COMBAT_TEST,        label: strings?.menu?.combatTest ?? 'Combat test' });
          items.push({ id: MainMenuChoice.SUBMENU_TEST_INFO,   label: sm.testInfoTitle   ?? 'Test sous-menu informatif' });
          items.push({ id: MainMenuChoice.SUBMENU_TEST_SINGLE, label: sm.testSingleTitle ?? 'Test sous-menu choix unique' });
          items.push({ id: MainMenuChoice.SUBMENU_TEST_MULTI,  label: sm.testMultiTitle  ?? 'Test sous-menu choix multiples' });
        }

        activeMenu = new LinearMenu({
          container: root,
          announce,
          orientation: 'vertical',
          title: strings?.menu?.title ?? 'Duoforce',
          ariaLabel: strings?.menu?.label ?? 'Menu principal',
          interfaceName: strings?.menu?.title ?? 'Duoforce',
          interfaceDescription: strings?.menu?.label ?? 'Menu principal',
          items,
          onConfirm: (item) => handleMainChoice(item.id),
        });
        activeMenu.mount();
      }

      function handleMainChoice(id) {
        if (id === MainMenuChoice.NEW_GAME) {
          context.router.go('new-game');
          return;
        }
        if (id === MainMenuChoice.COMBAT_TEST) {
          context.router.go('combat');
          return;
        }
        if (id === MainMenuChoice.SUBMENU_TEST_INFO) {
          openTestSubMenu('informative');
          return;
        }
        if (id === MainMenuChoice.SUBMENU_TEST_SINGLE) {
          openTestSubMenu('single_choice');
          return;
        }
        if (id === MainMenuChoice.SUBMENU_TEST_MULTI) {
          openTestSubMenu('multiple_choice');
          return;
        }
        // Stubs.
        console.log('[mainMenu] choix sélectionné :', id);
      }

      function openTestSubMenu(mode) {
        if (activeMenu) { activeMenu.unmount(); activeMenu = null; }

        const sm = strings?.submenu ?? {};
        const testItems = [
          { id: 'a', label: sm.testItemA ?? 'Option Alpha' },
          { id: 'b', label: sm.testItemB ?? 'Option Bêta' },
          { id: 'c', label: sm.testItemC ?? 'Option Gamma' },
          { id: 'd', label: sm.testItemD ?? 'Option Delta' },
          { id: 'e', label: sm.testItemE ?? 'Option Epsilon' },
        ];

        const titles = {
          informative:     sm.testInfoTitle   ?? 'Sous-menu informatif',
          single_choice:   sm.testSingleTitle ?? 'Sous-menu choix unique',
          multiple_choice: sm.testMultiTitle  ?? 'Sous-menu choix multiples',
        };
        const descs = {
          informative:     sm.testInfoDesc   ?? 'Navigation seule.',
          single_choice:   sm.testSingleDesc ?? 'Sélectionne et ferme.',
          multiple_choice: sm.testMultiDesc  ?? 'Cochez entre 1 et 3 options.',
        };

        activeMenu = new SubMenu({
          container: root,
          announce,
          strings,
          mode,
          min: mode === 'multiple_choice' ? 1 : 0,
          max: mode === 'multiple_choice' ? 3 : Infinity,
          items: testItems,
          title: titles[mode],
          ariaLabel: titles[mode],
          interfaceName: titles[mode],
          interfaceDescription: descs[mode],
          closeLabel: sm.close ?? 'Fermer',
          onClose: () => mountMainMenu(),
          onConfirm: (result) => {
            const label = Array.isArray(result)
              ? result.map((r) => r.item.label).join(', ')
              : result.label;
            console.log('[mainMenu] sous-menu confirmé :', label);
            announce.polite(`${sm.testDone ?? 'Confirmé :'} ${label}`);
          },
        });
        activeMenu.mount();
      }
    },

    unmount() {
      if (activeMenu) {
        activeMenu.unmount();
        activeMenu = null;
      }
    },
  };
}
