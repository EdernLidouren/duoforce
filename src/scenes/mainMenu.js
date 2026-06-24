// src/scenes/mainMenu.js — Scène « menu principal ».
//
// Affiche le titre du jeu et une liste verticale de choix :
//   Nouvelle partie · [Continuer · Abandonner si save valide] · Partie test ·
//   Options · Quitter  (+ entrées debug si activé).
//
// Détection de sauvegarde : au montage, si localStorage contient un save dont
// saveFormatVersion correspond à la version courante, les entrées Continuer et
// Abandonner s'ajoutent sous Nouvelle partie.

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { deserialize, createRun } from '../engine/run.js';
import { getHeroById } from '../data/heroes/index.js';
import { SAVE_FORMAT_VERSION } from '../config/version.js';

const SAVE_KEY = 'duoforce_save';

/** Identifiants stables des choix (découplés des libellés traduits). */
export const MainMenuChoice = Object.freeze({
  NEW_GAME:    'new-game',
  CONTINUE:    'continue',
  ABANDON:     'abandon',
  TEST_RUN:    'test-run',
  OPTIONS:     'options',
  QUIT:        'quit',
  COMBAT_TEST: 'combat-test',
});

/**
 * Lit et valide la sauvegarde locale.
 * Retourne l'objet save si valide, null sinon.
 */
function loadValidSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (save.saveFormatVersion !== SAVE_FORMAT_VERSION) return null;
    return save;
  } catch {
    return null;
  }
}

/**
 * Fabrique de scène pour le routeur.
 * @returns {{ mount: Function, unmount: Function }}
 */
export function createMainMenuScene() {
  let activeMenu = null;

  return {
    mount(context) {
      const { root, announce, strings, debug } = context;
      mountMainMenu();

      function mountMainMenu() {
        if (activeMenu) { activeMenu.unmount(); activeMenu = null; }

        const save = loadValidSave();
        const m  = strings?.menu ?? {};

        const items = [];

        if (save) {
          items.push({ id: MainMenuChoice.CONTINUE, label: m.continue ?? 'Continuer la partie' });
          items.push({ id: MainMenuChoice.ABANDON,  label: m.abandon  ?? 'Abandonner la partie' });
        } else {
          items.push({ id: MainMenuChoice.NEW_GAME, label: m.start ?? 'Nouvelle partie' });
        }

        items.push({ id: MainMenuChoice.TEST_RUN, label: m.testRun ?? 'Partie test' });
        items.push({ id: MainMenuChoice.OPTIONS,  label: m.options  ?? 'Options' });
        items.push({ id: MainMenuChoice.QUIT,     label: m.quit     ?? 'Quitter' });

        if (debug?.enabled && debug?.showTestCombat) {
          items.push({ id: MainMenuChoice.COMBAT_TEST, label: m.combatTest ?? 'Combat test' });
        }

        activeMenu = new LinearMenu({
          container: root,
          announce,
          orientation: 'vertical',
          title:         m.title ?? 'Duoforce',
          ariaLabel:     m.label ?? 'Menu principal',
          interfaceName: m.title ?? 'Duoforce',
          interfaceDescription: m.label ?? 'Menu principal',
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

        if (id === MainMenuChoice.CONTINUE) {
          const save = loadValidSave();
          if (!save) { mountMainMenu(); return; }
          context.run = deserialize(save);
          context.router.go('run-hub');
          return;
        }

        if (id === MainMenuChoice.ABANDON) {
          localStorage.removeItem(SAVE_KEY);
          mountMainMenu();
          return;
        }

        if (id === MainMenuChoice.TEST_RUN) {
          const h1 = getHeroById('hero_paladium');
          const h2 = getHeroById('hero_mindel');
          context.run = createRun({ heroes: [h1, h2] });
          context.router.go('run-hub');
          return;
        }

        if (id === MainMenuChoice.COMBAT_TEST) {
          context.router.go('combat');
          return;
        }

        // Options, Quitter : stubs.
        console.log('[mainMenu] choix sélectionné :', id);
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
