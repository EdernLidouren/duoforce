// src/scenes/game.js — Scène « partie en cours ».
//
// Orchestre la boucle de jeu côté UI :
//   - détient l'état courant (engine), le rend (ui/render), réagit aux inputs
//     (ui/input) en appelant l'engine, annonce les changements (ui/announce),
//   - bascule vers 'gameover' quand la partie se termine.
//
// Contrainte : la scène COORDONNE mais ne contient pas les règles ; elle délègue
// à src/engine/*. Tout effet DOM/annonce vit ici ou dans ui/*, jamais dans engine.

import { createInitialState } from '../engine/state.js';
import { applyMove, nextTurn } from '../engine/turn.js';
import { renderGame, updateGame } from '../ui/render.js';
import { attachInput, Intent } from '../ui/input.js';

export function createGameScene() {
  let state = null;
  let detachInput = null;
  let ctx = null;

  function mount(context) {
    ctx = context;
    const { root, announce, strings } = context;

    state = createInitialState();
    renderGame(root, state, strings);
    root.focus();
    announce.polite(strings?.game?.start ?? '');

    detachInput = attachInput(root, handleIntent);
  }

  function handleIntent(intent /*, event */) {
    // TODO: traduire l'intention en coup, appliquer via engine, re-rendre,
    //       annoncer le résultat, puis vérifier la fin de partie.
    if (intent === Intent.CANCEL) {
      ctx.router.go('menu');
    }
  }

  function unmount() {
    if (detachInput) {
      detachInput();
      detachInput = null;
    }
    state = null;
    ctx = null;
  }

  // Référencés pour la future boucle ; évite les avertissements d'import inutilisé.
  void applyMove;
  void nextTurn;
  void updateGame;

  return { mount, unmount };
}
