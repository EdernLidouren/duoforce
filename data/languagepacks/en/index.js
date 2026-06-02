// data/languagepacks/en/index.js — Language pack: English.
//
// Same structure as ../fr/index.js. Keys grouped by scene plus a dedicated
// `a11y` section for ARIA live-region announcements. Keep keys in sync across
// all packs.

export default {
  menu: {
    title: 'Duoforce',
    welcome: 'Main menu. Press Enter to start a game.',
    start: 'New game',
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
