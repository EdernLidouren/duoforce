// src/scenes/mainMenu.js — Scène « menu principal ».
//
// Affiche le titre du jeu et une liste verticale de choix :
//   [Continuer · Abandonner si profile.run présente] · Nouvelle partie ·
//   Partie test · Options · Quitter  (+ entrées debug si activé).
//
// Détection de sauvegarde : profile.run !== null (profil chargé au bootstrap).

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { createRun } from '../engine/run.js';
import { getHeroById } from '../data/heroes/index.js';
import { saveProfileToLocal } from '../engine/persistence.js';
import { openConfirm } from './confirm.js';
import { debug } from '../config/debug.js';

/** Identifiants stables des choix (découplés des libellés traduits). */
export const MainMenuChoice = Object.freeze({
  NEW_GAME:     'new-game',
  CONTINUE:     'continue',
  ABANDON:      'abandon',
  SAVE_MANAGER: 'save-manager',
  TEST_RUN:     'test-run',
  OPTIONS:      'options',
  QUIT:         'quit',
  COMBAT_TEST:  'combat-test',
  CONFIRM_TEST: 'confirm-test',
});

/**
 * Fabrique de scène pour le routeur.
 * @returns {{ mount: Function, unmount: Function }}
 */
export function createMainMenuScene() {
  let activeMenu = null;

  return {
    mount(context) {
      const { root, announce, strings } = context;
      mountMainMenu();

      function mountMainMenu() {
        if (activeMenu) { activeMenu.unmount(); activeMenu = null; }

        const hasRun = context.profile?.run != null;
        const m  = strings?.menu ?? {};

        const items = [];

        if (hasRun) {
          items.push({ id: MainMenuChoice.CONTINUE, label: m.continue ?? 'Continuer la partie' });
          items.push({ id: MainMenuChoice.ABANDON,  label: m.abandon  ?? 'Abandonner la partie' });
        } else {
          items.push({ id: MainMenuChoice.NEW_GAME, label: m.start ?? 'Nouvelle partie' });
        }

        items.push({ id: MainMenuChoice.SAVE_MANAGER, label: m.saveManager ?? 'Gestion de la sauvegarde' });
        items.push({ id: MainMenuChoice.TEST_RUN,    label: m.testRun     ?? 'Partie test' });
        items.push({ id: MainMenuChoice.OPTIONS,  label: m.options  ?? 'Options' });
        items.push({ id: MainMenuChoice.QUIT,     label: m.quit     ?? 'Quitter' });

        if (debug?.enabled && debug?.showTestCombat) {
          items.push({ id: MainMenuChoice.COMBAT_TEST,  label: m.combatTest  ?? 'Combat test' });
          items.push({ id: MainMenuChoice.CONFIRM_TEST, label: m.confirmTest ?? 'Test confirmation' });
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
          // La run est déjà dans context.profile.run (chargée au bootstrap).
          if (!context.run) { mountMainMenu(); return; }
          context.router.go('run-hub');
          return;
        }

        if (id === MainMenuChoice.ABANDON) {
          openConfirm(context, {
            title:         strings?.confirm?.title ?? 'Confirmation',
            question:      strings?.menu?.abandonQuestion ?? 'Votre run en cours sera définitivement perdue. Abandonner ?',
            defaultChoice: 'no',
            onConfirm: () => {
              context.run = null;
              context.profile.stats.abandons++;
              saveProfileToLocal(context.profile);
              context.router.go('menu');
            },
            onCancel: () => context.router.go('menu'),
          });
          return;
        }

        if (id === MainMenuChoice.SAVE_MANAGER) {
          context.router.go('save-manager');
          return;
        }

        if (id === MainMenuChoice.OPTIONS) {
          context.router.go('options');
          return;
        }

        if (id === MainMenuChoice.TEST_RUN) {
          const h1 = getHeroById('hero_paladium');
          const h2 = getHeroById('hero_mindel');
          context.run = createRun({ heroes: [h1, h2] });
          context.profile.stats.runsStarted++;
          if (debug.enabled) {
            // PV intentionnellement entamés : permet de vérifier que le combat
            // part bien de run.hp et non d'un maximum recalculé.
            context.run.hp = Math.max(1, context.run.hp - 7);
          }
          context.router.go('run-hub');
          return;
        }

        if (id === MainMenuChoice.COMBAT_TEST) {
          context.router.go('combat');
          return;
        }

        if (id === MainMenuChoice.CONFIRM_TEST) {
          const c = strings?.confirm ?? {};
          openConfirm(context, {
            title:         c.testTitle    ?? 'Test de confirmation',
            question:      c.testQuestion ?? 'Ceci est une fausse question de test. Confirmez-vous ?',
            defaultChoice: 'no',
            onConfirm: () => {
              console.log('[confirmTest] → Oui');
              context.router.go('menu');
            },
            onCancel: () => {
              console.log('[confirmTest] → Non / Échap');
              context.router.go('menu');
            },
          });
          return;
        }

        // Quitter : stub (pas de window.close() fiable en contexte browser).
        console.log('[mainMenu] choix non géré :', id);
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
