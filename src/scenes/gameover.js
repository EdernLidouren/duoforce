// src/scenes/gameover.js — Scène de défaite (game over négatif).
//
// Affichée quand les PV du duo tombent à 0 pendant un combat.
//
// endRun() lit la progression de la run, calcule le rapport, l'applique au profil,
// met profile.run à null et retourne le rapport — la scène ne lit jamais
// directement ctx.run, qui peut déjà être null à l'entrée en raison de ce flux.
//
// Conçue pour accueillir plus tard un écran de score détaillé : le rapport
// contient tous les termes nécessaires (outcome, day, mission, base, metaPoints).

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { endRun }     from '../engine/endRun.js';
import { format }     from '../ui/format.js';

export function createGameOverScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const g = ctx.strings?.gameover    ?? {};
      const r = ctx.strings?.runResult   ?? {};

      // endRun lit la progression avant de mettre run à null, calcule et retourne le rapport.
      const result = endRun(ctx.profile, 'defeat');

      // Annonce assertive : NVDA lit immédiatement, sans attendre la navigation.
      ctx.announce.assertive(g.title ?? 'Défaite.');

      const items = [
        { id: 'message', label: g.defeat ?? 'Votre duo a été vaincu.' },
        {
          id:    'summary',
          label: format(g.summary ?? 'Atteint : jour {day}, mission {mission}.', {
            day:     result.day,
            mission: result.mission,
          }),
        },
        {
          id:    'metaPoints',
          label: format(r.metaPointsEarned ?? 'Méta-points gagnés : {points}.', {
            points: result.metaPoints,
          }),
        },
      ];

      // Emplacement futur : récapitulatif détaillé, méta-monnaie totale, etc.

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
