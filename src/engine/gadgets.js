// src/engine/gadgets.js — Modèle et inventaire de gadgets.
//
// L'inventaire est une LISTE COMPACTE SANS TROU (run.gadgets) associée à une
// capacité (run.gadgetSlots). Le vide est toujours en queue ; les gadgets ne se
// stackent jamais (chaque entrée est une instance distincte).
//
// Règles d'inventaire :
//   addGadget         — si plein, drop silencieux + event gadget_wasted
//   removeGadget      — tassement à gauche après retrait, event approprié
//   setGadgetCapacity — si capacité < gadgets détenus, suppression par la queue
//                       SANS event (silencieux total — en game design on évitera
//                       de faire perdre un slot, mais le code ne l'interdit pas)
//
// Compteur de gadget :
//   Stocké dans l'instance (gadget.counter = { value, max }) pour persister entre
//   combats — contrairement à createEffectCounter qui stocke dans combatState.
//   Même interface conceptuelle : getValue / increment (retourne true si seuil
//   atteint) / reset.
//   La condition d'usage (ex. jauge pleine) est déclarée dans les actions du
//   gadget, pas dans le moteur — aucune règle globale imposée ici.
//
// Events : émis dans le journal de progression via emitProgressionEvent.
// Les fonctions d'usage en combat (prompts 2 et 3) recevront un emitFn et
// émettront aussi via emitEvent(combatState, ...) pour le journal de tour.
//
// Aucun DOM.

import { DEFAULT_GADGET_SLOTS } from './gameState.js';
import { emitProgressionEvent }  from './events.js';
import { getGadgetById }         from '../data/gadgets/index.js';

// ---------------------------------------------------------------------------
// Types d'events
// ---------------------------------------------------------------------------

/** Types d'events émis par le système d'inventaire de gadgets. */
export const GadgetEvent = Object.freeze({
  GAIN:      'gadget_gain',       // gadget ajouté à l'inventaire
  LOSE:      'gadget_lose',       // gadget retiré (perte ou destruction)
  USE:       'gadget_use',        // gadget activé (implique LOSE si consumable)
  SLOT_GAIN: 'gadget_slot_gain',  // emplacement gagné (capacité augmentée)
  SLOT_LOSE: 'gadget_slot_lose',  // emplacement perdu (capacité réduite)
  PURCHASE:  'gadget_purchase',   // gadget acheté au magasin
  SELL:      'gadget_sell',       // gadget vendu
  WASTED:    'gadget_wasted',     // gadget obtenu alors que l'inventaire est plein
});

// ---------------------------------------------------------------------------
// Création d'instance
// ---------------------------------------------------------------------------

/**
 * Crée une instance vivante de gadget depuis une définition catalogue.
 * L'instance est un objet mutable autonome : état counter (value) et statuses.
 * Les actions sont copiées par référence depuis le catalogue (fonctions).
 *
 * @param {object} def  Définition catalogue (getGadgetById).
 * @returns {object}    Instance gadget.
 */
export function createGadgetInstance(def) {
  return {
    id:         def.id,
    trigger:    def.trigger    ?? 'manual',
    consumable: def.consumable ?? true,
    usableIn:   def.usableIn  ?? 'both',
    actions:    def.actions    ?? [],
    // targeting : copiée par référence depuis le catalogue (fonctions, non sérialisées).
    targeting:  def.targeting  ?? null,
    // triggers : tableau de { on, fn } par référence (fonctions, non sérialisés).
    // Même règle que actions/targeting : omis en sérialisation, rechargés depuis le catalogue.
    triggers:   def.triggers   ?? [],
    // Compteur : { value: 0, max } si déclaré dans le catalogue, null sinon.
    counter:    def.counter ? { value: 0, max: def.counter.max } : null,
    statuses:   [],
  };
}

// ---------------------------------------------------------------------------
// Compteur de gadget
// ---------------------------------------------------------------------------
//
// Même interface que createEffectCounter, mais stocké dans l'instance pour
// persister entre les combats (run-persistent, pas combat-local).

/**
 * Valeur courante du compteur, ou 0 si le gadget n'en a pas.
 * @param {object} gadget
 * @returns {number}
 */
