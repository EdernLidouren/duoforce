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
  GadgetEvent,
} from '../engine/gadgets.js';
import { DEFAULT_GADGET_SLOTS } from '../engine/gameState.js';
import { applyStatus }          from '../engine/statuses.js';

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
