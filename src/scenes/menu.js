// src/scenes/menu.js — Scène « menu principal ».
//
// Une scène = un objet { mount(context), unmount() } enregistré dans le routeur.
//   - mount(context)  : construit le DOM de la scène dans context.root, branche
//                       les inputs, place le focus, annonce l'arrivée.
//   - unmount()       : débranche les écouteurs et nettoie le DOM.
//
// Le menu propose de démarrer une partie → context.router.go('game').
// Contrainte : pas de règle de jeu ici ; uniquement présentation + navigation.

import { attachInput, Intent } from '../ui/input.js';

export function createMenuScene() {
  let detachInput = null;

  function mount(context) {
    const { root, announce, strings, router } = context;

    // TODO: construire le DOM du menu (titre, bouton « Nouvelle partie »…).
    root.replaceChildren();
    root.focus();

    announce.polite(strings?.menu?.welcome ?? '');

    detachInput = attachInput(root, (intent) => {
      if (intent === Intent.CONFIRM) {
        router.go('game');
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
