// main.js — Bootstrap de l'application.
//
// Responsabilités :
//   - Récupérer les éléments DOM racine (conteneur de scènes + régions ARIA live).
//   - Construire le « contexte » partagé injecté dans chaque scène.
//   - Instancier le routeur de scènes (src/router.js), enregistrer les scènes,
//     puis naviguer vers la scène initiale.
//   - Charger le pack de langue par défaut.
//
// main.js ne contient AUCUNE règle de jeu et ne manipule pas le DOM des scènes :
//   - la logique de jeu vit dans src/engine/*
//   - le rendu DOM vit dans src/ui/* et dans chaque scène
//   - la mécanique de navigation vit dans src/router.js

import { createRouter } from './src/router.js';
import { createAnnouncer } from './src/ui/announce.js';
import { loadLanguagePack, DEFAULT_LANG } from './data/languagepacks/index.js';
import { createProfile } from './src/engine/profile.js';
import { loadProfileFromLocal } from './src/engine/persistence.js';

import { createMainMenuScene } from './src/scenes/mainMenu.js';
import { createNewGameScene }  from './src/scenes/newGame.js';
import { createRunHubScene }   from './src/scenes/runHub.js';
import { createVictoryScene }  from './src/scenes/victory.js';
import { createRunWonScene }   from './src/scenes/runWon.js';
import { createConfirmScene }     from './src/scenes/confirm.js';
import { createSaveManagerScene } from './src/scenes/saveManager.js';
import { createOptionsScene }     from './src/scenes/options.js';
import { applyPreferences }       from './src/ui/applyPreferences.js';
import { createGameScene } from './src/scenes/game.js';
import { createGameOverScene } from './src/scenes/gameover.js';
import { createCombatScene } from './src/scenes/combat.js';
import { debug } from './src/config/debug.js';
import { runGadgetTest } from './src/debug/gadgetTest.js';

async function bootstrap() {
  const root = document.getElementById('app');
  const announce = createAnnouncer({
    status: document.getElementById('aria-status'),
    alert: document.getElementById('aria-alert'),
  });

  // Pack de langue (chaînes UI + messages d'annonce a11y).
  const strings = await loadLanguagePack(DEFAULT_LANG);

  // Profil actif : chargé depuis localStorage si présent, sinon neuf.
  const profile = loadProfileFromLocal() ?? createProfile();
  // Appliquer les préférences sauvegardées aux systèmes UI dès le démarrage.
  applyPreferences(profile.preferences);

  // Contexte partagé passé à mount() de chaque scène.
  // Les scènes l'utilisent pour : rendre dans `root`, annoncer via `announce`,
  // lire les libellés via `strings`, et naviguer via `router.go(name)`.
  // `context.run` est un alias transparent de `context.profile.run` :
  // toute écriture sur context.run se répercute dans profile.run, et vice-versa.
  const context = { root, announce, strings, debug, router: null, profile, lastVictory: null, pendingConfirm: null };
  Object.defineProperty(context, 'run', {
    get()  { return this.profile.run; },
    set(v) { this.profile.run = v; },
    enumerable:   true,
    configurable: true,
  });

  const router = createRouter(context);
  context.router = router; // permet aux scènes d'appeler context.router.go(...)

  // Enregistrement des scènes (clé → objet { mount, unmount }).
  router.register('menu',     createMainMenuScene());
  router.register('new-game', createNewGameScene());
  router.register('run-hub',  createRunHubScene());
  router.register('victory',  createVictoryScene());
  router.register('run-won',  createRunWonScene());
  router.register('game',     createGameScene());
  router.register('gameover', createGameOverScene());
  router.register('combat',   createCombatScene());
  router.register('confirm',      createConfirmScene());
  router.register('save-manager', createSaveManagerScene());
  router.register('options',      createOptionsScene());

  // Tests de debug (gadget system).
  if (debug.enabled) runGadgetTest();

  // Navigation initiale.
  router.go('menu');
}

bootstrap();
