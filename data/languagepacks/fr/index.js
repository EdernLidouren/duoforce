// data/languagepacks/fr/index.js — Pack de langue : français.
//
// Structure commune à tous les packs (voir ../en/index.js pour l'équivalent).
// Les clés regroupent les chaînes par scène + une section `a11y` dédiée aux
// messages d'annonce (régions ARIA live). Garder les clés synchronisées entre
// langues.

export default {
  menu: {
    title: 'Duoforce',
    label: 'Menu principal',
    welcome: 'Menu principal. Appuyez sur Entrée pour commencer une partie.',
    start: 'Nouvelle partie',
    options: 'Options',
    quit: 'Quitter',
    combatTest: 'Combat test',
  },
  combat: {
    title: 'Combat test',
    turn: 'Tour',
    enemy: 'Ennemi',
    duo: 'Duo',
    board: 'Plateau',
    actions: 'Actions',
    instructions: 'Tabulation pour changer de zone, flèches pour naviguer.',
    hp: 'Points de vie',
    attack: 'Attaque',
    defense: 'Défense',
    maneuvers: 'Manœuvres',
    strategies: 'Stratégies',
    credit: 'Crédit',
    deck: 'Pioche',
    discard: 'Défausse',
    exile: 'Exil',
    empty: 'vide',
    endTurn: 'Fin de tour',
    backToMenu: 'Retour au menu',
    victory: 'Victoire !',
    defeat: 'Défaite.',
    sky: 'Ciel',
    surface: 'Surface',
    ground: 'Terre',
    left: 'Gauche',
    center: 'Centre',
    right: 'Droite',
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
