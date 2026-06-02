// data/languagepacks/fr/index.js — Pack de langue : français.
//
// Structure commune à tous les packs (voir ../en/index.js pour l'équivalent).
// Les clés regroupent les chaînes par scène + une section `a11y` dédiée aux
// messages d'annonce (régions ARIA live). Garder les clés synchronisées entre
// langues.

export default {
  menu: {
    title: 'Duoforce',
    welcome: 'Menu principal. Appuyez sur Entrée pour commencer une partie.',
    start: 'Nouvelle partie',
  },
  game: {
    start: 'La partie commence.',
    yourTurn: 'À vous de jouer.',
  },
  gameover: {
    title: 'Partie terminée.',
    win: 'Victoire.',
    lose: 'Défaite.',
    draw: 'Match nul.',
    backToMenu: 'Retour au menu',
  },
  a11y: {
    // Messages destinés aux régions live (à compléter).
    invalidMove: 'Coup invalide.',
  },
};
