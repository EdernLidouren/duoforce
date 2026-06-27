// src/scenes/gameover.js — Scène de défaite (game over négatif).
//
// Affichée quand les PV du duo tombent à 0 pendant un combat.
//
// Ordre critique :
//   1. Lire context.run AVANT d'appeler endRun (endRun met run à null).
//   2. Appeler endRun(profile, 'defeat') → incrémente losses + runsCompleted, sauvegarde.
//   3. Construire l'UI avec les données de progression capturées.
//
// Conçue pour accueillir plus tard un récapitulatif complet de run (statistiques,
// méta-monnaie gagnée…) sans refonte : il suffit d'ajouter des items à la liste.

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { endRun }     from '../engine/endRun.js';
import { format }     from '../ui/format.js';

export function createGameOverScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const g = ctx.strings?.gameover ?? {};

      // Capturer la progression AVANT d'appeler endRun (qui met run à null).
      const run   = ctx.run;
      const round = run?.progression?.round ?? null;

      // Terminer la run : run → null, losses++, runsCompleted++, sauvegarde.
      endRun(ctx.profile, 'defeat');

      // Annonce assertive : NVDA lit immédiatement, sans attendre la navigation.
      ctx.announce.assertive(g.title ?? 'Défaite.');

      const items = [
        { id: 'message', label: g.defeat ?? 'Votre duo a été vaincu.' },
      ];

      if (round !== null) {
        items.push({
          id: 'summary',
          label: format(g.summary ?? 'Atteint : jour {round}.', { round }),
        });
      }

      // Emplacement futur : récapitulatif détaillé, méta-monnaie, etc.

      items.push({ id: 'backMenu', label: g.backToMenu ?? 'Retour au menu principal.' });

      activeMenu = new LinearMenu({
        container:     ctx.root,
        announce:      ctx.announce,
        orientation:   'vertical',
        title:         g.title   ?? 'Défaite',
        ariaLabel:     g.title   ?? 'Défaite',
        interfaceName: g.title   ?? 'Défaite',
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
