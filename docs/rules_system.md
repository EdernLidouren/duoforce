# Power Rules System

## Overview

Each power resolves its effect through a single **`customResolve(ctx)`**
function. There is no declarative `rules[]` array anymore — the previous
condition/effect table model has been replaced by imperative code that mutates
the combat state through the helpers of [`context-api.md`](./context-api.md).

- Resolution engine: `src/engine/rules.js`
- Context helpers (the power-facing API): `src/engine/context.js` →
  documented in [`context-api.md`](./context-api.md)
- Status engine (modifiers / triggers / end-of-turn): `src/engine/statuses.js`
  → documented in [`status-system.md`](./status-system.md)
- Power data: `src/data/powers/power_*.js` (one file per power), re-exported by
  `src/data/powers/index.js`

---

## Power object structure

```js
import { Rarity } from './rarity.js';
import { getNeighbor, addAttack } from '../../engine/context.js';

export const force_palm_power = {
  id: 'force_palm_power',
  type: 'offensive',          // 'offensive' | 'support' | 'special'
  rarity: Rarity.COMMON,      // integer 0–4, see rarity.js
  customResolve: (ctx) => {
    const left = getNeighbor(ctx, 'left');
    const right = getNeighbor(ctx, 'right');
    const sameRowOffensive =
      (left && left.type === 'offensive') || (right && right.type === 'offensive');
    addAttack(ctx, sameRowOffensive ? 3 : 1);
  },
};
```

Each power exports exactly one object. No DOM, no imports from `src/ui/`. A power
may also carry plain flags read elsewhere — e.g. `immuneToExhaustion: true`
(checked by `applyStatus`, see [`status-system.md`](./status-system.md)).

---

## Board layout

Cells are indexed 0–8. The grid maps to three zones (sky / surface / ground):

```
6 | 7 | 8     (sky)
3 | 4 | 5     (surface)
0 | 1 | 2     (ground)
```

Resolution and distribution follow reading order: **6, 7, 8, 3, 4, 5, 0, 1, 2**
(`RESOLUTION_ORDER` in `src/engine/rules.js`).

Useful positional sets for `isInZone`:

```js
[6, 7, 8]      // sky row
[3, 4, 5]      // surface row
[0, 1, 2]      // ground row
[6, 3, 0]      // left column
[7, 4, 1]      // center column
[8, 5, 2]      // right column
[4]            // center cell
[6, 8, 0, 2]   // corners
```

---

## customResolve(ctx)

`customResolve` is called once per occupied cell, in resolution order. It
receives the `ctx` object built by `resolveBoard` and **returns nothing** — it
acts by calling helpers that mutate `ctx.combatState` (a working copy) and
record an effect descriptor for the end-of-turn messages.

```js
{
  position,        // 0–8, this power's cell index
  neighbors,       // orthogonal neighbor power objects (may be empty)
  neighborsByDir,  // { left, right, above, below } → power or null
  boardState,      // all 9 cells (working copy), null if empty
  combatState,     // working copy of the combat state (mutated by writes)
  effects,         // effect log filled by the write helpers
}
```

### Reading the board

| Helper | Returns |
|---|---|
| `isInZone(ctx, cells)` | `true` if `ctx.position` is in `cells` |
| `getNeighbor(ctx, dir)` | neighbor power in `dir` (`'left'`/`'right'`/`'above'`/`'below'`) or `null` |
| `hasNeighborOfType(ctx, type)` | `true` if an orthogonal neighbor has that `type` |
| `hasNeighborById(ctx, id)` | `true` if an orthogonal neighbor has that `id` |
| `isIsolated(ctx)` | `true` if no orthogonal neighbor |
| `countNeighborsOfType(ctx, type)` | count of neighbors of that `type` |

### Writing effects

All write helpers mutate `ctx.combatState` and return nothing. See the full
table (combat values, multipliers, resources, healing) in
[`context-api.md`](./context-api.md). Common ones:

```js
addAttack(ctx, n);  removeAttack(ctx, n);  multiplyAttack(ctx, n);
addDefense(ctx, n); removeDefense(ctx, n); multiplyDefense(ctx, n);
addEnemyAttack(ctx, n);  removeEnemyAttack(ctx, n);  multiplyEnemyAttack(ctx, n);
addEnemyDefense(ctx, n); removeEnemyDefense(ctx, n); multiplyEnemyDefense(ctx, n);
heal(ctx, n); enemyHeal(ctx, n);
grantManeuver(ctx, n); grantStrategy(ctx, n); grantCredit(ctx, n);
empowerNeighborsOfType(ctx, type, amount); // +attack bonus to neighbors (finalize)
```

A power can also act on **other powers** via statuses (import `applyStatus` from
`../../engine/statuses.js`), e.g. `heavy_slam_power` exhausts the power below it.
See [`status-system.md`](./status-system.md) and [`context-api.md`](./context-api.md).

### "First condition wins"

The old declarative model evaluated rules top-to-bottom and applied the first
match. The imperative equivalent is plain `if / else if / else`:

```js
if (isInZone(ctx, [4])) grantCredit(ctx, 1);     // center
else if (isIsolated(ctx)) grantStrategy(ctx, 1);
else grantManeuver(ctx, 1);
```

---

## Resolution order and multipliers

Powers resolve in `RESOLUTION_ORDER`, each mutating the shared working copy.
A multiplier therefore only multiplies the value **accumulated so far** — it is
*not* deferred to a final multiply phase like the old model. Order matters:
place this in mind when designing `multiply*` powers.

Statuses bracket the loop (see [`status-system.md`](./status-system.md)):

1. `applyModifiers(work)` runs **before** any power resolves.
2. for each cell in order: if the power is **exhausted**
   (`power_exhaustion_status`), its `customResolve` is **skipped** entirely
   (no effect, no activation); otherwise `customResolve(ctx)` runs.
3. `evaluateTriggers(work, ctx)` runs **after** each power.
4. **Finalize:** any neighbor bonuses registered by `empowerNeighborsOfType`
   are applied **after** the loop, so every targeted neighbor benefits
   regardless of resolution order. Each bonus is added to the duo's attack and
   merged into the empowered power's `add_attack` (for messages).

`resolveBoard` works on a **deep copy** of the combat state — `duo`, `enemy` and
**statuses** are all cloned. A status applied during resolution (e.g. exhaustion
from `heavy_slam`) therefore lives on the copy: it affects the same resolution
and is then discarded. This keeps `resolveBoard` pure, so the estimator can call
it freely. `resolveTurn` (in `src/engine/combat.js`) commits the resolved
values, applies the damage phases, then calls `processTurnEnd` on the real state.

---

## Deck manipulation — not yet available

An earlier model documented `draw` / `discard` / `exile` effects with positional
targets (`self`, `left`, `row`, `col`, …). `context.js` exposes **no
deck-manipulation helper yet**, so the current powers act only on combat values,
resources, the enemy, or other powers (statuses). Add the helpers to `context.js`
first if/when deck manipulation is reintroduced, and update this section and
`context-api.md` together.

---

## General notes

- Values are placeholders and may be modified at runtime by talents, gadgets,
  signatures, or statuses.
- Combat values are clamped to ≥ 0 by `resolveBoard` after resolution.
- Power names and descriptions are localized string ids (see the language
  packs `powers` table); descriptions must mirror the actual `customResolve`
  branches.
- `buildDeck` (in `src/engine/combat.js`) instantiates each deck card as a
  **distinct copy** of its power definition. Two cards of the same id are
  separate objects, so per-instance mechanics (exhaustion, neighbor empowerment)
  never collide.
