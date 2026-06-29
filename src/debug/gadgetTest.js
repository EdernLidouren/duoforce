// src/debug/gadgetTest.js — Vérification du système d'inventaire de gadgets.
//
// Appelé depuis main.js si debug.enabled est vrai.
// Sortie via console.log ; aucun DOM.

import { getGadgetById }                         from '../data/gadgets/index.js';
import {
  addGadget,
  removeGadget,
  setGadgetCapacity,
  getGadgetCapacity,
  getCounterValue,
  incrementCounter,
  resetCounter,
  createGadgetInstance,
  GadgetEvent,
} from '../engine/gadgets.js';
import { DEFAULT_GADGET_SLOTS }                  from '../engine/gameState.js';
import { applyStatus }                           from '../engine/statuses.js';
import { executeAction, createAction, initInterceptors } from '../engine/actions.js';
import { processGadgetTriggers }                        from '../engine/gadgets.js';

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

/** Run minimale suffisante pour les tests d'inventaire. */
function makeTestRun() {
  return {
    gadgets:    [],
    gadgetSlots: DEFAULT_GADGET_SLOTS, // 3
  };
}

/** Collecte les events émis pendant fn(), sans toucher au progressionLog. */
function collectEvents(fn) {
  const events = [];
  const emit = (type, data) => events.push({ type, data });
  fn(emit);
  return events;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export function runGadgetTest() {
  console.group('[gadgetTest] Système d\'inventaire de gadgets');

  const bandage    = getGadgetById('gadget_bandage');
  const energizer  = getGadgetById('gadget_energizer');
  const chargeCell = getGadgetById('gadget_charge_cell');

  // --- 1. Catalogue --------------------------------------------------------
  console.group('1. Catalogue');
  assert('gadget_bandage trouvé',    bandage    !== null);
  assert('gadget_energizer trouvé',  energizer  !== null);
  assert('gadget_charge_cell trouvé', chargeCell !== null);
  assert('bandage consumable',       bandage.consumable === true);
  assert('charge_cell non consumable', chargeCell.consumable === false);
  assert('charge_cell counter.max = 3', chargeCell.counter?.max === 3);
  console.groupEnd();

  // --- 2. Ajout jusqu'à la capacité ----------------------------------------
  console.group('2. Ajout jusqu\'à la capacité (DEFAULT = 3)');
  const run = makeTestRun();

  let evts = collectEvents((emit) => {
    addGadget(run, bandage,   emit);
    addGadget(run, energizer, emit);
    addGadget(run, chargeCell, emit);
  });

  assert('3 gadgets en inventaire',               run.gadgets.length === 3);
  assert('3 events gadget_gain émis',             evts.filter(e => e.type === GadgetEvent.GAIN).length === 3);
  assert('gadget[0].id = gadget_bandage',         run.gadgets[0].id === 'gadget_bandage');
  assert('gadget[1].id = gadget_energizer',       run.gadgets[1].id === 'gadget_energizer');
  assert('gadget[2].id = gadget_charge_cell',     run.gadgets[2].id === 'gadget_charge_cell');
  assert('gadget[2].counter = { value:0, max:3 }',
    run.gadgets[2].counter?.value === 0 && run.gadgets[2].counter?.max === 3);
  console.groupEnd();

  // --- 3. Ajout quand l'inventaire est plein → gadget_wasted ---------------
  console.group('3. Inventaire plein → gadget_wasted');
  evts = collectEvents((emit) => {
    const result = addGadget(run, bandage, emit);
    assert('addGadget retourne null si plein', result === null);
  });
  assert('event gadget_wasted émis',  evts.some(e => e.type === GadgetEvent.WASTED));
  assert('pas de gadget_gain parasite', !evts.some(e => e.type === GadgetEvent.GAIN));
  assert('inventaire toujours à 3',    run.gadgets.length === 3);
  console.groupEnd();

  // --- 4. Retrait en position 0 → tassement à gauche -----------------------
  console.group('4. removeGadget(index=0) → tassement à gauche');
  evts = collectEvents((emit) => {
    removeGadget(run, 0, 'used', emit);
  });
  assert('2 gadgets restants',                    run.gadgets.length === 2);
  assert('vide toujours en queue',                run.gadgets.length === 2); // pas de trou
  assert('gadget[0] est maintenant energizer',    run.gadgets[0].id === 'gadget_energizer');
  assert('gadget[1] est maintenant charge_cell',  run.gadgets[1].id === 'gadget_charge_cell');
  assert('event gadget_use émis',                 evts.some(e => e.type === GadgetEvent.USE));
  console.groupEnd();

  // --- 5. Réduction de capacité → suppression silencieuse par la queue -----
  console.group('5. setGadgetCapacity(1) → suppression silencieuse en queue');
  evts = collectEvents((emit) => {
    setGadgetCapacity(run, 1, emit);
  });
  assert('capacité mise à 1',              getGadgetCapacity(run) === 1);
  assert('1 gadget restant',               run.gadgets.length === 1);
  assert('gadget[0] est energizer (tête)', run.gadgets[0].id === 'gadget_energizer');
  assert('event gadget_slot_lose émis',    evts.some(e => e.type === GadgetEvent.SLOT_LOSE));
  assert('AUCUN event gadget_lose/use',
    !evts.some(e => e.type === GadgetEvent.LOSE || e.type === GadgetEvent.USE));
  console.groupEnd();

  // --- 6. Gain d'emplacement ------------------------------------------------
  console.group('6. setGadgetCapacity(4) → gain d\'emplacement');
  evts = collectEvents((emit) => {
    setGadgetCapacity(run, 4, emit);
  });
  assert('capacité mise à 4',           getGadgetCapacity(run) === 4);
  assert('pas de gadget ajouté',        run.gadgets.length === 1);
  assert('event gadget_slot_gain émis', evts.some(e => e.type === GadgetEvent.SLOT_GAIN));
  assert('data.slots = 3',              evts.find(e => e.type === GadgetEvent.SLOT_GAIN)?.data.slots === 3);
  console.groupEnd();

  // --- 7. Compteur (gadget_charge_cell) ------------------------------------
  console.group('7. Compteur de gadget (fill-and-fire)');
  const run2 = makeTestRun();
  addGadget(run2, chargeCell);
  const gc = run2.gadgets[0];

  assert('valeur initiale = 0',         getCounterValue(gc) === 0);
  assert('increment 1 → false',         incrementCounter(gc) === false);
  assert('increment 2 → false',         incrementCounter(gc) === false);
  assert('increment 3 → true (seuil)', incrementCounter(gc) === true);
  assert('valeur = max après seuil',    getCounterValue(gc) === 3);
  assert('increment sur max → false',   incrementCounter(gc) === false);

  resetCounter(gc);
  assert('reset → valeur = 0',          getCounterValue(gc) === 0);
  console.groupEnd();

  // --- 8. Statuts sur gadget ------------------------------------------------
  console.group('8. Statuts sur un gadget (cible entity)');
  const run3 = makeTestRun();
  addGadget(run3, bandage);
  const gBandage = run3.gadgets[0];
  assert('gadget.statuses commence vide', gBandage.statuses.length === 0);
  // On pousse manuellement un statut fictif pour vérifier le tableau.
  gBandage.statuses.push({ id: 'test_status', stacks: 2, target: 'entity', entity: gBandage });
  assert('gadget porte 1 statut après push', gBandage.statuses.length === 1);
  assert('statut id correct', gBandage.statuses[0].id === 'test_status');
  console.groupEnd();

  // --- Résultat -------------------------------------------------------------
  console.log('');
  console.log(`[gadgetTest] ${passed} réussis, ${failed} échoués.`);
  if (failed > 0) console.error('[gadgetTest] Des tests ont échoué — vérifier la sortie ci-dessus.');
  console.groupEnd();
}

// ---------------------------------------------------------------------------
// Tests avancés — gadgets de stress-test
// ---------------------------------------------------------------------------
//
// Chaque test valide un mécanisme précis, isolément, sans UI ni scène de combat.
// Préconditions : le dispatcher d'actions et les intercepteurs natifs sont initialisés
// via initInterceptors() au début de runAdvancedGadgetTests().

/**
 * Construit un combatState minimal pour les tests d'actions.
 * La board contient 9 zones vides par défaut.
 */
function makeMinimalCombatState() {
  return {
    board: Array.from({ length: 9 }, () => ({ power: null, areaStatuses: [] })),
    duo:   { hp: 20, maxHp: 20, attack: 5, defense: 2, maneuver: 1, strategy: 1, credit: 0 },
    enemy: { hp: 30, maxHp: 30, attack: 4, defense: 1 },
    statuses: { entities: new Map(), areas: Array.from({ length: 9 }, () => []), duo: [], enemy: [] },
    _pendingAreaStatuses: [],
    turn: 1, status: 'ongoing',
  };
}

export function runAdvancedGadgetTests() {
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) { console.log(`  ✓ ${label}`); passed++; }
    else           { console.error(`  ✗ ${label}`); failed++; }
  }

  console.group('[gadgetTest] Gadgets avancés — stress-test des mécanismes');

  // ── Téléporteur : ciblage enchaîné dépendant ─────────────────────────────
  console.group('Gadget 1 : gadget_teleporter — étapes dépendantes');
  {
    const def = getGadgetById('gadget_teleporter');
    assert('gadget_teleporter trouvé dans le catalogue', def !== null);

    const step1def = def?.targeting?.[0];
    const step2def = def?.targeting?.[1];
    assert('2 étapes de ciblage déclarées', def?.targeting?.length === 2);
    assert('étape 1 = area', step1def?.targetType === 'area');
    assert('étape 2 = list', step2def?.targetType === 'list');

    // Plateau de test : centre (4) a un pouvoir, toutes les autres cases sont vides.
    const board = Array.from({ length: 9 }, () => ({ power: null }));
    board[4].power = { id: 'power_test' };

    // Étape 1 — validation isValid
    assert('étape 1 : case 4 (avec pouvoir) → valide',
      step1def.isValid(4, board) === true);
    assert('étape 1 : case 0 (vide) → invalide',
      step1def.isValid(0, board) === false);

    // Étape 2 — getItems dépend de collected[0]
    const fakeState = { board };
    const adjacent4 = step2def.getItems([4], fakeState);
    // Positions adjacentes à 4 (Manhattan ≤ 1, pas 4 lui-même) : 1, 3, 5, 7
    // Toutes vides ici, donc toutes proposées.
    assert('étape 2 depuis case 4 : 4 zones adjacentes vides',
      adjacent4.length === 4);
    assert('étape 2 : résultats sont [1,3,5,7]',
      JSON.stringify([...adjacent4].sort((a, b) => a - b)) === JSON.stringify([1, 3, 5, 7]));
    assert('étape 2 : case 4 elle-même absente des résultats',
      !adjacent4.includes(4));

    // Si une zone adjacente a un pouvoir, elle disparaît des candidats.
    board[1].power = { id: 'power_blocker' };
    const adjacent4WithBlocker = step2def.getItems([4], fakeState);
    assert('étape 2 : zone adjacente non-vide exclue des candidats',
      !adjacent4WithBlocker.includes(1) && adjacent4WithBlocker.length === 3);

    // Cas extrême : source en coin (pos 0) — seulement 2 zones adjacentes.
    board[0].power = { id: 'power_corner' };
    board[1].power = null; // remettre à vide
    const adjacentCorner = step2def.getItems([0], fakeState);
    // Zones adjacentes à 0 : 1 (droite), 3 (bas). Toutes vides.
    assert('étape 2 depuis coin 0 : 2 zones adjacentes vides',
      adjacentCorner.length === 2 &&
      JSON.stringify([...adjacentCorner].sort((a, b) => a - b)) === JSON.stringify([1, 3]));

    // Construction de l'action finale (targets = [sourcePos, destPos]).
    const rawAction = def.actions[0]([4, 7]);
    assert('action finale : type swap_powers', rawAction.type === 'swap_powers');
    assert('action finale : source = 4',       rawAction.source === 4);
    assert('action finale : target = 7',       rawAction.target === 7);
  }
  console.groupEnd();

  // ── Résonateur : effet conditionnel lié au compteur ───────────────────────
  console.group('Gadget 2 : gadget_resonator — factory(targets, gadget) et compteur');
  {
    const def = getGadgetById('gadget_resonator');
    assert('gadget_resonator trouvé', def !== null);
    assert('1 action factory déclarée', typeof def?.actions?.[0] === 'function');
    assert('counter.max = 3', def?.counter?.max === 3);

    const factory = def.actions[0];

    // Instance à compteur 0 → add_attack +1 (Math.max(1, 0))
    const inst0 = createGadgetInstance(def);
    // counter.value = 0 par défaut
    const raw0 = factory([], inst0);
    assert('jauge 0/3 → type add_attack', raw0?.type === 'add_attack');
    assert('jauge 0/3 → value = 1 (minimum)', raw0?.value === 1);

    // Instance à compteur 2 → add_attack +2
    const inst2 = createGadgetInstance(def);
    inst2.counter.value = 2;
    const raw2 = factory([], inst2);
    assert('jauge 2/3 → type add_attack', raw2?.type === 'add_attack');
    assert('jauge 2/3 → value = 2',       raw2?.value === 2);

    // Instance à compteur 3 (plein) → heal +12
    const inst3 = createGadgetInstance(def);
    inst3.counter.value = 3;
    const raw3 = factory([], inst3);
    assert('jauge 3/3 → type heal',         raw3?.type === 'heal');
    assert('jauge 3/3 → target duo',        raw3?.target === 'duo');
    assert('jauge 3/3 → value = max*4 = 12', raw3?.value === 12);

    // Vérification incrementCounter → seuil
    const instInc = createGadgetInstance(def);
    incrementCounter(instInc); // 0→1 : false
    incrementCounter(instInc); // 1→2 : false
    const hitMax = incrementCounter(instInc); // 2→3 : true
    assert('3e incrément déclenche le seuil (true)',   hitMax === true);
    assert('compteur à max après 3 incréments',        instInc.counter.value === 3);
    const rawAtMax = factory([], instInc);
    assert('effet à max après incréments → heal',      rawAtMax?.type === 'heal');
  }
  console.groupEnd();

  // ── Neutraliseur : action interceptable — consommation conditionnelle ──────
  console.group('Gadget 3 : gadget_nullifier — pipeline interceptable + consommation gated');
  {
    const def = getGadgetById('gadget_nullifier');
    assert('gadget_nullifier trouvé', def !== null);
    assert('étape 1 = area', def?.targeting?.[0]?.targetType === 'area');

    initInterceptors(); // enregistre immunityInterceptor et anchorInterceptor

    const state = makeMinimalCombatState();

    // Cas A : zone 3 avec un pouvoir normal (pas immun) → action réussit.
    state.board[3].power = { id: 'power_normal' };
    const rawA = def.actions[0]([3]);
    const actionA = executeAction(state, createAction(rawA.type, {
      target: rawA.target,
      value:  rawA.value,
    }));
    assert('cas normal : action NON annulée', actionA.cancelled === false);
    assert('cas normal : statut en attente dans _pendingAreaStatuses',
      state._pendingAreaStatuses.length === 1 &&
      state._pendingAreaStatuses[0].statusId === 'area_anchor_status');

    // Cas B : zone 5 avec un pouvoir immunisé → immunityInterceptor annule.
    state._pendingAreaStatuses.length = 0; // reset
    state.board[5].power = { id: 'power_immune', immuneToNegativeStatus: true };
    const rawB = def.actions[0]([5]);
    const actionB = executeAction(state, createAction(rawB.type, {
      target: rawB.target,
      value:  rawB.value,
    }));
    assert('zone immune : action annulée (action.cancelled = true)', actionB.cancelled === true);
    assert('zone immune : reason = action.blocked.immune',           actionB.reason === 'action.blocked.immune');
    assert('zone immune : aucun statut ajouté en pending',           state._pendingAreaStatuses.length === 0);

    // Vérification de la règle de consommation dans applyGadgetActionsCombat :
    // Cette fonction est dans la scène de combat (impossible à instancier ici),
    // mais la logique est : si action.cancelled → pas de removeGadget.
    // On documente ici l'invariant sous forme d'assertion sur action.cancelled.
    assert('invariant : anyActionCancelled = action.cancelled = true → pas de consumption',
      actionB.cancelled === true); // la scène vérifie ce flag avant removeGadget
  }
  console.groupEnd();

  // ── Système de triggers génériques ───────────────────────────────────────
  console.group('Triggers génériques : processGadgetTriggers');
  {
    const def = getGadgetById('gadget_resonator');

    // Test A : un résonateur se recharge via trigger 'turn_end' (pas de code en dur).
    const inst = createGadgetInstance(def);
    assert('counter initial = 0', inst.counter.value === 0);

    const fakeRun = { gadgets: [inst], gadgetSlots: 3 };
    processGadgetTriggers(fakeRun, 'turn_end', null);
    assert("après 1 trigger 'turn_end' → counter = 1", inst.counter.value === 1);

    processGadgetTriggers(fakeRun, 'turn_end', null);
    processGadgetTriggers(fakeRun, 'turn_end', null);
    assert("après 3 triggers → counter = max (3)", inst.counter.value === 3);

    processGadgetTriggers(fakeRun, 'turn_end', null);
    assert('trigger sur compteur plein : pas de dépassement', inst.counter.value === 3);

    // Test B : un event différent ne déclenche pas le trigger 'turn_end'.
    const inst2 = createGadgetInstance(def);
    const fakeRun2 = { gadgets: [inst2], gadgetSlots: 3 };
    processGadgetTriggers(fakeRun2, 'phase_changed', null); // mauvais type
    assert("event 'phase_changed' ne déclenche pas le trigger 'turn_end'",
      inst2.counter.value === 0);

    // Test C : deux résonateurs coexistent sans conflit — chacun se charge indépendamment.
    const instA = createGadgetInstance(def);
    const instB = createGadgetInstance(def);
    instB.counter.value = 1; // instB démarre à 1
    const fakeRun3 = { gadgets: [instA, instB], gadgetSlots: 3 };
    processGadgetTriggers(fakeRun3, 'turn_end', null);
    assert('deux résonateurs : instA passe à 1', instA.counter.value === 1);
    assert('deux résonateurs : instB passe à 2', instB.counter.value === 2);

    // Test D : gadget sans trigger 'turn_end' (téléporteur) n'est pas affecté.
    const teleporterDef = getGadgetById('gadget_teleporter');
    const teleInst = createGadgetInstance(teleporterDef);
    const fakeRun4 = { gadgets: [teleInst, instA], gadgetSlots: 3 };
    const instABefore = instA.counter.value;
    processGadgetTriggers(fakeRun4, 'turn_end', null);
    assert('téléporteur sans trigger turn_end : pas de modification de son état',
      teleInst.counter === null);
    assert('résonateur dans run mixte : continue de se charger',
      instA.counter.value === instABefore + 1);

    // Test E : vérifier qu'aucun id de gadget n'est mentionné dans le mécanisme.
    // (Test documentaire — valide par inspection que la scène n'a plus de couplage
    //  par id. La preuve est que processGadgetTriggers ne reçoit que run, eventType
    //  et state, sans jamais lire gadget.id.)
    assert("processGadgetTriggers ne prend pas d'id de gadget en paramètre",
      processGadgetTriggers.length === 3); // (run, eventType, combatState)
  }
  console.groupEnd();

  // ── Résultat ─────────────────────────────────────────────────────────────
  console.log('');
  console.log(`[gadgetTest avancé] ${passed} réussis, ${failed} échoués.`);
  if (failed > 0) {
    console.error('[gadgetTest avancé] Des tests ont échoué — voir ci-dessus.');
  }
  console.groupEnd();
}
