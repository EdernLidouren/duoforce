# Gadget System

## Overview

Gadgets are manually-triggered items that the player carries during a run. They
share the common effect-object base (action system, status support) and are
distinguished from powers and signatures by their specific inventory and usage
properties.

The gadget system is split across three prompts:

| Prompt | Scope |
|--------|-------|
| **1 — Data layer** | Model, inventory, events — no usage interface |
| **2 — Hub usage** ✓ | Listing and using gadgets from the secret base |
| **3 — Combat usage** | Listing and using gadgets during combat turns |

---

## Gadget model

### Catalog definition (`src/data/gadgets/index.js`)

Each catalog entry is immutable. Instance state lives in the run.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | — | Unique identifier |
| `trigger` | `'manual'`\|`'passive'` | `'manual'` | Trigger mode. `'manual'` is the design default; passive effects are not prohibited by the engine — they are a game-design constraint. |
| `consumable` | boolean | `true` | Whether the gadget is removed from inventory after use. |
| `usableIn` | `'hub'`\|`'combat'`\|`'both'` | `'both'` | Declares where usage has an effect. The inventory remains visible everywhere; this field is enforced by the usage interface (prompts 2 and 3). |
| `actions` | array | `[]` | Effects to execute on use — same action system as powers. |
| `counter` | `{ max: number }` \| `null` | `null` | Declares the counter and its maximum. Only the definition (`max`) lives here; the live state (`value`) is in the instance. |

### Live instance (`run.gadgets[]`)

Each element in `run.gadgets` is a live instance created by `createGadgetInstance(def)`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Same as the catalog id |
| `trigger` | string | Copied from def |
| `consumable` | boolean | Copied from def (mutable — a perk could change it) |
| `usableIn` | string | Copied from def (mutable) |
| `actions` | array | Reference to catalog actions (functions, not serialized) |
| `counter` | `{ value, max }` \| `null` | Live counter state. `value` starts at 0. |
| `statuses` | array | Status instances with `target: 'entity'` and `entity: gadget`. |

Gadgets never stack — every slot is a distinct instance.

---

## Counter

The gadget counter is stored **in the instance**, not in `combatState`, so it
persists across combats (it is a run-persistent state, not a combat-local one).

This differs from `createEffectCounter` (which stores in `combatState.perkCounters`
and resets between combats). The interface is the same:

```js
import { getCounterValue, incrementCounter, resetCounter } from '../engine/gadgets.js';

getCounterValue(gadget)    // → number (0 if no counter)
incrementCounter(gadget)   // → true when max reached, false otherwise
resetCounter(gadget)       // resets value to 0
```

**No global rule is imposed on counter conditions.** The gadget declares in its
`actions` whether a full gauge (or any other state) is required to trigger its
effect. The engine enforces nothing. Example pattern in an action:

```js
// Inside a gadget's action:
canUse: (gadget) => gadget.counter?.value >= gadget.counter?.max,
```

---

## Inventory

### Storage

```
run.gadgets     — compact array of live instances (no gaps)
run.gadgetSlots — current capacity (integer)
```

The default capacity is `DEFAULT_GADGET_SLOTS = 3` from `src/engine/gameState.js`.
Capacity can later be modified by talents, shop upgrades, or other effects via
`setGadgetCapacity`.

### Compact list invariant

The inventory is always left-packed: **no gaps, empty slots are always at the
right end** (conceptually). In practice `run.gadgets` is just an array that is
never longer than `run.gadgetSlots`, so there are no explicit empty slots.

Gadgets are always added to the end (`push`) and removed via `splice` (which
auto-compacts). No slot is ever left `null` or `undefined`.

---

## API (`src/engine/gadgets.js`)

### `createGadgetInstance(def) → instance`

Creates a live gadget from a catalog definition. Called internally by `addGadget`.

### `addGadget(run, def, emitFn?) → instance | null`

Adds a gadget to the inventory.

- **Full inventory**: silent drop, emits `gadget_wasted`, returns `null`.
- **Room available**: appends to the end, emits `gadget_gain`, returns the new instance.

All sources of gadget acquisition (shop purchase, power effects, combat rewards,
signatures, …) must call `addGadget`. Never push directly to `run.gadgets`.

### `removeGadget(run, index, reason?, emitFn?) → instance | null`

Removes the gadget at `index`, compacts the array (left-shift via `splice`),
and emits the appropriate event.

| `reason` | Event emitted |
|----------|---------------|
| `'used'` | `gadget_use` |
| `'sold'` | `gadget_sell` |
| `'lost'` (default) | `gadget_lose` |

