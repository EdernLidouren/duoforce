// src/scenes/runWon.js — Placeholder de fin de run victorieuse.
//
// Affiché quand la run est gagnée (boss du jour 10 vaincu).
// Contenu minimal : message de félicitations + retour au menu.
// Cette scène accueillera plus tard un écran de fin de run complet.

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { saveProfileToLocal } from '../engine/persistence.js';

export function createRunWonScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const w = ctx.strings?.runWon ?? {};

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
          if (item.id === 'backMenu') {
            ctx.run = null;
            ctx.profile.stats.wins++;
            saveProfileToLocal(ctx.profile);
            ctx.router.go('menu');
          }
        },
      });
      activeMenu.mount();
    },

    unmount() {
      if (activeMenu) { activeMenu.unmount(); activeMenu = null; }
    },
  };
}
