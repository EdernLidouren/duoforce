// src/scenes/combat.js — Scène de combat de test (DEBUG).
//
// Initialise un combat via engine/combat.js (duo = les deux héros placeholder,
// adversaire = enemies.js) et en présente l'état de façon accessible au clavier
// et au lecteur d'écran, en MODE FORMULAIRE.
//
// Accessibilité — navigation par zones (voir src/ui/zones.js) :
//   Le conteneur a role="application" (focus mode maintenu). L'interface est
//   découpée en quatre zones cyclables par Tab / Maj+Tab :
//     1. Ennemi · 2. Plateau · 3. Duo · 4. Actions (tour + boutons).
//   Dans la zone Plateau, les flèches déplacent un curseur 2D ; chaque case est
//   annoncée sous la forme « Ciel Gauche, <description longue du pouvoir> ».
//
// Raccourcis globaux (keybindings.js), valables quelle que soit la zone active :
//   Ctrl+E fin de tour · V pv duo · Maj+V pv ennemi · M manœuvres · S stratégies
//   · C crédit · T tour/type/ennemi · 1–9 (rangée ou pavé) description longue du
//   pouvoir à cet emplacement.
//
// Le DOM est construit une seule fois (mount) puis mis à jour en place à chaque
// tour, afin de préserver la zone active et le focus.

import {
  initCombat,
  startTurn,
  resolveTurn,
  isOver,
  getOutcome,
} from '../engine/combat.js';
import { STRATEGY_PICK } from '../engine/gameState.js';
import { HEROES } from '../data/heroes.js';
import { DUMMY_ENEMY } from '../data/enemies.js';
import { KEYBINDINGS, matchKeybinding, matchPositionKey } from '../ui/keybindings.js';
import { createZoneController } from '../ui/zones.js';
import { format } from '../ui/format.js';
import { longDescription, powerName } from '../ui/powerText.js';

/** Disposition visuelle du plateau : lignes ciel / surface / terre. */
const BOARD_ROWS = [
  { labelKey: 'sky', indices: [6, 7, 8] },
  { labelKey: 'surface', indices: [3, 4, 5] },
  { labelKey: 'ground', indices: [0, 1, 2] },
];

