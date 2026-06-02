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

import { createMainMenuScene } from './src/scenes/mainMenu.js';
import { createGameScene } from './src/scenes/game.js';
import { createGameOverScene } from './src/scenes/gameover.js';

async function bootstrap() {
  const root = document.getElementById('app');
  const announce = createAnnouncer({
    status: document.getElementById('aria-status'),
    alert: document.getElementById('aria-alert'),
  });

  // Pack de langue (chaînes UI + messages d'annonce a11y).
  const strings = await loadLanguagePack(DEFAULT_LANG);

  // Contexte partagé passé à mount() de chaque scène.
  // Les scènes l'utilisent pour : rendre dans `root`, annoncer via `announce`,
  // lire les libellés via `strings`, et naviguer via `router.go(name)`.
  const context = { root, announce, strings, router: null };

  const router = createRouter(context);
  context.router = router; // permet aux scènes d'appeler context.router.go(...)

  // Enregistrement des scènes (clé → objet { mount, unmount }).
  router.register('menu', createMainMenuScene());
  router.register('game', createGameScene());
  router.register('gameover', createGameOverScene());

  // Navigation initiale.
  router.go('menu');
}

bootstrap();
