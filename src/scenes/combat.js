// src/scenes/combat.js — Scène de combat de test (DEBUG).
//
// Initialise un combat via engine/combat.js (duo = les deux héros placeholder,
// adversaire = enemies.js) et en présente l'état de façon accessible au clavier
// et au lecteur d'écran, en MODE FORMULAIRE.
//
// Accessibilité — navigation par zones (voir src/ui/zones.js) :
//   Le conteneur a role="application" (focus mode maintenu). L'interface est
//   découpée en cinq zones cyclables par Tab / Maj+Tab :
//     1. Ennemi · 2. Duo · 3. Plateau · 4. Actions (tour + boutons) · 5. Historique.
//   Dans la zone Plateau, les flèches déplacent un curseur 2D ; chaque case est
//   annoncée sous la forme « Ciel Gauche, <description longue du pouvoir> ».
//   La zone Historique conserve les 15 derniers messages de combat (flèches
//   haut/bas pour les parcourir).
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
import { createEstimator } from '../engine/estimator.js';
import { HEROES } from '../data/heroes/index.js';
import { DUMMY_ENEMY } from '../data/enemies/index.js';
import { getNextEnemy, applyVictoryToRun } from '../engine/run.js';
import { KEYBINDINGS, matchKeybinding, matchPositionKey } from '../ui/keybindings.js';
import { createZoneController } from '../ui/zones.js';
import { format } from '../ui/format.js';
import { powerName, longDescription } from '../ui/powerText.js';
import { perkLongDescription } from '../ui/perkText.js';
import { createListNavigator } from '../ui/listNavigation.js';
import { turnMessages, resolutionMessages, turnStartMessage, perkActivationMessage } from '../ui/combatMessages.js';
import { BOARD_ROWS, indexToXY, xyToIndex, describeBoardCell } from '../ui/boardText.js';
import { createTargetingResolver } from '../ui/targeting.js';
import { canStartManeuver, canManeuverFrom, executeManeuver, reachablePositions } from '../engine/maneuver.js';
import { validateAction, createAction } from '../engine/actions.js';
import { canRemove, canDiscard } from '../engine/powerActions.js';
import { buildCandidates, executeStrategy, canUseStrategySource } from '../engine/strategy.js';

