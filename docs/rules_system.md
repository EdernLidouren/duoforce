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
import { isInZone, hasNeighborOfType, addAttack, removeAttack } from '../../engine/context.js';

export const power_aerial_strike = {
  id: 'power_aerial_strike',
  type: 'offensive',          // 'offensive' | 'support' | 'special'
  rarity: Rarity.UNCOMMON,    // integer 0–4, see rarity.js
  customResolve: (ctx) => {
    if (isInZone(ctx, [6, 7, 8])) addAttack(ctx, 4);          // sky
    else if (isInZone(ctx, [0, 1, 2])) removeAttack(ctx, 1);  // ground
    else if (hasNeighborOfType(ctx, 'offensive')) addAttack(ctx, 2);
    else addAttack(ctx, 2);
  },
};
```

Each power exports exactly one object. No DOM, no imports from `src/ui/`.

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
```

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
2. each power's `customResolve(ctx)` runs in order.
3. `evaluateTriggers(work, ctx)` runs **after** each power.

`resolveBoard` works on a copy and returns the resolved values plus an
activation log; `resolveTurn` (in `src/engine/combat.js`) commits those values,
applies the damage phases, then calls `processTurnEnd`.

---

## Deck manipulation — not yet available

The previous model documented `draw` / `discard` / `exile` effects with
positional targets (`self`, `left`, `row`, `col`, …). `context.js` exposes **no
deck-manipulation helper yet**, so powers that used to draw/discard/exile have
been re-themed to combat-value, resource, or enemy-debuff effects (see
`power_disrupt`, `power_tactician`, `power_sabotage`). Add the helpers to
`context.js` first if/when deck manipulation is reintroduced, and update this
section and `context-api.md` together.

---

## General notes

- Values are placeholders and may be modified at runtime by talents, gadgets,
  signatures, or statuses.
- Combat values are clamped to ≥ 0 by `resolveBoard` after resolution.
- Power names and descriptions are localized string ids (see the language
  packs `powers` table); descriptions must mirror the actual `customResolve`
  branches.
