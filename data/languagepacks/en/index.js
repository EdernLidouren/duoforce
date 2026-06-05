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
      display: '{value} of {max} hit points.',
      help: 'Bring the enemy’s hit points down to win this combat.',
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
      description: 'Deals heavy damage from above, stronger when placed high.',
    },
    power_shield: {
      name: 'Shield',
      description: 'Bolsters the duo’s defense, especially on the left flank.',
    },
    power_phalanx: {
      name: 'Phalanx',
      description: 'Gains defense when surrounded by other support powers.',
    },
    power_vanguard: {
      name: 'Vanguard',
      description: 'Hits harder next to a shield or in the corners.',
    },
    power_disrupt: {
      name: 'Disrupt',
      description: 'Weakens the enemy’s attack and defense.',
    },
    power_curse: {
      name: 'Curse',
      description: 'Manipulates enemy stats, with possible backlash.',
    },
    power_medic: {
      name: 'Medic',
      description: 'Heals the duo and generates support resources.',
    },
    power_tactician: {
      name: 'Tactician',
      description: 'Produces credit and draws, and manipulates the board.',
    },
    power_sabotage: {
      name: 'Sabotage',
      description: 'Discards or exiles neighboring powers on the board.',
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
