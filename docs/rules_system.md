# Power Rules System

## Overview

Each power object contains a `rules` array (declarative) and an optional
`customResolve` function (escape hatch for complex logic).

- Rules engine: `src/engine/rules.js`
- Power data: `src/data/powers.js`

Rules are evaluated in order. The **first matching condition** applies and
the remaining rules are skipped. `"default"` always matches and must always
be last. If `customResolve` is a function, it overrides `rules` entirely.

---

## Power object structure

```js
{
  id: "power_aerial_strike",
  type: "offensive", // "offensive" | "support" | "special"
  rules: [
    { condition: [6, 7, 8], effect: "add_attack", value: 4 },
    { condition: [0, 1, 2], effect: "add_attack", value: 0 },
    { condition: "default", effect: "add_attack", value: 2 },
  ],
  customResolve: null,
}
```

---

## Board layout

Cells are indexed 0–8, in Western reading order (left to right, top to bottom).

```
6 | 7 | 8
3 | 4 | 5
0 | 1 | 2
```

Resolution order follows the same reading order: 6, 7, 8, 3, 4, 5, 0, 1, 2.

---

## Condition types

### Positional — array of cell indices

The power's position must be included in the array.

```js
{ condition: [6, 7, 8], ... }     // top row
{ condition: [3, 4, 5], ... }     // middle row
{ condition: [0, 1, 2], ... }     // bottom row
{ condition: [6, 3, 0], ... }     // left column
{ condition: [7, 4, 1], ... }     // center column
{ condition: [8, 5, 2], ... }     // right column
{ condition: [4],       ... }     // center cell only
{ condition: [6, 8, 0, 2], ... }  // corners
```

### Neighbor-based — string

Checks the power's orthogonal neighbors (up, down, left, right).

```js
"adjacent_to:offensive"        // at least one neighbor of type "offensive"
"adjacent_to:support"          // at least one neighbor of type "support"
"adjacent_to:special"          // at least one neighbor of type "special"
"adjacent_to:power_shield"     // at least one neighbor with this specific id
"isolated"                     // no orthogonal neighbors
```

### Default

```js
"default"  // always true — must be last in the rules array
```

---

## Effect types

### Combat values

Accumulated during resolution, reset to 0 at the start of each turn.

```js
{ effect: "add_attack",          value: N }  // add N to duo's attack
{ effect: "add_defense",         value: N }  // add N to duo's defense
{ effect: "remove_attack",       value: N }  // remove N from duo's attack
{ effect: "remove_defense",      value: N }  // remove N from duo's defense
{ effect: "add_enemy_attack",    value: N }  // add N to enemy's attack
{ effect: "add_enemy_defense",   value: N }  // add N to enemy's defense
{ effect: "remove_enemy_attack", value: N }  // remove N from enemy's attack
{ effect: "remove_enemy_defense",value: N }  // remove N from enemy's defense
```

### Multipliers

Applied once, after all powers have resolved, before damage is calculated.

```js
{ effect: "multiply_attack",        value: N }
{ effect: "multiply_defense",       value: N }
{ effect: "multiply_enemy_attack",  value: N }
{ effect: "multiply_enemy_defense", value: N }
```

### Resources

```js
{ effect: "heal",      value: N }  // restore N hp to the duo
{ effect: "enemy_heal",value: N }  // restore N hp to the enemy
{ effect: "maneuver",  value: N }  // grant N maneuvers (negative to remove)
{ effect: "strategy",  value: N }  // grant N strategies (negative to remove)
{ effect: "credit",    value: N }  // grant N credits (negative to remove)
```

### Deck manipulation

```js
{ effect: "draw",    value: N }  // draw N extra powers onto the board (if space)
{ effect: "discard", value: N, target: "..." }  // discard powers (see targets)
{ effect: "exile",   value: N, target: "..." }  // exile powers (see targets)
```

---

## Effect targets

`target` is optional. Omit it for effects that do not act on board positions
(`add_attack`, `heal`, resources, etc.). Required for `discard` and `exile`.

### Self

```js
{ effect: "exile", value: 1, target: "self" }
```

### Relative positions

Orthogonal neighbors of the current power.

```js
{ effect: "discard", value: 1, target: "left" }
{ effect: "discard", value: 1, target: "right" }
{ effect: "discard", value: 1, target: "above" }
{ effect: "discard", value: 1, target: "below" }
```

### Broader relatives

```js
{ effect: "discard", value: 1, target: "row" }        // all powers on the same row
{ effect: "exile",   value: 1, target: "col" }        // all powers on the same column
{ effect: "discard", value: 1, target: "neighbors" }  // all orthogonal neighbors
```

### Absolute

```js
{ effect: "exile", value: 1, target: [0, 3, 6] }  // specific cell indices
```

### Target resolution notes

- `target` is resolved only if the rule's condition matched.
- If `target` points to an empty cell, the effect is silently ignored.
- When `target` covers multiple cells (e.g. `"row"`), `value` means
  "up to N powers among those cells". If fewer are present, all are affected.

---

## customResolve (escape hatch)

Use only when declarative rules are insufficient. Overrides `rules` entirely.
Receives a `context` object, returns an array of `{ effect, value }` or
`{ effect, value, target }`.

```js
customResolve: (context) => {
  const { position, neighbors, boardState, combatState } = context;
  // custom logic here
  return [{ effect: "add_attack", value: 10 }];
}
```

### context object

```js
{
  position:    Number,  // 0–8, this power's cell index
  neighbors:   Array,   // orthogonal neighbor power objects (may be empty)
  boardState:  Array,   // all 9 cells indexed 0–8, null if empty
  combatState: Object,  // { duo: { hp, attack, defense, maneuver, strategy, credit },
                        //   enemy: { hp, attack, defense } }
}
```

---

## resolveCondition — implementation guide (src/engine/rules.js)

```js
function resolveCondition(condition, context) {
  if (condition === "default") return true;
  if (Array.isArray(condition)) return condition.includes(context.position);
  if (condition === "isolated") return context.neighbors.length === 0;
  if (condition.startsWith("adjacent_to:")) {
    const target = condition.split(":")[1];
    return context.neighbors.some(n => n.type === target || n.id === target);
  }
  return false;
}
```

---

## General notes

- Values preceded by `*` in design documents are not hardcoded and may be
  modified at runtime by talents, gadgets, signatures, or other sources.
- All string keys in this document are the canonical identifiers to use
  in `powers.js` and `rules.js`. Do not introduce new keys without updating
  this document first.
- `customResolve` is the exception, not the rule. Prefer declarative rules
  whenever possible.
