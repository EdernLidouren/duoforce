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
    history: 'Historique',
    noMessages: 'Aucun message.',
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
      display: '{value} sur {max} points de vie adverses.',
      help: 'Faites tomber les points de vie adverses pour remporter ce combat.',
    },
    attack: {
      name: 'Attaque',
      display: '{value} attaque',
      help: 'À la fin du tour, après activation des pouvoirs, réduit les points de vie adverses par cette valeur.',
    },
    enemyAttack: {
      name: 'Attaque',
      display: '{value} attaque adverse',
      help: 'À la fin du tour, après l’attaque de votre duo, réduit vos points de vie par cette valeur.',
    },
    defense: {
      name: 'Défense',
      display: '{value} défense',
      help: 'Lorsque votre duo doit subir des dégâts, c’est cette valeur qui est réduite en priorité.',
    },
    enemyDefense: {
      name: 'Défense',
      display: '{value} défense adverse',
      help: 'Lorsque l’adversaire doit subir des dégâts, c’est cette valeur qui est réduite en priorité.',
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
    enemy_attack: 'attaque adverse',
    enemy_defense: 'défense adverse',
    hp: 'points de vie',
    enemy_hp: 'points de vie adverses',
    credit: 'crédit',
    maneuver: 'manœuvres',
    strategy: 'stratégie',
  },

  // Messages de combat (fin de tour), envoyés un par un à l'annonceur.
  log: {
    inactive: '{name} est inactif.',
    effects: '{name} : {effects}.',
    discardOne: '{actor} défausse {target}{direction}.',
    exileOne: '{actor} exile {target}{direction}.',
    draw: '{actor} pioche {value}.',
    enemyHit: '{enemy} subit {damage}.',
    enemyDefeated: '{enemy} est vaincu.',
    duoHit: 'Votre duo subit {damage}.',
    turnStart: 'Début du tour {turn}.',
    listSeparator: ', ',
    listLast: ' et ',
    directions: {
      above: 'au-dessus',
      below: 'en-dessous',
      left: 'à gauche',
      right: 'à droite',
      self: 'lui-même',
      none: '',
    },
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
    helmbutt_power: {
      name: 'Coup de casque',
      description: '+2 attaque.',
    },
    iron_grip_power: {
      name: 'Poigne de fer',
      description: 'Les pouvoirs offensifs voisins infligent +2 dégâts.',
    },
    shield_charge_power: {
      name: 'Charge au bouclier',
      description: '+1 attaque, +1 défense.',
    },
    metalloy_power: {
      name: 'Métalliage',
      description: '+2 défense.',
    },
    heavy_slam_power: {
      name: 'Plaquage lourd',
      description: '+4 attaque, épuise le pouvoir en dessous pendant un tour.',
    },
    force_palm_power: {
      name: 'Paume de force',
      description: '+3 attaque près d’un pouvoir offensif sur la même ligne, +1 attaque sinon.',
    },
    close_protection_power: {
      name: 'Protection rapprochée',
      description: '+1 défense, et +1 crédit par pouvoir de soutien sur la même ligne.',
    },
    impregnable_power: {
      name: 'Imprenable',
      description: '+3 défense si la défense est nulle, +1 défense sinon.',
    },
    lead_boots_power: {
      name: 'Bottes de plomb',
      description: '+2 défense et +1 attaque dans la rangée du bas, aucun effet sinon.',
    },
    iron_will_power: {
      name: 'Volonté de fer',
      description: '+1 défense. Immunisé contre l’épuisement.',
    },
  },

  // Nom + description de chaque statut (indexés par id). {compteur} = stacks
  // courants, interpolé à l'affichage (voir src/ui/format.js).
  statuses: {
    power_exhaustion_status: {
      name: 'épuisement',
      description: 'Empêche l’activation de tout effet.',
    },
    hero_poison_status: {
      name: 'poison',
      description: 'À la fin du tour, inflige {compteur} dégâts imblocables puis réduit de 1.',
    },
    area_freeze_status: {
      name: 'gel',
      description: 'Annule les effets des pouvoirs offensifs ou de soutien placés ici.',
    },
  },

  // Noms des héros (indexés par nameId).
  heroes: {
    hero_paladium: 'Paladium',
  },

  // Noms des signatures (perks), indexés par id.
  perks: {
    rusted_armor_perk: 'Armure rouillée',
    blue_comet_mark_perk: 'marque de la comète bleue',
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
