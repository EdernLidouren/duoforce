// data/languagepacks/fr/index.js — Pack de langue : français.
//
// Structure commune à tous les packs (voir ../en/index.js pour l'équivalent).
// Conventions de localisation :
//   - Pour chaque ressource, on distingue trois chaînes : `name` (nom court,
//     ex. libellé de zone), `display` (gabarit d'annonce de la valeur courante)
//     et `help` (phrase d'aide). Cela facilite la traduction et la réutilisation.
//   - Les gabarits contiennent des marqueurs `{clef}` interpolés à l'exécution
//     (voir src/ui/format.js) : textes dynamiques.
// Garder les clés synchronisées entre langues.

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
    attack: 'Attaque',
    defense: 'Défense',
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
    // Type de combat (interpolé dans turnAnnounce).
    combatType: {
      normal: 'combat',
      boss: 'combat de boss',
    },
    turnAnnounce: 'Tour {turn}, {combatType} contre {enemy}.',
  },

  // Ressources : nom / message d'affichage / message d'aide, distincts.
  resources: {
    hp: {
      name: 'Points de vie',
      display: '{value} sur {max} points de vie.',
      help: 'Si les points de vie de votre duo tombent à 0, vous perdez la partie.',
    },
    enemyHp: {
      name: 'Points de vie',
      display: '{value} sur {max} points de vie.',
      help: 'Faites tomber les points de vie adverses pour remporter ce combat.',
    },
    maneuver: {
      name: 'Manœuvres',
      display: '{value} manœuvres.',
      help: 'Dépensez une manœuvre pour intervertir la position de deux pouvoirs adjacents.',
    },
    strategy: {
      name: 'Stratégies',
      display: '{value} stratégies.',
      help: 'Dépensez une stratégie pour défausser un pouvoir et le remplacer en choisissant parmi les {strategy_pick} premiers pouvoirs de la pioche.',
    },
    credit: {
      name: 'Crédit',
      display: '{value} crédit.',
      help: 'Le crédit représente la monnaie du jeu.',
    },
  },

  // Gabarits de description des pouvoirs (interpolés).
  power: {
    short: '{name}, {type}, {rarity}',
    long: '{name}, {type}, {rarity} : {description}',
  },

  // Messages de combat (fin de tour). Gabarit + libellés par statistique.
  // {change} vaut p.ex. « +2 » ou « -1 » ; {label} est un libellé ci-dessous.
  effectMessageFormat: '{change} {label}',
  effectLabels: {
    attack: 'attaque',
    defense: 'défense',
    enemy_attack: 'attaque ennemie',
    enemy_defense: 'défense ennemie',
    hp: 'points de vie',
    credit: 'crédit',
    maneuver: 'manœuvres',
    strategy: 'stratégies',
  },

  // Libellés des types de pouvoir.
  powerTypes: {
    offensive: 'offensif',
    support: 'soutien',
    special: 'spécial',
  },

  // Libellés des raretés (indexés par l'entier Rarity).
  rarities: {
    0: 'commun',
    1: 'peu commun',
    2: 'rare',
    3: 'épique',
    4: 'légendaire',
  },

  // Nom + description de chaque pouvoir (indexés par id).
  powers: {
    power_aerial_strike: {
      name: 'Frappe aérienne',
      description: '+4 attaque dans le ciel, -1 attaque en terre, +2 attaque sinon.',
    },
    power_shield: {
      name: 'Bouclier',
      description: '+3 défense à gauche, -1 défense à droite, +1 défense sinon.',
    },
    power_phalanx: {
      name: 'Phalange',
      description: '+3 défense près d’un soutien, ×2 défense dans la colonne centrale, +1 défense sinon.',
    },
    power_vanguard: {
      name: 'Avant-garde',
      description: '+5 attaque à côté d’un bouclier, ×2 attaque dans les coins, +2 attaque sinon.',
    },
    power_disrupt: {
      name: 'Perturbation',
      description: '',
    },
    power_curse: {
      name: 'Malédiction',
      description: '',
    },
    power_medic: {
      name: 'Médic',
      description: '+3 points de vie près d’un soutien, +1 manœuvre en terre, +1 stratégie sinon.',
    },
    power_tactician: {
      name: 'Tacticien',
      description: '+1 crédit sur la case centrale.',
    },
    power_sabotage: {
      name: 'Sabotage',
      description: '',
    },
  },

  // Noms des ennemis (indexés par nameId).
  enemies: {
    enemy_dummy: 'Mannequin d’entraînement',
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
