// data/languagepacks/en/index.js — Language pack: English.
//
// Same structure as ../fr/index.js. Keys grouped by scene plus a dedicated
// `a11y` section for ARIA live-region announcements. Keep keys in sync across
// all packs.

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
    hp: 'Hit points',
    attack: 'Attack',
    defense: 'Defense',
    maneuvers: 'Maneuvers',
    strategies: 'Strategies',
    credit: 'Credit',
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
