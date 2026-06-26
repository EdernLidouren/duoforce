# Run State Architecture

## Purpose

This document defines how game state is layered, where the **run** lives,
how it relates to combat, and how it is serialized for saving. Every scene
that touches persistent game data should follow the boundaries described here.

---

## Three layers of state

State is split into three distinct layers. Each has a different lifetime and a
different owner. Keeping them separate is the core architectural rule.

### 1. Profile (long-term progression)

Survives the death of a character and the end of any run. This is where
unlocks, achievements, and the persistent `progressionLog` live.

- Lifetime: permanent (persists across runs)
- Never reset by starting or losing a run
- Out of scope for this document, but the run must never write game-progression
  data anywhere that a lost run would erase

### 2. Run (the current game)

Everything specific to the game currently being played: the chosen duo,
inventory, current HP, credits, seed, and progression through the rounds.
This is the object described in detail below.

- Lifetime: from "new game" until victory or defeat
- Read by combat at the start of each fight; updated by combat at the end
- Can produce a serializable save object (see Serialization)

### 3. Combat (a single fight)

The ephemeral state of one battle: the board, the draw/discard/exile piles,
combat-scoped statuses, accumulated attack/defense. Created when a fight
starts, discarded when it ends.

- Lifetime: a single combat only
- Reads from the run on init (which heroes, starting HP)
- Writes back to the run on resolution (remaining HP, earned credits)
- The run never knows the internal detail of an ongoing combat

**Implemented boundary (`src/engine/run.js`):**

| Direction | What | How |
|-----------|------|-----|
| Run → Combat (init) | `run.heroes`, `run.hp`, `run.maxHp`, enemy via `getNextEnemy(run)` | `initCombat({ heroes, enemy, duoHp: run.hp, duoMaxHp: run.maxHp })` |
| Combat → Run (victory only) | `state.duo.hp` → `run.hp` ; `state.duo.credit` added to `run.credit` | `applyVictoryToRun(run, combatState)` |
| Defeat | `run.hp` is **not** modified | `applyVictoryToRun` is not called |

`advancePhase` is not called here; it is the responsibility of the post-victory scene.

### Flow rule

```
Profile  ──(unlocks, persistent)──────────────►  (out of run scope)
   ▲
   │
  Run  ──reads──►  Combat  ──writes back──►  Run
```

Combat **reads** from the run (heroes, current HP) and **writes** results back
to the run when it ends (HP left, credits gained). The run is the single
source of truth between fights; combat is transient.

---

## The run object

Contains everything proper to the game in progress, and can produce a
save-ready object. Live structure:

### progression
An object describing where the player is in the run.
- `round` — integer, current round (1–10)
- `phase` — integer, progress within the current round (1–3)

### heroes
The two heroes chosen by the player at the start of the run. Each keeps its
own full structure (statuses, power deck, perks, etc.). The duo is fixed for
the whole run.

### gadgets
Gadget objects currently owned by the player. Each has its own structure
(status, etc.).

### sidekicks
Sidekick objects currently owned by the player. Each has its own structure
(status, etc.).

### abilities
Ability objects currently owned by the player. Each has its own structure
(status, etc.). (French game term: *atouts*.)

### hp
Current HP value of the duo. See "Duo HP model" below.

### credit
Current credit owned by the player.

### seed
The seed fixed at run creation. Determines the full enemy programming for the
run (see "Enemy programming"). **Stored; never store the derived enemy list.**

---

## Duo HP model

Each hero model has its own HP value. At run creation, the duo's **max HP** is
the **sum** of the HP of the two chosen heroes. From that point on:

- The duo uses a **single shared HP pool** (`run.hp`), not per-hero HP.
- This shared value is what combat reads, mutates, and what gets saved.
- Individual hero HP values are only used once, at run creation, to compute the
  duo's max HP. They are not tracked separately during the run.

---

## Round and phase structure

A run is 10 rounds. Each round is 3 combats in sequence:

| phase | flavor name (FR)  | flavor name (EN) | enemy type |
|-------|-------------------|------------------|------------|
| 1     | Reconnaissance    | reconnaissance   | minion     |
| 2     | Intervention      | intervention     | lieutenant |
| 3     | Affrontement      | confrontation    | boss       |

- Phases 1 and 2 are standard combats; phase 3 is a boss combat.
- When the phase-3 (boss) combat is won, advance to the next round, reset to
  phase 1, and repeat.
- Winning round 10's boss wins the run.

The flavor names are localization labels over two integers (`round`, `phase`).
The engine only manipulates the integers; localization supplies the names.

### Linear combat index

`round` + `phase` map to a linear combat index across the run
(e.g. round 3, phase 2 = the 8th combat). This index, combined with the seed,
determines which enemy is faced.

---

## Enemy programming (seed-derived)

The full set of enemy/boss ids faced across the run is **determined by the seed**
at run creation, not stored as a list.

- **Store:** the seed (in the run).
- **Derive:** the enemy for a given combat from `seed` + linear combat index.
- Never persist the generated enemy list — it is reproducible from the seed,
  which keeps saves light and tamper-resistant.

For now, while content is limited, the generation function can be a simplified
or near-trivial mapping. What matters is that the **structure** is correct from
the start: seed lives in the run, enemy is derived on demand from seed + index.
The generation logic can grow richer later without changing this contract.

---

## Saving and serialization

### Versionnement

Deux versions distinctes sont stockées dans chaque save object, définies dans
`src/config/version.js` (fichier maintenu manuellement — l'agent ne l'incrémente
pas de lui-même) :

| Constante | Type | Rôle |
|---|---|---|
| `GAME_VERSION` | string (semver) | Version lisible du jeu. Incrémentée librement par le développeur quand une étape est franchie. N'impacte pas la compatibilité des saves ; présente à titre informatif dans le save object. |
| `SAVE_FORMAT_VERSION` | entier | Incrémenté **uniquement** quand la structure du save object change de façon incompatible (champ renommé, supprimé, sémantique modifiée). C'est le garde-fou de compatibilité : `deserialize()` compare la valeur stockée dans la save à `SAVE_FORMAT_VERSION` courant et avertit en cas de divergence. |

Règle : changer `GAME_VERSION` n'implique pas changer `SAVE_FORMAT_VERSION`. Changer la structure du save object implique toujours d'incrémenter `SAVE_FORMAT_VERSION`.

### When saving is allowed

Saving is permitted **only between combats** (in shop/transition phases), never
during an ongoing combat — same model as Slay the Spire, Balatro, and similar
roguelikes. There is no mid-combat save; combat state is never serialized.

### Run vs save object

The **live run** holds rich objects (heroes with their full structure,
references, possibly methods). The **save object** is a flat, serializable
projection — plain JSON data only.

- `serialize()` — produces the save object from the live run: plain data, no
  functions, no circular references. Stores seed and progression rather than
  derived data (e.g. no enemy list).
- `deserialize(saveObject)` — reconstructs a live run from a save object,
  regenerating any derived state (such as enemy programming) from the seed.

Keeping the live run and the save object distinct avoids trapping functions or
circular references in a save, and keeps the persisted footprint minimal.

---

## Summary of rules

1. Three layers: profile (permanent), run (one game), combat (one fight).
2. Combat reads from the run on init, writes results back on resolution.
3. The run is the single source of truth between fights.
4. Duo HP is a single shared pool, seeded once from the sum of both heroes' HP.
5. Round (1–10) and phase (1–3) are integers; names are localization flavor.
6. Store the seed, derive the enemy programming — never store the enemy list.
7. Saving only between combats; combat state is never serialized.
8. The run produces a serializable save object; it is not itself the save.