/** Déplacements 2D associés aux flèches : [dx, dy]. */
const ARROW_DELTAS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** Petit helper de création d'éléments DOM. */
function el(tag, { attrs, ...props } = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function createCombatScene() {
  let state = null;
  let context = null;
  let controller = null;
  let onKeydown = null;

  // Références DOM stables (créées une fois, mises à jour en place).
  let appEl = null;
  let refs = null;
  let tdByIndex = null;

  // Curseurs internes des zones.
  let boardX = 0;
  let boardY = 0;
  let actionCursor = 0;
  let actions = [];

  // --- Accès aux chaînes -----------------------------------------------------

  function combatStrings() {
    return context.strings?.combat ?? {};
  }

  function resource(key) {
    return context.strings?.resources?.[key] ?? {};
  }

  /** Libellés (noms) localisés avec valeurs de repli. */
  function labels() {
    const c = combatStrings();
    return {
      title: c.title ?? 'Combat test',
      turn: c.turn ?? 'Tour',
      enemy: c.enemy ?? 'Ennemi',
      duo: c.duo ?? 'Duo',
      board: c.board ?? 'Plateau',
      actions: c.actions ?? 'Actions',
      instructions: c.instructions ?? 'Tabulation pour changer de zone, flèches pour naviguer.',
      hp: resource('hp').name ?? 'Points de vie',
      attack: c.attack ?? 'Attaque',
      defense: c.defense ?? 'Défense',
      maneuvers: resource('maneuver').name ?? 'Manœuvres',
      strategies: resource('strategy').name ?? 'Stratégies',
      credit: resource('credit').name ?? 'Crédit',
      deck: c.deck ?? 'Pioche',
      discard: c.discard ?? 'Défausse',
      exile: c.exile ?? 'Exil',
      empty: c.empty ?? 'vide',
      endTurn: c.endTurn ?? 'Fin de tour',
      backToMenu: c.backToMenu ?? 'Retour au menu',
      victory: c.victory ?? 'Victoire !',
      defeat: c.defeat ?? 'Défaite.',
      sky: c.sky ?? 'Ciel',
      surface: c.surface ?? 'Surface',
      ground: c.ground ?? 'Terre',
      left: c.left ?? 'Gauche',
      center: c.center ?? 'Centre',
      right: c.right ?? 'Droite',
    };
  }

  function say(message) {
    context.announce.polite(message);
  }

  // --- Construction du DOM (une seule fois) ---------------------------------

  function buildView() {
    const L = labels();

    refs = { enemy: {}, duo: {}, actions: {} };
    const enemyZoneEl = el('section', {},
      el('h2', { textContent: L.enemy }),
      (refs.enemy.hp = el('p', {})),
      (refs.enemy.attack = el('p', {})),
      (refs.enemy.defense = el('p', {})),
    );

    tdByIndex = new Map();
    const colHeaders = [L.left, L.center, L.right];
    const rowLabel = { sky: L.sky, surface: L.surface, ground: L.ground };
    const thead = el('thead', {},
      el('tr', {},
        el('td', {}),
        ...colHeaders.map((h) => el('th', { scope: 'col', textContent: h })),
      ),
    );
    const tbody = el('tbody', {},
      ...BOARD_ROWS.map((row) =>
        el('tr', {},
          el('th', { scope: 'row', textContent: rowLabel[row.labelKey] }),
          ...row.indices.map((i) => {
            const td = el('td', {});
            tdByIndex.set(i, td);
            return td;
          }),
        ),
      ),
    );
    const boardZoneEl = el('section', {},
      el('h2', { textContent: L.board }),
      el('table', { attrs: { 'aria-hidden': 'true' } },
        el('caption', { textContent: L.board }),
        thead,
        tbody,
      ),
    );

    const duoZoneEl = el('section', {},
      el('h2', { textContent: L.duo }),
      (refs.duo.hp = el('p', {})),
      (refs.duo.attack = el('p', {})),
      (refs.duo.defense = el('p', {})),
      (refs.duo.maneuvers = el('p', {})),
      (refs.duo.strategies = el('p', {})),
      (refs.duo.credit = el('p', {})),
    );

    const endTurnBtn = el('button', { type: 'button', tabIndex: -1, textContent: L.endTurn, onclick: endTurn });
    const backBtn = el('button', { type: 'button', tabIndex: -1, textContent: L.backToMenu, onclick: () => context.router.go('menu') });
    actions = [
      { button: endTurnBtn, run: endTurn, isEnabled: () => !isOver(state) },
      { button: backBtn, run: () => context.router.go('menu'), isEnabled: () => true },
    ];
    const actionsZoneEl = el('section', {},
      el('h2', { textContent: L.actions }),
      (refs.actions.turn = el('p', {})),
      (refs.counters = el('p', {})),
      (refs.actions.outcome = el('p', { attrs: { role: 'status' } })),
      el('p', {}, endTurnBtn, document.createTextNode(' '), backBtn),
    );

    appEl = el('div', { className: 'combat' },
      el('h1', { textContent: L.title }),
      enemyZoneEl,
      boardZoneEl,
      duoZoneEl,
      actionsZoneEl,
    );

    const zones = [
      { element: enemyZoneEl, label: L.enemy, onEnter: () => describeEnemy() },
      { element: boardZoneEl, label: L.board, onEnter: () => describeCell(), onKey: onBoardKey },
      { element: duoZoneEl, label: L.duo, onEnter: () => describeDuo() },
      { element: actionsZoneEl, label: L.actions, onEnter: () => `${L.turn} ${state.turn}. ${currentActionLabel()}`, onKey: onActionsKey },
    ];

    controller = createZoneController({
      container: appEl,
      announce: context.announce,
      label: L.title,
      zones,
    });
  }

  // --- Descriptions (annonces) ----------------------------------------------

  function describeEnemy() {
    const L = labels();
    const e = state.enemy;
    return `${L.hp} ${e.hp}/${e.maxHp}, ${L.attack} ${e.attack}, ${L.defense} ${e.defense}`;
  }

  function describeDuo() {
    const L = labels();
    const d = state.duo;
    return (
      `${L.hp} ${d.hp}/${d.maxHp}, ${L.attack} ${d.attack}, ${L.defense} ${d.defense}, ` +
      `${L.maneuvers} ${d.maneuver}, ${L.strategies} ${d.strategy}, ${L.credit} ${d.credit}`
    );
  }

  function boardIndexAt(x, y) {
    return BOARD_ROWS[y].indices[x];
  }

  function positionOf(index) {
    for (let y = 0; y < BOARD_ROWS.length; y++) {
      const x = BOARD_ROWS[y].indices.indexOf(index);
      if (x >= 0) return { x, y };
    }
    return { x: 0, y: 0 };
  }

  /** Annonce d'une case : « <ligne> <colonne>, <description longue | vide> ». */
  function describeCellAt(index) {
    const L = labels();
    const { x, y } = positionOf(index);
    const position = `${[L.sky, L.surface, L.ground][y]} ${[L.left, L.center, L.right][x]}`;
    const power = state.board[index];
    if (!power) return `${position}, ${L.empty}`;
    return `${position}, ${longDescription(power, context.strings)}`;
  }

  function describeCell() {
    return describeCellAt(boardIndexAt(boardX, boardY));
  }

  function currentActionLabel() {
    return actions[actionCursor]?.button.textContent ?? '';
  }

  // --- Annonces des ressources / infos (raccourcis) -------------------------

  function announceDuoHp() {
    const r = resource('hp');
    say(`${format(r.display ?? '{value}/{max}', { value: state.duo.hp, max: state.duo.maxHp })} ${r.help ?? ''}`.trim());
  }

  function announceEnemyHp() {
    const r = resource('enemyHp');
    say(`${format(r.display ?? '{value}/{max}', { value: state.enemy.hp, max: state.enemy.maxHp })} ${r.help ?? ''}`.trim());
  }

  function announceManeuvers() {
    const r = resource('maneuver');
    say(`${format(r.display ?? '{value}', { value: state.duo.maneuver })} ${r.help ?? ''}`.trim());
  }

  function announceStrategies() {
    const r = resource('strategy');
    const help = format(r.help ?? '', { strategy_pick: STRATEGY_PICK });
    say(`${format(r.display ?? '{value}', { value: state.duo.strategy })} ${help}`.trim());
  }

  function announceCredit() {
    const r = resource('credit');
    say(`${format(r.display ?? '{value}', { value: state.duo.credit })} ${r.help ?? ''}`.trim());
  }

  function announceDuoAttack() {
    const r = resource('attack');
    say(`${format(r.display ?? '{value}', { value: state.duo.attack })} ${r.help ?? ''}`.trim());
  }

  function announceEnemyAttack() {
    const r = resource('enemyAttack');
    say(`${format(r.display ?? '{value}', { value: state.enemy.attack })} ${r.help ?? ''}`.trim());
  }

  function announceDuoDefense() {
    const r = resource('defense');
    say(`${format(r.display ?? '{value}', { value: state.duo.defense })} ${r.help ?? ''}`.trim());
  }

  function announceEnemyDefense() {
    const r = resource('enemyDefense');
    say(`${format(r.display ?? '{value}', { value: state.enemy.defense })} ${r.help ?? ''}`.trim());
  }

  function announceTurn() {
    const c = combatStrings();
    const types = c.combatType ?? {};
    const combatType = state.enemy.isBoss ? (types.boss ?? 'combat de boss') : (types.normal ?? 'combat');
    const enemy = context.strings?.enemies?.[state.enemy.nameId] ?? state.enemy.nameId;
    say(format(c.turnAnnounce ?? 'Tour {turn}, {combatType} contre {enemy}.', { turn: state.turn, combatType, enemy }));
  }

  function announcePower(index) {
    say(describeCellAt(index));
  }

  // --- Touches des zones -----------------------------------------------------

  function onBoardKey(event) {
    const delta = ARROW_DELTAS[event.key];
    if (!delta) return false;
    const nx = clamp(boardX + delta[0], 0, 2);
    const ny = clamp(boardY + delta[1], 0, 2);
    // Bord atteint : la touche est consommée (pas de défilement de page) mais
    // rien d'autre ne se passe — aucun déplacement, aucune annonce.
    if (nx === boardX && ny === boardY) return true;
    boardX = nx;
    boardY = ny;
    applyBoardCursor();
    say(describeCell());
    return true;
  }

  function onActionsKey(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      actionCursor = (actionCursor + 1) % actions.length;
      applyActionCursor();
      say(currentActionLabel());
      return true;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      actionCursor = (actionCursor - 1 + actions.length) % actions.length;
      applyActionCursor();
      say(currentActionLabel());
      return true;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const action = actions[actionCursor];
      if (action && action.isEnabled()) action.run();
      return true;
    }
    return false;
  }

  // --- Mise à jour en place --------------------------------------------------

  function applyBoardCursor() {
    const activeIdx = boardIndexAt(boardX, boardY);
    for (const [i, td] of tdByIndex) {
      td.classList.toggle('is-cursor', i === activeIdx);
    }
  }

  function applyActionCursor() {
    actions.forEach((a, i) => a.button.classList.toggle('is-action-active', i === actionCursor));
  }

  function updateView() {
    const L = labels();
    const { duo, enemy } = state;

    refs.enemy.hp.textContent = `${L.hp} : ${enemy.hp}/${enemy.maxHp}`;
    refs.enemy.attack.textContent = `${L.attack} : ${enemy.attack}`;
    refs.enemy.defense.textContent = `${L.defense} : ${enemy.defense}`;

    for (const [i, td] of tdByIndex) {
      const power = state.board[i];
      td.textContent = power ? powerName(power, context.strings) : L.empty;
    }

    refs.duo.hp.textContent = `${L.hp} : ${duo.hp}/${duo.maxHp}`;
    refs.duo.attack.textContent = `${L.attack} : ${duo.attack}`;
    refs.duo.defense.textContent = `${L.defense} : ${duo.defense}`;
    refs.duo.maneuvers.textContent = `${L.maneuvers} : ${duo.maneuver}`;
    refs.duo.strategies.textContent = `${L.strategies} : ${duo.strategy}`;
    refs.duo.credit.textContent = `${L.credit} : ${duo.credit}`;

    refs.actions.turn.textContent = `${L.turn} ${state.turn}`;
    refs.counters.textContent = `${L.deck} : ${state.deck.length} · ${L.discard} : ${state.discard.length} · ${L.exile} : ${state.exile.length}`;

    const over = isOver(state);
    refs.actions.outcome.textContent = over ? (getOutcome(state) === 'won' ? L.victory : L.defeat) : '';
    actions[0].button.disabled = over;

    applyBoardCursor();
    applyActionCursor();
  }

  // --- Boucle de jeu ---------------------------------------------------------

  function endTurn() {
    if (isOver(state)) return;
    resolveTurn(state);
    if (!isOver(state)) startTurn(state);
    updateView();

    const L = labels();
    if (isOver(state)) {
      context.announce.assertive(getOutcome(state) === 'won' ? L.victory : L.defeat);
    } else {
      controller.announceActive();
    }
  }

  /** Aiguille un raccourci global vers l'action correspondante. */
  function dispatchBinding(id) {
    switch (id) {
      case KEYBINDINGS.END_TURN.id: endTurn(); break;
      case KEYBINDINGS.ANNOUNCE_DUO_HP.id: announceDuoHp(); break;
      case KEYBINDINGS.ANNOUNCE_ENEMY_HP.id: announceEnemyHp(); break;
      case KEYBINDINGS.ANNOUNCE_DUO_ATTACK.id: announceDuoAttack(); break;
      case KEYBINDINGS.ANNOUNCE_ENEMY_ATTACK.id: announceEnemyAttack(); break;
      case KEYBINDINGS.ANNOUNCE_DUO_DEFENSE.id: announceDuoDefense(); break;
      case KEYBINDINGS.ANNOUNCE_ENEMY_DEFENSE.id: announceEnemyDefense(); break;
      case KEYBINDINGS.ANNOUNCE_MANEUVERS.id: announceManeuvers(); break;
      case KEYBINDINGS.ANNOUNCE_STRATEGIES.id: announceStrategies(); break;
      case KEYBINDINGS.ANNOUNCE_CREDIT.id: announceCredit(); break;
      case KEYBINDINGS.ANNOUNCE_TURN.id: announceTurn(); break;
      default: break;
    }
  }

  // --- Cycle de vie de la scène ---------------------------------------------

  return {
    mount(ctx) {
      context = ctx;

      state = initCombat({
        heroes: HEROES.slice(0, 2),
        enemy: {
          id: DUMMY_ENEMY.id,
          nameId: DUMMY_ENEMY.nameId,
          hp: DUMMY_ENEMY.hp,
          maxHp: DUMMY_ENEMY.hp,
          baseAttack: DUMMY_ENEMY.attack,
          baseDefense: DUMMY_ENEMY.defense,
        },
      });
      startTurn(state);

      buildView();
      context.root.replaceChildren(appEl);
      controller.mount();
      updateView();

      const L = labels();
      controller.activate(0, { silent: true });
      say(`${L.instructions} ${L.enemy}. ${describeEnemy()}`);

      // Raccourcis globaux (fin de tour + annonces + emplacements 1–9).
      onKeydown = (event) => {
        const binding = matchKeybinding(event);
        if (binding) {
          event.preventDefault();
          dispatchBinding(binding.id);
          return;
        }
        const position = matchPositionKey(event);
        if (position !== null) {
          event.preventDefault();
          announcePower(position);
        }
      };
      document.addEventListener('keydown', onKeydown);
    },

    unmount() {
      if (onKeydown) {
        document.removeEventListener('keydown', onKeydown);
        onKeydown = null;
      }
      if (controller) {
        controller.dispose();
        controller = null;
      }
      if (appEl && appEl.parentNode) appEl.remove();
      appEl = null;
      refs = null;
      tdByIndex = null;
      state = null;
      context = null;
      actions = [];
      boardX = 0;
      boardY = 0;
      actionCursor = 0;
    },
  };
}
