// src/scenes/victory.js — Scène de victoire de combat.
//
// Affichée après chaque combat gagné, avant le retour au hub.
// Contenu actuel : message de victoire, PV restants, crédit gagné, « Continuer ».
//
// Conçue pour accueillir plus tard un choix de récompense (carte, gadget, atout)
// entre le résumé et « Continuer » — il suffit d'insérer les items ici.
//
// Entrée : context.run (PV courants déjà mis à jour) + context.lastVictory.creditsEarned.
// Sortie : advancePhase(run) puis router.go('run-hub') ou router.go('run-won').

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { advancePhase, isRunWon } from '../engine/run.js';
import { format } from '../ui/format.js';

export function createVictoryScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const v   = ctx.strings?.victory ?? {};
      const run = ctx.run;
      const { creditsEarned = 0 } = ctx.lastVictory ?? {};

      const items = [
        {
          id: 'message',
          label: v.message ?? 'Mission accomplie.',
        },
        {
          id: 'hp',
          label: format(v.hpRemaining ?? '{hp} sur {maxHp} PV restants.', { hp: run.hp, maxHp: run.maxHp }),
        },
      ];

      if (creditsEarned > 0) {
        items.push({
          id: 'credits',
          label: format(v.creditsEarned ?? '{credits} crédit(s) gagné(s).', { credits: creditsEarned }),
        });
      }

      // Emplacement futur : items de récompense (cartes, gadgets, atouts).

      items.push({
        id: 'continue',
        label: v.continue ?? 'Continuer.',
      });

      activeMenu = new LinearMenu({
        container:     ctx.root,
        announce:      ctx.announce,
        orientation:   'vertical',
        title:         v.title   ?? 'Mission accomplie',
        ariaLabel:     v.title   ?? 'Mission accomplie',
        interfaceName: v.title   ?? 'Mission accomplie',
        items,
        onConfirm: (item) => {
          if (item.id !== 'continue') return;
          advancePhase(run);
          ctx.lastVictory = null;
          if (isRunWon(run)) {
            ctx.router.go('run-won');
          } else {
            ctx.router.go('run-hub');
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