Returns the removed instance, or `null` if the index is out of range.

### `setGadgetCapacity(run, newCapacity, emitFn?)`

Changes the inventory capacity.

- **Increase**: emits `gadget_slot_gain` with `{ slots, total }`. No gadget added.
- **Decrease**: silently removes gadgets from the **tail** (rightmost, most
  recently added) until `run.gadgets.length ≤ newCapacity`. **No gadget event
  is emitted for these removals** — this is intentional (see design note below).
  Then emits `gadget_slot_lose` with `{ slots, total }`.
- **Unchanged**: no action, no event.

### `getGadgetCapacity(run) → number`

Returns `run.gadgetSlots ?? DEFAULT_GADGET_SLOTS`.

### Counter helpers

```js
getCounterValue(gadget)  → number
incrementCounter(gadget) → boolean   // true = threshold reached
resetCounter(gadget)
```

---

## Events (`src/engine/events.js` — `emitProgressionEvent`)

All inventory events are emitted into the **progression log** (never into the
turn or combat log — those belong to combat, not to run-level operations). Usage
events in combat (prompts 2 and 3) additionally go through `emitEvent(combatState,
…)` to appear in the turn log.

| Event constant | String | `data` fields | Emitted by |
|----------------|--------|---------------|------------|
| `GadgetEvent.GAIN` | `'gadget_gain'` | `{ id }` | `addGadget` (success) |
| `GadgetEvent.LOSE` | `'gadget_lose'` | `{ id, index }` | `removeGadget('lost')` |
| `GadgetEvent.USE` | `'gadget_use'` | `{ id, index }` | `removeGadget('used')` |
| `GadgetEvent.SELL` | `'gadget_sell'` | `{ id, index }` | `removeGadget('sold')` |
| `GadgetEvent.WASTED` | `'gadget_wasted'` | `{ id }` | `addGadget` (full) |
| `GadgetEvent.SLOT_GAIN` | `'gadget_slot_gain'` | `{ slots, total }` | `setGadgetCapacity` (increase) |
| `GadgetEvent.SLOT_LOSE` | `'gadget_slot_lose'` | `{ slots, total }` | `setGadgetCapacity` (decrease) |
| `GadgetEvent.PURCHASE` | `'gadget_purchase'` | `{ id }` | Shop (future) |

### Silent tail removal

When capacity is reduced below the current gadget count, gadgets are destroyed
from the tail **without emitting any event** (not even `gadget_lose`). This is a
deliberate design decision: in practice, slot loss from capacity reduction should
be rare and not observable by reactive effects. A `gadget_slot_lose` event is
still emitted for the capacity change itself.

---

## Statuses on gadgets

A gadget can carry statuses, exactly like any other entity. The status engine
uses `target: 'entity'` with `entity: gadget` as the entity reference. The
gadget's `statuses` array holds the live instances.

```js
// Apply a status to a gadget via the status engine:
applyStatus(combatState, {
  id:     'some_status',
  stacks: 1,
  target: 'entity',
  entity: gadget,
});

// Read statuses:
import { getEntityStatuses, hasEntityStatus } from '../engine/statuses.js';
getEntityStatuses(combatState, gadget);
hasEntityStatus(combatState, gadget, 'some_status');
```

---

## Serialization

`run.js` serializes the full instance state via `serializeGadget` /
`deserializeGadget` from `gadgets.js`.

**Serialized fields** (JSON-safe):
```json
{
  "id":         "gadget_charge_cell",
  "consumable": false,
  "usableIn":   "both",
  "counter":    { "value": 2, "max": 3 },
  "statuses":   []
}
```

**On deserialize**: catalog is looked up by id (fresh `actions` functions are
merged in). If the id is no longer in the catalog, the gadget is silently
dropped (`.filter(Boolean)` in `run.js`). `gadgetSlots` is also persisted
alongside `gadgets`.

---

## Hub usage interface (Prompt 2)

### Files

| File | Role |
|------|------|
| `src/ui/GadgetInventoryWidget.js` | Reusable widget (hub + combat) |
| `src/engine/actions.js` | Added `heal` action type |
| `src/scenes/runHub.js` | Refactored to two zones |

### `GadgetInventoryWidget`

```js
import { createGadgetInventoryWidget } from '../ui/GadgetInventoryWidget.js';

const widget = createGadgetInventoryWidget({
  container,    // HTMLElement — host element (the gadget zone)
  run,          // live run object
  usageContext, // 'hub' | 'combat'
  strings,      // language pack
  announce,     // { polite, assertive }
  onAfterUse,   // optional callback (e.g. saveProfileToLocal)
});

widget.mount();
widget.unmount();
widget.focus();                   // zone.focus — moves DOM focus
widget.handleKey(event);          // zone.onKey — returns true if consumed
widget.getSummary();              // zone.onEnter — "{n}/{capacity} gadgets"
widget.refresh();                 // re-render if run.gadgets changed externally
widget.element;                   // root HTMLElement
```

