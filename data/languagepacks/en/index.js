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
    power_aerial_strike: {
      name: 'Aerial Strike',
      description: '+4 attack in the sky, -1 attack on the ground, +2 attack otherwise.',
    },
    power_shield: {
      name: 'Shield',
      description: '+3 defense on the left, -1 defense on the right, +1 defense otherwise.',
    },
    power_phalanx: {
      name: 'Phalanx',
      description: '+3 defense near a support power, ×2 defense in the center column, +1 defense otherwise.',
    },
    power_vanguard: {
      name: 'Vanguard',
      description: '+5 attack next to a shield, ×2 attack in the corners, +2 attack otherwise.',
    },
    power_disrupt: {
      name: 'Disrupt',
      description: '-3 enemy attack near a special power, -2 enemy defense in the center column, -1 enemy attack otherwise.',
    },
    power_curse: {
      name: 'Curse',
      description: '×0 enemy defense in the center, +1 enemy defense near an offensive power, ×2 enemy attack on the ground, +1 enemy attack otherwise.',
    },
    power_medic: {
      name: 'Medic',
      description: '+3 hit points near a support power, +1 maneuver on the ground, +1 strategy otherwise.',
    },
    power_tactician: {
      name: 'Tactician',
      description: '+1 credit on the center cell, +1 strategy when isolated, +1 maneuver otherwise.',
    },
    power_sabotage: {
      name: 'Sabotage',
      description: '-2 enemy defense near an offensive power, -1 enemy attack in the right column, +1 attack otherwise.',
    },
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