export function getCounterValue(gadget) {
  return gadget.counter?.value ?? 0;
}

/**
 * Incrémente le compteur. Retourne true si le seuil max est atteint (signal
 * pour déclencher l'effet — c'est au gadget d'agir en conséquence), false sinon.
 * Sans effet si le compteur est absent ou déjà au max.
 * @param {object} gadget
 * @returns {boolean}
 */
export function incrementCounter(gadget) {
  const c = gadget.counter;
  if (!c) return false;
  if (c.value >= c.max) return false;
  c.value++;
  return c.value >= c.max;
}

/**
 * Remet le compteur à 0.
 * @param {object} gadget
 */
export function resetCounter(gadget) {
  if (gadget.counter) gadget.counter.value = 0;
}

// ---------------------------------------------------------------------------
// Capacité de l'inventaire
// ---------------------------------------------------------------------------

/**
 * Retourne la capacité courante de l'inventaire.
 * @param {object} run
 * @returns {number}
 */
export function getGadgetCapacity(run) {
  return run.gadgetSlots ?? DEFAULT_GADGET_SLOTS;
}

// ---------------------------------------------------------------------------
// Ajout
// ---------------------------------------------------------------------------

/**
 * Tente d'ajouter un gadget à l'inventaire de la run.
 *
 * - Si l'inventaire est plein : drop silencieux + event gadget_wasted.
 * - Sinon : ajout en queue + event gadget_gain.
 *
 * Toutes les sources d'obtention (achat, récompense, effet de pouvoir, etc.)
 * passent par cette fonction.
 *
 * @param {object}   run       Run vivante.
 * @param {object}   def       Définition catalogue (résultat de getGadgetById).
 * @param {Function} [emitFn]  (type, data) => void. Par défaut : emitProgressionEvent.
 *   Passer emitEvent.bind(null, combatState) depuis un contexte de combat.
 * @returns {object|null}  Instance ajoutée, ou null si gaspillée (inventaire plein).
 */
export function addGadget(run, def, emitFn) {
  const emit     = emitFn ?? ((type, data) => emitProgressionEvent(type, data));
  const capacity = getGadgetCapacity(run);

  if (run.gadgets.length >= capacity) {
    emit(GadgetEvent.WASTED, { id: def.id });
    return null;
  }

  const instance = createGadgetInstance(def);
  run.gadgets.push(instance);
  emit(GadgetEvent.GAIN, { id: instance.id });
  return instance;
}

// ---------------------------------------------------------------------------
// Retrait
// ---------------------------------------------------------------------------

/**
 * Retire un gadget de l'inventaire à l'index donné et tasse les gadgets restants
 * vers la gauche (le vide reste toujours en queue).
 *
 * @param {object}   run
 * @param {number}   index   Index dans run.gadgets (0-indexé).
 * @param {'used'|'lost'|'sold'} [reason='lost']
 * @param {Function} [emitFn]  (type, data) => void. Par défaut : emitProgressionEvent.
 * @returns {object|null}  Instance retirée, ou null si l'index est invalide.
 */
export function removeGadget(run, index, reason = 'lost', emitFn) {
  const emit = emitFn ?? ((type, data) => emitProgressionEvent(type, data));
  if (index < 0 || index >= run.gadgets.length) return null;

  // splice compacte automatiquement le tableau (tassement à gauche natif).
  const [removed] = run.gadgets.splice(index, 1);

  const type = reason === 'used' ? GadgetEvent.USE
             : reason === 'sold' ? GadgetEvent.SELL
             : GadgetEvent.LOSE;
  emit(type, { id: removed.id, index });
  return removed;
}

// ---------------------------------------------------------------------------
// Capacité : gain et perte d'emplacement
// ---------------------------------------------------------------------------

/**
 * Modifie la capacité de l'inventaire.
 *
 * - Si elle augmente : émet gadget_slot_gain, aucun gadget ajouté.
 * - Si elle diminue et des gadgets dépassent la nouvelle capacité : suppression
 *   par la queue SANS event (silencieux total — voir docs/gadget-system.md).
 *   L'event gadget_slot_lose est quand même émis pour la variation de capacité.
 * - Si elle est inchangée : aucune action, aucun event.
 *
 * @param {object}   run
 * @param {number}   newCapacity
 * @param {Function} [emitFn]
 */
