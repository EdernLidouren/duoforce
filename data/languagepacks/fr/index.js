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
    noSignature: 'Aucune signature.',
    and: 'et',
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

  // Gabarit de description longue d'une signature (perk).
  perk: {
    long: '{name} : {description}',
  },

  // Préférences utilisateur (nom + description), indexées par le nom de l'option.
  preferences: {
    menuCycling: {
      name: 'Cyclage des menus',
      description: 'Au bord d’un menu, presser la direction renvoie le curseur à l’autre extrémité au lieu de rester bloqué.',
    },
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
      description: 'Attaque +2',
    },
    iron_grip_power: {
      name: 'Poigne de fer',
      description: 'Les pouvoirs adjacents de type offensif infligent +2 dégâts.',
    },
    shield_charge_power: {
      name: 'Charge au bouclier',
      description: '+1 attaque et +1 défense.',
    },
    metalloy_power: {
      name: 'Métalliage',
      description: '+2 défense',
    },
    heavy_slam_power: {
      name: 'Plaquage lourd',
      description: '+4 attaque et +1 statut épuisement au premier pouvoir en dessous.',
    },
    force_palm_power: {
      name: 'Paume de force',
      description: '+3 attaque si un pouvoir adjacent de type offensif sur la même ligne, +1 attaque sinon.',
    },
    close_protection_power: {
      name: 'Protection rapprochée',
      description: '+1 défense, et +1 crédit par pouvoir adjacent de type soutien sur la même ligne.',
    },
    impregnable_power: {
      name: 'Imprenable',
      description: '+3 défense si votre défense vaut 0, ou +1 défense sinon.',
    },
    lead_boots_power: {
      name: 'Bottes de plomb',
      description: '+2 défense et +1 attaque si sur terre.',
    },
    iron_will_power: {
      name: 'Volonté de fer',
      description: '+1 défense. Ce pouvoir et cette zone ne peuvent pas être affecté par un statut négatif.',
    },
    arctic_veil_power: {
      name: 'voile arctique',
      description: '+1 défense, +1 manœuvre et +1 statut gel sur cette case.',
    },
    blizzard_power: {
      name: 'blizzard',
      description: 'Si à la surface ou au ciel et que vous avez au moins 1 manœuvre, +5 attaque et -1 manœuvre. Sinon +2 attaque.',
    },
    'cool-headed_power': {
      name: 'Tête froide',
      description: '+1 défense si un pouvoir adjacent est de type offensif. Sinon +1 stratégie.',
    },
    frozen_lace_power: {
      name: 'Dentelle de givre',
      description: 'Si la zone a le statut gel, +3 crédit. Sinon +1 crédit.',
    },
    icy_step_power: {
      name: 'Pas glacial',
      description: 'Si sur terre, +1 défense et +1 manœuvre, et +1 statut gel sur la zone. Sinon +1 défense.',
    },
    winter_dress_power: {
      name: 'Robe d’hiver',
      description: 'Pour cette zone et chaque zone adjacente avec le statut gel, +1 crédit et +1 défense.',
    },
    gravity_beam_power: {
      name: 'Rayon gravitationnel',
      description: 'Pour chaque pouvoir au-dessus dans la colonne, +3 attaque et +1 statut ancrage à chaque pouvoir.',
    },
    weightlessness_power: {
      name: 'impesanteur',
      description: 'Si sur terre ou à la surface, +1 manœuvre. Sinon +1 stratégie. Aucun effet si la zone a le statut ancrage.',
    },
    snow_dance_power: {
      name: 'Danse des neiges',
      description: '+1 crédit pour chaque manœuvre que vous possédez, jusqu’à 3.',
    },
    icycle_power: {
      name: 'Stalagtite',
      description: 'Si une zone adjacente a le statut gel, +3 attaque. Sinon +1 attaque. Dans tous les cas, +1 statut gel sur cette zone.',
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
      description: 'À la fin du tour, inflige {compteur} dégâts imbloquables puis réduit de 1.',
    },
    area_freeze_status: {
      name: 'gel',
      description: 'Annule le pouvoir dans cette zone si son type est offensif ou soutien.',
    },
    area_anchor_status: {
      name: 'ancrage',
      description: 'Le pouvoir dans cette zone ne peut pas être déplacé sur le plateau.',
    },
  },

  // Noms des héros (indexés par nameId).
  heroes: {
    hero_paladium: 'Paladium',
    hero_mindel: 'Mindel',
  },

  // Nom + description de chaque signature (perk), indexés par id.
  perks: {
    rusted_armor_perk: {
      name: 'Armure rouillée',
      description: '+2 défense à la fin du tour.',
    },
    blue_comet_mark_perk: {
      name: 'marque de la comète bleue',
      description: 'À la fin du tour, +1 attaque pour tous les 3 pouvoirs annulés par un statut de zone.',
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
