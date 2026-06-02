// src/scenes/gameover.js — Scène « fin de partie ».
//
// Affiche le résultat (gagnant / nul), l'annonce de façon assertive, et propose
// de revenir au menu (context.router.go('menu')).
//
// Contrainte : présentation + navigation uniquement ; le résultat est calculé
// par engine et transmis à la scène (ici via context, à brancher plus tard).

import { attachInput, Intent } from '../ui/input.js';

export function createGameOverScene() {
  let detachInput = null;

  function mount(context) {
    const { root, announce, strings, router } = context;

    // TODO: afficher le résultat (à passer via context lors de la navigation).
    root.replaceChildren();
    root.focus();
    announce.assertive(strings?.gameover?.title ?? '');

    detachInput = attachInput(root, (intent) => {
      if (intent === Intent.CONFIRM || intent === Intent.CANCEL) {
        router.go('menu');
      }
    });
  }

  function unmount() {
    if (detachInput) {
      detachInput();
      detachInput = null;
    }
  }

  return { mount, unmount };
}