export function setGadgetCapacity(run, newCapacity, emitFn) {
  const emit     = emitFn ?? ((type, data) => emitProgressionEvent(type, data));
  const current  = getGadgetCapacity(run);
  const capacity = Math.max(0, newCapacity);

  if (capacity === current) return;

  run.gadgetSlots = capacity;

  if (capacity > current) {
    emit(GadgetEvent.SLOT_GAIN, { slots: capacity - current, total: capacity });
  } else {
    // Suppression silencieuse par la queue (sans event de perte de gadget).
    while (run.gadgets.length > capacity) {
      run.gadgets.pop();
    }
    emit(GadgetEvent.SLOT_LOSE, { slots: current - capacity, total: capacity });
  }
}

// ---------------------------------------------------------------------------
// Sérialisation (utilisé par run.js)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Triggers d'event (système générique)
// ---------------------------------------------------------------------------
//
// Un trigger de gadget déclare : { on: string, fn: (gadget, combatState) => void }
//   on  — type d'event auquel réagir (ex. 'turn_end', 'phase_changed', …)
//   fn  — fonction exécutée avec l'instance vivante du gadget et l'état de combat.
//         Libre de modifier gadget.counter, gadget.statuses, voire combatState.
//
// Alignement avec les statuts/perks :
//   statuts  → processTurnEnd(state)          appelle onTurnEnd(status)
//   perks    → processPerksTurnEnd(state)      appelle perk.onTurnEnd(state, ctx, owner)
//   gadgets  → processGadgetTriggers(run, on, state)  appelle trigger.fn(gadget, state)
//
// Aucune référence à un id de gadget ici — chaque gadget déclare ses propres réactions.

/**
 * Parcourt l'inventaire et exécute les triggers dont `on` correspond à `eventType`.
 * À appeler aux moments pertinents depuis la scène de combat (endTurn, etc.).
 *
 * @param {object} run         Run vivante (contient run.gadgets).
 * @param {string} eventType   Type d'event (ex. 'turn_end').
 * @param {object} combatState État de combat courant.
 */
export function processGadgetTriggers(run, eventType, combatState) {
  const gadgets = run?.gadgets;
  if (!Array.isArray(gadgets)) return;
  for (const gadget of gadgets) {
    for (const t of (gadget.triggers ?? [])) {
      if (t.on === eventType && typeof t.fn === 'function') {
        t.fn(gadget, combatState);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Sérialisation (utilisé par run.js)
// ---------------------------------------------------------------------------

/**
 * Produit un save object JSON-safe depuis une instance de gadget.
 * Sérialise l'état mutable (counter.value, statuses) ; les actions et triggers
 * (fonctions) sont omis et rechargés depuis le catalogue à la désérialisation.
 *
 * @param {object} gadget
 * @returns {object}
 */
export function serializeGadget(gadget) {
  return {
    id:         gadget.id,
    consumable: gadget.consumable,
    usableIn:   gadget.usableIn,
    counter:    gadget.counter
      ? { value: gadget.counter.value, max: gadget.counter.max }
      : null,
    statuses: (gadget.statuses ?? []).map((s) => ({ ...s })),
  };
}

/**
 * Reconstruit une instance de gadget depuis un save object.
 * Fusionne l'état sauvegardé (mutable) avec la définition catalogue (immutable,
 * inclut les actions). Retourne null si l'id n'est plus dans le catalogue.
 *
 * @param {object} saved
 * @returns {object|null}
 */
export function deserializeGadget(saved) {
  const def = getGadgetById(saved.id);
  if (!def) return null; // gadget retiré du catalogue entre deux sessions
  return {
    ...def,                                               // actions, targeting, triggers fraîches du catalogue
    consumable: saved.consumable ?? def.consumable,
    usableIn:   saved.usableIn   ?? def.usableIn,
    counter:    saved.counter
      ? { value: saved.counter.value ?? 0, max: saved.counter.max }
      : (def.counter ? { value: 0, max: def.counter.max } : null),
    statuses:   (saved.statuses ?? []).map((s) => ({ ...s })),
  };
}
