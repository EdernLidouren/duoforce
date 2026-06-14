// data/languagepacks/en/index.js — Language pack: English.
//
// Same structure as ../fr/index.js. Localization conventions:
//   - Each resource keeps three distinct strings: `name` (short label),
//     `display` (template announcing the current value) and `help` (hint).
//   - Templates contain `{key}` markers interpolated at runtime (see
//     src/ui/format.js): dynamic text.
// Keep keys in sync across all packs.

export default {
  menu: {
    title: 'Duoforce',
    label: 'Main menu',
    welcome: 'Main menu. Press Enter to start a game.',
    start: 'New game',
    options: 'Options',
    quit: 'Quit',
    combatTest: 'Test combat',
  },

  combat: {
    title: 'Test combat',
    turn: 'Turn',
    enemy: 'Enemy',
    duo: 'Duo',
    board: 'Board',
    actions: 'Actions',
    history: 'History',
    noMessages: 'No messages.',
    instructions: 'Tab to switch zone, arrow keys to navigate.',
    attack: 'Attack',
    defense: 'Defense',
    deck: 'Deck',
    discard: 'Discard',
    exile: 'Exile',
    empty: 'empty',
    endTurn: 'End turn',
    backToMenu: 'Back to menu',
    victory: 'Victory!',
    defeat: 'Defeat.',
    sky: 'Sky',
    surface: 'Surface',
    ground: 'Ground',
    left: 'Left',
    center: 'Center',
    right: 'Right',
    combatType: {
      normal: 'combat',
      boss: 'boss combat',
    },
    turnAnnounce: 'Turn {turn}, {combatType} against {enemy}.',
  },

  resources: {
    hp: {
      name: 'Hit points',
      display: '{value} of {max} hit points.',
      help: 'If your duo’s hit points reach 0, you lose the game.',
    },
    enemyHp: {
      name: 'Hit points',
      display: '{value} of {max} enemy hit points.',
      help: 'Bring the enemy’s hit points down to win this combat.',
    },
    attack: {
      name: 'Attack',
      display: '{value} attack',
      help: 'At the end of the turn, after powers activate, reduces the enemy’s hit points by this value.',
    },
    enemyAttack: {
      name: 'Attack',
      display: '{value} enemy attack',
      help: 'At the end of the turn, after your duo attacks, reduces your hit points by this value.',
    },
    defense: {
      name: 'Defense',
      display: '{value} defense',
      help: 'When your duo takes damage, this value is reduced first.',
    },
    enemyDefense: {
      name: 'Defense',
      display: '{value} enemy defense',
      help: 'When the enemy takes damage, this value is reduced first.',
    },
    maneuver: {
      name: 'Maneuvers',
      display: '{value} maneuvers.',
      help: 'Spend a maneuver to swap the position of two adjacent powers.',
    },
    strategy: {
      name: 'Strategies',
      display: '{value} strategies.',
      help: 'Spend a strategy to discard a power and replace it by choosing among the top {strategy_pick} powers of the deck.',
    },
    credit: {
      name: 'Credit',
      display: '{value} credit.',
      help: 'Credit is the game’s currency.',
    },
  },

  power: {
    short: '{name}, {type}, {rarity}',
    long: '{name}, {type}, {rarity}: {description}',
  },

  // Combat messages (end of turn). Template + per-stat labels.
  // {change} is e.g. "+2" or "-1"; {label} is one of the labels below.
  effectMessageFormat: '{change} {label}',
  effectLabels: {
    attack: 'attack',
    defense: 'defense',
    enemy_attack: 'enemy attack',
    enemy_defense: 'enemy defense',
    hp: 'hit points',
    enemy_hp: 'enemy hit points',
    credit: 'credit',
    maneuver: 'maneuvers',
    strategy: 'strategy',
  },

  // Combat log messages (end of turn), sent one by one to the announcer.
  log: {
    inactive: '{name} is inactive.',
    effects: '{name}: {effects}.',
    discardOne: '{actor} discards {target}{direction}.',
    exileOne: '{actor} exiles {target}{direction}.',
    draw: '{actor} draws {value}.',
    enemyHit: '{enemy} takes {damage} damage.',
    enemyDefeated: '{enemy} is defeated.',
    duoHit: 'Your duo takes {damage} damage.',
    turnStart: 'Start of turn {turn}.',
    listSeparator: ', ',
    listLast: ' and ',
    directions: {
      above: 'above',
      below: 'below',
      left: 'to the left',
      right: 'to the right',
      self: 'itself',
      none: '',
    },
  },

  powerTypes: {
    offensive: 'offensive',
    support: 'support',
    special: 'special',
  },

  rarities: {
    0: 'common',
    1: 'uncommon',
    2: 'rare',
    3: 'epic',
    4: 'legendary',
  },

  powers: {
    helmbutt_power: {
      name: 'helmbutt',
      description: '+2 attack.',
    },
    iron_grip_power: {
      name: 'iron grip',
      description: 'Adjacent offensive powers deal +2 damage.',
    },
    shield_charge_power: {
      name: 'shield charge',
      description: '+1 attack, +1 defense.',
    },
    metalloy_power: {
      name: 'metalloy',
      description: '+2 defense.',
    },
    heavy_slam_power: {
      name: 'heavy slam',
      description: '+4 attack, exhausts the power below for one turn.',
    },
    force_palm_power: {
      name: 'force palm',
      description: '+3 attack next to an offensive power on the same row, +1 attack otherwise.',
    },
    close_protection_power: {
      name: 'close protection',
      description: '+1 defense, and +1 credit per support power on the same row.',
    },
    impregnable_power: {
      name: 'impregnable',
      description: '+3 defense if defense is zero, +1 defense otherwise.',
    },
    lead_boots_power: {
      name: 'lead boots',
      description: '+2 defense and +1 attack on the bottom row, no effect otherwise.',
    },
    iron_will_power: {
      name: 'iron will',
      description: '+1 defense. Immune to exhaustion.',
    },
  },

  // Name + description of each status (indexed by id). {compteur} = current
  // stacks, interpolated at display time (see src/ui/format.js).
  statuses: {
    power_exhaustion_status: {
      name: 'exhaustion',
      description: 'Prevents any effect from activating.',
    },
    hero_poison_status: {
      name: 'poison',
      description: 'At the end of the turn, deals {compteur} unblockable damage, then decreases by 1.',
    },
    area_freeze_status: {
      name: 'freeze',
      description: 'Cancels the effects of offensive or support powers placed here.',
    },
  },

  // Hero names (indexed by nameId).
  heroes: {
    hero_paladium: 'Paladium',
  },

  enemies: {
    enemy_dummy: 'Practice Dummy',
  },

  game: {
    start: 'The game begins.',
    yourTurn: 'Your turn.',
  },

  gameover: {
    title: 'Game over.',
    win: 'You win.',
    lose: 'You lose.',
    draw: 'Draw.',
    backToMenu: 'Back to menu',
  },

  a11y: {
    invalidMove: 'Invalid move.',
  },
};
