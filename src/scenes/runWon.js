// src/scenes/runWon.js — Placeholder de fin de run victorieuse.
//
// Affiché quand la run est gagnée (boss du jour 10 vaincu).
// Contenu minimal : message de félicitations + retour au menu.
// Cette scène accueillera plus tard un écran de fin de run complet.
//
// endRun est appelé au montage (avant que la run ne soit nécessaire pour
// un quelconque affichage) pour mettre à jour wins + runsCompleted et sauvegarder.

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { endRun }     from '../engine/endRun.js';

export function createRunWonScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const w = ctx.strings?.runWon ?? {};

      // Terminer la run : run → null, wins++, runsCompleted++, sauvegarde.
      endRun(ctx.profile, 'victory');

      activeMenu = new LinearMenu({
        container:     ctx.root,
        announce:      ctx.announce,
        orientation:   'vertical',
        title:         w.title   ?? 'Partie gagnée',
        ariaLabel:     w.title   ?? 'Partie gagnée',
        interfaceName: w.title   ?? 'Partie gagnée',
        items: [
          { id: 'message',  label: w.message    ?? 'Félicitations ! Vous avez vaincu le boss final.' },
          { id: 'backMenu', label: w.backToMenu  ?? 'Retour au menu principal.' },
        ],
        onConfirm: (item) => {
          if (item.id === 'backMenu') ctx.router.go('menu');
        },
      });
      activeMenu.mount();
    },

    unmount() {
      if (activeMenu) { activeMenu.unmount(); activeMenu = null; }
    },
  };
}