**Navigation keys** (consumed by `handleKey`):

| Key | Action |
|-----|--------|
| `ArrowLeft` / `ArrowRight` | Move cursor between slots |
| `Home` / `End` | First / last slot |
| `Enter` | Open sub-menu (or announce "no action") |
| `Backspace` | Announce zone summary |

**Sub-menu**: opens only when the gadget is usable in the current context. If the
slot is empty or the gadget's `usableIn` does not match the context, announces
`strings.gadgets.noAction` instead.

### Shared exported functions

```js
import {
  isGadgetUsableInContext,  // (gadget, 'hub'|'combat') → boolean
  describeGadget,           // (gadget, usageContext, strings) → string
  applyGadgetInHub,         // (gadget, run, strings) → string[] (effect labels)
} from '../ui/GadgetInventoryWidget.js';
```

`describeGadget` format: `Name[, not usable here][, charge value/max][, status A, status B]`

`applyGadgetInHub` handles `action.type === 'heal'` targeting `'duo'`. Other
action types (combat-only) are ignored by this function — they will be dispatched
via `executeAction(combatState, action)` in Prompt 3.

### `heal` action type

Added to `src/engine/actions.js`:

```js
{ type: 'heal', target: 'duo', value: 5 }
```

Heals the target up to `subject.maxHp`. Works both in `applyGadgetInHub` (hub,
no combatState) and in the combat dispatcher (`case 'heal': execHeal(...)`).

### Zone controller integration (runHub)

The hub is now a two-zone interface. `Tab` / `Shift+Tab` cycles between:
- Zone 0 — hub LinearMenu (mounted in `menuZoneEl`)
- Zone 1 — gadget widget (mounted in `gadgetZoneEl`)

Both zone containers are children of `ctx.root`. The zone controller listens on
`ctx.root` (`role="application"`).

When a SubMenu is opened (Duo, Deck, Power detail), `disposeAll()` tears down the
zone controller, widget, and zone containers before mounting the SubMenu directly
into `ctx.root`. `mountHub()` rebuilds everything on return.

### Tab-stopper

When the gadget widget's own SubMenu is open, a `keydown` listener on
`gadgetZoneEl` calls `event.stopPropagation()` on `Tab`, preventing the zone
controller from cycling zones while the sub-menu is active.

### Debug pre-fill

When `debug.enabled` and `run.gadgets.length === 0`, `mountHub()` adds:
- `gadget_bandage` — hub-usable, consumable, heal +5
- `gadget_medkit` — hub-usable, consumable, heal +15
- `gadget_energizer` — combat-only (visible but "no action" at hub)

This fills the three default slots and exercises: navigation, usable sub-menu,
"no action" on combat-only gadget, consumption and left-compaction.

### Language pack keys added

Under `strings.gadgets`:

| Key | Purpose |
|-----|---------|
| `zoneName` | Zone label (announced on Tab) |
| `emptySlot` | `'slot {n} empty'` |
| `summary` | `'{count}/{capacity} gadgets'` (zone enter / Backspace) |
| `noAction` | Announced when Enter on empty / non-usable slot |
| `notUsableHere` | Appended to gadget description |
| `use` | Sub-menu item label |
| `back` | Sub-menu close label |
| `used` | Announced after successful use |
| `counter` | `'charge {value}/{max}'` |

---

## Design notes

### Why no global condition on counter usage?
The counter is a state that the gadget's effects and conditions can read. Whether
a gadget requires a full gauge — or any other condition — to be usable is declared
in its `actions` (or a `canUse` predicate), not in the engine. This keeps the
engine flexible and avoids hard-coding game-design rules as engine rules.

### Why silent tail removal on slot loss?
Slot loss is an exceptional event in game design (it should be rare or absent
entirely). Emitting a `gadget_lose` for each destroyed gadget would allow
reactive effects to fire on an edge case that may never happen in practice.
Leaving it silent avoids creating unintended interactions.

### Why run-persistent counter instead of combatState?
Powers and perks that count events (e.g. `createEffectCounter`) reset between
combats because their counters live in `combatState`. A gadget that recharges
over multiple combats needs run-persistent state — storing `{ value, max }` in
the gadget instance is the natural solution, and matches the serialization model.
