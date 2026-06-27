// src/scenes/runWon.js — Placeholder de fin de run victorieuse.
//
// Affiché quand la run est gagnée (boss du jour 10 vaincu).
// Contenu minimal : message de félicitations + méta-points gagnés + retour au menu.
// Cette scène accueillera plus tard un écran de fin de run complet.
//
// endRun() est appelé au montage : lit la progression, calcule le rapport,
// incrémente wins + runsCompleted, ajoute les méta-points et sauvegarde.

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { endRun }     from '../engine/endRun.js';
import { format }     from '../ui/format.js';

export function createRunWonScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const w = ctx.strings?.runWon    ?? {};
      const r = ctx.strings?.runResult ?? {};

      // endRun lit la progression, calcule le rapport, l'applique et retourne le rapport.
      const result = endRun(ctx.profile, 'victory');

      const items = [
        { id: 'message', label: w.message ?? 'Félicitations ! Vous avez vaincu le boss final.' },
        {
          id:    'metaPoints',
          label: format(r.metaPointsEarned ?? 'Méta-points gagnés : {points}.', {
            points: result.metaPoints,
          }),
        },
        // Emplacement futur : statistiques de fin de run, méta-monnaie totale, etc.
        { id: 'backMenu', label: w.backToMenu ?? 'Retour au menu principal.' },
      ];

      activeMenu = new LinearMenu({
        container:     ctx.root,
        announce:      ctx.announce,
        orientation:   'vertical',
        title:         w.title   ?? 'Partie gagnée',
        ariaLabel:     w.title   ?? 'Partie gagnée',
        interfaceName: w.title   ?? 'Partie gagnée',
        items,
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