/** Déplacements 2D associés aux flèches : [dx, dy]. */
const ARROW_DELTAS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** Nombre maximal de messages conservés dans la zone Historique. */
const HISTORY_LIMIT = 15;

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
  let estimator = null;

  // Références DOM stables (créées une fois, mises à jour en place).
  let appEl = null;
  let refs = null;
  let tdByIndex = null;

  // Curseurs internes des zones.
  let boardX = 0;
  let boardY = 0;
  let actionCursor = 0;
  let actions = [];

  // Sélecteur de zone actif (null = aucun). Remplace temporairement onBoardKey.
  let activeSelector = null;
  // Indirection mutable : la zone Plateau appelle toujours boardKeyHandler(e),
  // ce qui permet de substituer le handler du sélecteur sans reconstruire les zones.
  let boardKeyHandler = null; // initialisé après définition de onBoardKey

  // Navigateurs verticaux des zones « liste » (duo, ennemi, historique).
  let duoNav = null;
  let enemyNav = null;
  let historyNav = null;

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
      history: c.history ?? 'Historique',
      noMessages: c.noMessages ?? 'Aucun message.',
      noSignature: c.noSignature ?? 'Aucune signature.',
      and: c.and ?? 'et',
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
      (refs.enemy.vitals = el('p', {})),  // nom + points de vie
      (refs.enemy.combat = el('p', {})),  // attaque + défense
      (refs.enemy.perks = el('div', {})), // signatures (rendues dans updateView)
    );
    refs.enemy.section = enemyZoneEl;

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
            td.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              openStrategyUI(i);
            });
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
      (refs.duo.vitals = el('p', {})),     // noms + points de vie
      (refs.duo.combat = el('p', {})),     // attaque + défense
      (refs.duo.resources = el('p', {})),  // manœuvres + stratégies + crédit
      (refs.duo.perks = el('div', {})),    // signatures (rendues dans updateView)
    );
    refs.duo.section = duoZoneEl;

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

    // Zone 5 — Historique (journal de combat). La liste s'enrichit en fin de tour
    // et ne conserve que les HISTORY_LIMIT derniers messages.
    refs.history = el('ul', { className: 'combat__log' });
    const historyZoneEl = el('section', {},
      el('h2', { textContent: L.history }),
      refs.history,
    );

    appEl = el('div', { className: 'combat' },
      el('h1', { textContent: L.title }),
      enemyZoneEl,
      duoZoneEl,
      boardZoneEl,
      actionsZoneEl,
      historyZoneEl,
    );

    // Navigateurs « menu vertical » : une ligne par information.
    //   - duo / ennemi : chaque <p> de la zone (stats puis signatures) ;
    //   - historique   : chaque message (<li>).
    const lines = (sectionEl) => Array.from(sectionEl.querySelectorAll('p'), (p) => p.textContent);
    duoNav = createListNavigator({ getItems: () => lines(refs.duo.section), announce: say });
    enemyNav = createListNavigator({ getItems: () => lines(refs.enemy.section), announce: say });
    historyNav = createListNavigator({
      getItems: () => Array.from(refs.history.children, (li) => li.textContent),
      announce: say,
    });

    const zones = [
      { id: 'enemy', element: enemyZoneEl, label: L.enemy, onEnter: () => enemyNav.reset(), onKey: (e) => enemyNav.onKey(e) },
      { id: 'duo', element: duoZoneEl, label: L.duo, onEnter: () => duoNav.reset(), onKey: (e) => duoNav.onKey(e) },
      { id: 'board', element: boardZoneEl, label: L.board, onEnter: () => describeCell(), onKey: (e) => boardKeyHandler(e) },
      { id: 'actions', element: actionsZoneEl, label: L.actions, onEnter: () => `${L.turn} ${state.turn}. ${currentActionLabel()}`, onKey: onActionsKey },
      { id: 'history', element: historyZoneEl, label: L.history, noAria: true, onEnter: () => describeHistory(), onKey: (e) => historyNav.onKey(e) },
    ];

    controller = createZoneController({
      container: appEl,
      announce: context.announce,
      label: L.title,
      zones,
      defaultZone: 'board', // en entrant en combat, le focus va sur le plateau
    });
  }

  // --- Descriptions (annonces) ----------------------------------------------
  //
  // Les zones duo / ennemi sont des MENUS VERTICAUX : leur contenu est annoncé
  // ligne par ligne via leur navigateur (duoNav / enemyNav), qui lit directement
  // les <p> de la zone. Il n'y a donc plus de résumé unique describeDuo/Enemy.

  function boardIndexAt(x, y) {
    return xyToIndex(x, y);
  }

  /**
   * Annonce d'une case. Délègue à boardText.describeBoardCell avec l'état courant.
   * Exemples :
   *   « Gel 1, Plaquage lourd, épuisement 1 : +4 attaque…, Ciel Droite »
   *   « Bouclier : +1 défense…, Surface Gauche »
   */
  function describeCellAt(index) {
    return describeBoardCell(index, state.board, context.strings, state);
  }

  function describeCell() {
    return describeCellAt(boardIndexAt(boardX, boardY));
  }

  function currentActionLabel() {
    return actions[actionCursor]?.button.textContent ?? '';
  }

  /** Nom localisé de l'ennemi courant. */
  function enemyName() {
    return context.strings?.enemies?.[state.enemy.nameId] ?? state.enemy.nameId;
  }

  // --- Zone d'historique (messages) -----------------------------------------

  /** Ajoute un message au <ul> visible de l'historique sans l'annoncer. */
  function addToHistory(message) {
    refs.history.append(el('li', { textContent: message }));
    while (refs.history.children.length > HISTORY_LIMIT) {
      refs.history.removeChild(refs.history.firstChild);
    }
  }

  /** Envoie un message au lecteur d'écran sans l'ajouter à l'historique. */
  function announceMessage(message) {
    context.announce.enqueue(message);
  }

  /** Annonce un message au lecteur d'écran ET l'ajoute à l'historique visible. */
  function pushMessage(message) {
    announceMessage(message);
    addToHistory(message);
  }

  /**
   * Annonce d'entrée de zone Historique : place le curseur sur le dernier message
   * et l'annonce, ou « aucun message » si l'historique est vide. La navigation
   * (flèches, Origine/Fin, cyclage) est gérée par historyNav.
   */
  function describeHistory() {
    if (refs.history.children.length === 0) return labels().noMessages;
    return historyNav.toLast();
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

  // a / Maj+A / d / Maj+D annoncent l'ESTIMATION (valeurs projetées à la
  // résolution du tour), pas l'état brut (qui vaut 0 tant que le tour n'est pas
  // résolu). Voir src/engine/estimator.js.
  function announceDuoAttack() {
    const r = resource('attack');
    say(`${format(r.display ?? '{value}', { value: estimator.get().duo.attack })} ${r.help ?? ''}`.trim());
  }

  function announceEnemyAttack() {
    const r = resource('enemyAttack');
    say(`${format(r.display ?? '{value}', { value: estimator.get().enemy.attack })} ${r.help ?? ''}`.trim());
  }

  function announceDuoDefense() {
    const r = resource('defense');
    say(`${format(r.display ?? '{value}', { value: estimator.get().duo.defense })} ${r.help ?? ''}`.trim());
  }

  function announceEnemyDefense() {
    const r = resource('enemyDefense');
    say(`${format(r.display ?? '{value}', { value: estimator.get().enemy.defense })} ${r.help ?? ''}`.trim());
  }

  function announceTurn() {
    const c = combatStrings();
    const types = c.combatType ?? {};
    const combatType = state.enemy.isBoss ? (types.boss ?? 'combat de boss') : (types.normal ?? 'combat');
    say(format(c.turnAnnounce ?? 'Tour {turn}, {combatType} contre {enemy}.', { turn: state.turn, combatType, enemy: enemyName() }));
  }

  function announcePower(index) {
    say(describeCellAt(index));
  }

  // --- Touches des zones -----------------------------------------------------

  // --- Manœuvre : sélection de la cible ----------------------------------------

  /**
   * Résout une clé pointée (ex. 'action.blocked.anchored') dans le pack de langue.
   * Retourne null si la clé ou le chemin n'existe pas.
   */
  function resolveKey(key) {
    return key?.split('.').reduce((obj, part) => obj?.[part], context.strings) ?? null;
  }

  /**
   * Ouvre le sélecteur de zone pour choisir la cible d'une manœuvre.
   * La source est déjà connue (zone sur laquelle le joueur a pressé Entrée).
   * @param {number} sourcePos  index 0–8 de la zone source
   */
  function openManeuverSelector(sourcePos) {
    if (activeSelector) activeSelector.close();

    const strings = context.strings;
    const srcName = powerName(state.board[sourcePos].power, strings);

    const resolver = createTargetingResolver({
      steps: [
        {
          targetType: 'area',
          label: format(
            strings?.maneuver?.selectTarget
              ?? 'Choose a zone to swap with {name}. Arrow keys, Enter to confirm, Escape to cancel.',
            { name: srcName },
          ),
          forbiddenPrefix: strings?.maneuver?.swapForbidden ?? 'Swap forbidden',
          initialPosition: sourcePos,
          getZoneState: (pos) => {
            if (pos === sourcePos) return {
              status: 'forbidden',
              label: strings?.maneuver?.selectedSource ?? 'Selected',
            };
            const { allowed, reason } = validateAction(state, createAction('swap_powers', {
              source: sourcePos, target: pos, data: { maxDistance: 1 },
            }));
            if (allowed) return { status: 'selectable' };
            if (reason === 'action.blocked.out_of_range') return { status: 'out_of_range' };
            const label = reason === 'action.blocked.anchored'
              ? (strings?.maneuver?.immovable ?? 'Immovable')
              : (strings?.maneuver?.swapForbidden ?? 'Swap forbidden');
            return { status: 'forbidden', label, sources: [reason] };
          },
        },
      ],
      resolveContext: { tdByIndex, announce: context.announce, strings, describeCell: describeCellAt },
      onComplete: ([targetPos]) => {
        activeSelector = null;
        boardKeyHandler = onBoardKey;
        const { x, y } = indexToXY(targetPos);
        boardX = x;
        boardY = y;
        const result = executeManeuver(state, sourcePos, targetPos);
        const resultMsg = result.success
          ? (strings?.maneuver?.swapDone ?? 'Swap done.')
          : (resolveKey(result.reason) ?? result.reason ?? '');
        updateView();
        say(`${resultMsg} ${describeCell()}`);
      },
      onCancel: () => {
        activeSelector = null;
        boardKeyHandler = onBoardKey;
        say(`${strings?.maneuver?.cancelled ?? 'Cancelled.'} ${describeCell()}`);
      },
    });

    activeSelector = resolver;
    boardKeyHandler = (e) => resolver.handleKey(e);
    controller.activate(2, { silent: true }); // zone Plateau = index 2
    resolver.start();
  }

  // --- Test de ciblage multi-étapes (Maj+S, debug) ----------------------------
  //
  // Séquence à deux étapes dépendantes :
  //   Étape 1 (area)  : choisir une zone occupée par un pouvoir.
  //   Étape 2 (list)  : choisir une zone ADJACENTE à celle de l'étape 1,
  //                     parmi celles qui contiennent elles aussi un pouvoir.
  // Vérifie : l'étape 2 ne propose que des cibles valides au regard de l'étape 1 ;
  //   Échap à l'étape 2 recule à l'étape 1 ; Échap à l'étape 1 annule tout.
  // Aucun effet de jeu appliqué, aucune ressource consommée.

  function openDebugTargetingTest() {
    if (activeSelector) activeSelector.close();

    const strings = context.strings;
    const t = strings?.targeting ?? {};

    const resolver = createTargetingResolver({
      steps: [
        {
          targetType:      'area',
          label:           t.debugStep1 ?? 'Debug targeting step 1/2: pick a zone with a power.',
          forbiddenPrefix: t.debugForbidden ?? 'No power',
          initialPosition: boardIndexAt(boardX, boardY),
          getZoneState: (pos) => (state.board[pos]?.power
            ? { status: 'selectable' }
            : { status: 'forbidden', label: t.debugForbidden ?? 'No power' }),
        },
        {
          targetType:  'list',
          label:       (collected) => format(
            t.debugStep2 ?? 'Debug targeting step 2/2: pick an adjacent zone.',
            { pos: collected[0] },
          ),
          autoSelect:  false,
          emptyLabel:  t.debugEmpty ?? 'No adjacent powers.',
          getItems:    (collected) => reachablePositions(collected[0], 1)
            .filter((p) => state.board[p]?.power)
            .map((p) => ({ pos: p, power: state.board[p].power })),
          describeItem: (item, strs) => `Zone ${item.pos} : ${powerName(item.power, strs)}`,
        },
      ],
      resolveContext: { tdByIndex, announce: context.announce, strings, describeCell: describeCellAt },
      onComplete: ([sourcePos, item]) => {
        activeSelector = null;
        boardKeyHandler = onBoardKey;
        say(format(t.debugDone ?? 'Debug done: {z1} then {z2}.', { z1: sourcePos, z2: item.pos }));
        updateView();
      },
      onCancel: () => {
        activeSelector = null;
        boardKeyHandler = onBoardKey;
        say(t.debugCancelled ?? 'Debug targeting test cancelled.');
      },
    });

    activeSelector = resolver;
    boardKeyHandler = (e) => resolver.handleKey(e);
    controller.activate(2, { silent: true }); // zone Plateau = index 2
    resolver.start();
  }

  // --- Stratégie : remplacement d'un pouvoir ------------------------------------

  /**
   * Ouvre le flux de sélection de stratégie pour la zone donnée.
   * Vérifie toutes les conditions avant d'ouvrir toute interface.
   * @param {number} sourcePos  index 0–8 de la zone source
   */
  // La stratégie s'exprime comme une séquence de ciblage à deux étapes dépendantes :
  //   Étape 1 (area) : sélectionner la zone dont le pouvoir sera remplacé.
  //     isValid utilise canUseStrategySource — même logique qu'avant.
  //   Étape 2 (list) : choisir le remplaçant dans la pioche filtrée par buildCandidates,
  //     dont le résultat dépend de la zone choisie à l'étape 1.
  // Le point de stratégie n'est consommé qu'en onComplete, après validation complète.

  function openStrategyUI(initialSourcePos) {
    const strings = context.strings;

    if (state.duo.strategy < 1) {
      say(strings?.strategy?.no_points ?? 'No strategy points.');
      return;
    }

    if (activeSelector) activeSelector.close();

    const resolver = createTargetingResolver({
      steps: [
        {
          targetType:      'area',
          label:           strings?.strategy?.selectSource
                             ?? 'Select a power to replace. Arrow keys, Enter to confirm, Escape to cancel.',
          forbiddenPrefix: strings?.strategy?.sourceForbidden ?? 'Cannot replace',
          initialPosition: initialSourcePos,
          getZoneState: (pos) => {
            const power = state.board[pos]?.power;
            if (!power) return {
              status: 'forbidden',
              label: strings?.strategy?.empty ?? 'No power in this area.',
            };
            const check = canUseStrategySource(state, power, pos);
            if (check.allowed) return { status: 'selectable' };
            const label = resolveKey(check.reason) ?? (strings?.strategy?.sourceForbidden ?? 'Cannot replace');
            return { status: 'forbidden', label, sources: check.sources };
          },
        },
        {
          targetType:  'list',
          label: (collected) => {
            const srcPower = state.board[collected[0]]?.power;
            return format(
              strings?.strategy?.pickTitle
                ?? 'Choose a replacement for {name}. Arrow keys, Enter to confirm, Escape to cancel.',
              { name: srcPower ? powerName(srcPower, strings) : '' },
            );
          },
          autoSelect:   true,
          emptyLabel:   strings?.strategy?.no_candidates ?? 'No replacement available.',
          getItems:     (collected) => buildCandidates(state, collected[0]),
          describeItem: (item, strs) => longDescription(item, strs),
        },
      ],
      resolveContext: { tdByIndex, announce: context.announce, strings, describeCell: describeCellAt },
      onComplete: ([sourcePos, chosenPower]) => {
        activeSelector = null;
        boardKeyHandler = onBoardKey;
        executeStrategy(state, sourcePos, chosenPower);
        const { x, y } = indexToXY(sourcePos);
        boardX = x;
        boardY = y;
        updateView();
        say(`${strings?.strategy?.done ?? 'Strategy applied.'} ${describeCell()}`);
      },
      onCancel: () => {
        activeSelector = null;
        boardKeyHandler = onBoardKey;
        say(strings?.strategy?.cancelled ?? 'Strategy cancelled.');
      },
    });

    activeSelector = resolver;
    boardKeyHandler = (e) => resolver.handleKey(e);
    controller.activate(2, { silent: true }); // zone Plateau = index 2
    resolver.start();
  }

  function onBoardKey(event) {
    const delta = ARROW_DELTAS[event.key];
    if (delta) {
      const nx = clamp(boardX + delta[0], 0, 2);
      const ny = clamp(boardY + delta[1], 0, 2);
      // Bord atteint : touche consommée mais aucun déplacement ni annonce.
      if (nx === boardX && ny === boardY) return true;
      boardX = nx;
      boardY = ny;
      applyBoardCursor();
      say(describeCell());
      return true;
    }

    if (event.key === 'Enter') {
      const currentIdx = boardIndexAt(boardX, boardY);
      const power = state.board[currentIdx]?.power;
      if (!power) return true; // zone vide — rien à faire
      if (!canStartManeuver(state)) {
        say(context.strings?.maneuver?.no_points ?? 'No maneuvers left.');
        return true;
      }
      if (!canManeuverFrom(state, currentIdx)) {
        say(context.strings?.maneuver?.immovable ?? 'Immovable');
        return true;
      }
      openManeuverSelector(currentIdx);
      return true;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      openStrategyUI(boardIndexAt(boardX, boardY));
      return true;
    }

    return false;
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

  /**
   * (Ré)affiche les signatures d'un camp dans son conteneur : une entrée par
   * signature sous forme de description longue, ou « Aucune signature. ». Reconstruit
   * à chaque tour pour rester dynamique (la description peut dépendre du contexte).
   */
  function renderPerks(container, perks) {
    if (!container) return;
    container.replaceChildren();
    if (!perks || perks.length === 0) {
      container.append(el('p', { textContent: labels().noSignature }));
      return;
    }
    for (const perk of perks) {
      container.append(el('p', { textContent: perkLongDescription(perk, context.strings, perk.descriptionData?.(state) ?? {}) }));
    }
  }

  /** Gabarit « {value} sur {max} points de vie » (repli si absent du pack). */
  function hpText(value, max) {
    return format(resource('hp').display ?? '{value}/{max}', { value, max });
  }

  /** Nom localisé d'un héros (repli sur son nameId). */
  function heroName(hero) {
    return context.strings?.heroes?.[hero.nameId] ?? hero.nameId;
  }

  function updateView() {
    const L = labels();
    const { duo, enemy } = state;

    // Ennemi : ligne 1 « nom, pv » ; ligne 2 « attaque, défense » ; signatures.
    refs.enemy.vitals.textContent = `${enemyName()}, ${hpText(enemy.hp, enemy.maxHp)}`;
    refs.enemy.combat.textContent = `${L.attack} ${enemy.attack}, ${L.defense} ${enemy.defense}`;
    renderPerks(refs.enemy.perks, enemy.perks);

    for (const [i, td] of tdByIndex) {
      const power = state.board[i].power;
      td.textContent = power ? powerName(power, context.strings) : L.empty;
    }

    // Duo : ligne 1 « noms, pv » ; ligne 2 « attaque, défense » ; ligne 3
    // « manœuvres, stratégies, crédit » ; signatures.
    const duoNames = state.heroes.map((hero) => heroName(hero)).join(` ${L.and} `);
    refs.duo.vitals.textContent = `${duoNames}, ${hpText(duo.hp, duo.maxHp)}`;
    refs.duo.combat.textContent = `${L.attack} ${duo.attack}, ${L.defense} ${duo.defense}`;
    refs.duo.resources.textContent =
      `${duo.maneuver} ${L.maneuvers}, ${duo.strategy} ${L.strategies}, ${duo.credit} ${L.credit}`;
    renderPerks(refs.duo.perks, duo.perks);

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

    context.announce.clearLog();
    const report = resolveTurn(state);

    // 1) Messages des pouvoirs activés, dans l'ordre de résolution.
    for (const message of turnMessages(report.activations, context.strings)) {
      pushMessage(message);
    }
    // 1b) Activations de signatures (perks) déclenchées pendant la résolution.
    for (const act of report.perkActivations ?? []) {
      pushMessage(perkActivationMessage(act, context.strings));
    }
    // 2) Messages de résolution (dégâts, défaite éventuelle puis arrêt).
    for (const message of resolutionMessages(report, enemyName(), context.strings)) {
      pushMessage(message);
    }

    // 3) Issue du combat.
    if (state.status === 'lost') {
      updateView();
      context.router.go('gameover'); // défaite → scène de game over
      return;
    }
    if (state.status === 'won') {
      estimator.invalidate();
      updateView();
      if (context.run) {
        // Victoire run-backed : stocker les crédits gagnés avant réécriture, puis scène victoire.
        const creditsEarned = state.duo.credit;
        applyVictoryToRun(context.run, state);
        context.lastVictory = { creditsEarned };
        context.router.go('victory');
      }
      return;
    }

    // 4) Tour suivant.
    startTurn(state);
    estimator.invalidate();
    pushMessage(turnStartMessage(state.turn, context.strings));
    updateView();
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

      const run = ctx.run;
      if (run) {
        // Combat run-backed : héros, PV et ennemi lus depuis la run.
        const enemy = getNextEnemy(run);
        state = initCombat({
          heroes:   run.heroes,
          enemy: {
            id:          enemy.id,
            nameId:      enemy.nameId,
            hp:          enemy.hp,
            maxHp:       enemy.hp,
            baseAttack:  enemy.attack,
            baseDefense: enemy.defense,
          },
          duoHp:    run.hp,
          duoMaxHp: run.maxHp,
        });
      } else {
        // Combat standalone (entrée « Combat test » sans run active).
        state = initCombat({
          heroes: HEROES.slice(0, 2),
          enemy: {
            id:          DUMMY_ENEMY.id,
            nameId:      DUMMY_ENEMY.nameId,
            hp:          DUMMY_ENEMY.hp,
            maxHp:       DUMMY_ENEMY.hp,
            baseAttack:  DUMMY_ENEMY.attack,
            baseDefense: DUMMY_ENEMY.defense,
          },
        });
      }
      startTurn(state);

      // Estimateur de résolution : lit le plateau / l'état de combat à la volée.
      estimator = createEstimator({
        getBoard: () => state.board,
        getCombatState: () => state,
      });

      boardKeyHandler = onBoardKey;
      buildView();
      context.root.replaceChildren(appEl);
      controller.mount(); // active la zone par défaut (plateau), focus seul
      updateView();

      // Annonce d'accueil : instructions + contenu de la zone active (plateau).
      const L = labels();
      say(`${L.instructions} ${controller.describeActive()}`);

      // Raccourcis globaux (fin de tour + annonces + emplacements 1–9 + Maj+S test).
      onKeydown = (event) => {
        // Maj+S : ouvre le test de ciblage multi-étapes (debug uniquement).
        if (event.key === 'S' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          openDebugTargetingTest();
          return;
        }
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
      estimator = null;
      state = null;
      context = null;
      actions = [];
      boardX = 0;
      boardY = 0;
      actionCursor = 0;
      activeSelector = null;
      boardKeyHandler = null;
      duoNav = null;
      enemyNav = null;
      historyNav = null;
    },
  };
}
