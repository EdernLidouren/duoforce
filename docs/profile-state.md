# Profile State Architecture

## Purpose

The **profile** is the root persistence unit of the game. It contains the
player's meta-progression (unlocks, meta-currency, statistics), their
preferences, and the current run if one is in progress. Everything that must
survive across runs lives here.

This document defines the profile structure and how it relates to the run.
It complements `run-state.md`, which describes the run itself.

---

## Model: the profile contains the run

A single profile is the unit of saving (mono-profile, no save naming — standard
for browser games). The run is **a field inside the profile**, not a separate
save.

- The profile holds meta-progression that persists across runs.
- The profile holds the current run, or `null` if no run is in progress.
- When a run ends (victory, defeat, abandon), `profile.run` is set to `null`,
  but the rest of the profile (stats, unlocks, currency) is preserved.

```
Profile
├── run            → the current Run object, or null
├── metaCurrency   → persistent currency for unlocks
├── unlocks        → list of unlocked content ids
├── stats          → cumulative statistics
├── preferences    → player settings (incl. accessibility)
└── meta           → version, creation date
```

There is no separate storage for run vs profile: saving the profile saves
everything, run included.

---

## Two currencies at two levels

Keep these strictly distinct:

- **credit** — lives *inside* the run (`run.credit`). Earned and spent during a
  run, dies with it. Already implemented.
- **metaCurrency** — lives in the profile. Persistent, earned across runs,
  spent on permanent unlocks. Never reset by a run ending.

Naming them differently everywhere avoids confusion.

---

## Profile fields

### run
The current `Run` object, or `null` if no run is in progress. This is the
reentry point for resuming a game.

### metaCurrency
Persistent meta-currency (points) spent on unlocks. A single integer for now;
can grow to multiple named currencies later if needed.

### unlocks
The list of unlocked content **ids only** — not definitions.

- What is *unlockable* (the full list, costs, conditions) is defined in the
  game's data files, alongside heroes, powers, etc.
- The profile only stores which ids the player has unlocked, e.g.
  `["hero_mindel", "gadget_x", ...]`.
- Three derived states, no extra structure needed:
  - **unlockable**: defined in data
  - **unlocked**: id present in `profile.unlocks`
  - **locked**: defined in data but id absent from `profile.unlocks`

This plugs directly into existing extensible eligibility logic (e.g. hero
eligibility can add a criterion "id is in profile unlocks").

### stats
A sub-object grouping all cumulative statistics, kept together for readability
and easy extension. Examples: total play time, number of runs started, wins,
losses, abandons, etc.

Many of these can eventually be derived from the existing event system /
`progressionLog` rather than counted by hand. Whether to keep explicit
counters or recompute from the log is a later decision; the foundation exists.

### preferences
Player settings, stored in the profile for simplicity (single browser game,
no separate settings storage). Includes accessibility-related options
(e.g. announcement speed, verbosity), language, and any other player
preferences. Saved and restored with the profile.

### meta
- `saveFormatVersion` — integer, incremented only when the profile structure
  changes incompatibly. Same role as the run's save format version: lets old
  saved profiles be detected on load.
- `createdAt` — timestamp of profile creation. Useful for debugging.

---

## Persistence

The profile is serialized as a whole. The same serialization underlies both
storage destinations — only the destination differs.

### Auto-save (localStorage)

- On hub open (and other key moments), the profile is serialized and written to
  a localStorage key. Transparent to the player.
- On game start, the profile is read from localStorage if present, else a fresh
  profile is created.

### Manual export/import (copy-paste)

Browser-game-standard approach, no file handling:

- **Export**: the serialized profile (JSON → base64) is shown in a text area
  the player can copy to archive anywhere they like.
- **Import**: the player pastes a previously exported string; it is decoded
  (base64 → JSON → deserialize) and replaces the current profile.
- Base64 encoding produces a compact, opaque block: it discourages naive
  editing and avoids copy-paste issues with special characters or newlines.
  This is cosmetic, not real security (trivially decodable) — sufficient for a
  single-player game.

A `<textarea>` is well handled by NVDA: selecting, copying, and pasting are all
native and fluid for screen reader users — typically more accessible than a
file dialog.

### Versioning on load

`deserialize` reads `saveFormatVersion`. If it does not match the current
`SAVE_FORMAT_VERSION`, log a clear warning (no migration implemented yet — just
clean detection). Same guard already applied to the run save object.

---

## Separation of concerns

- The profile knows how to produce and rebuild its serialized form
  (`serialize` / `deserialize`).
- The profile does **not** know *where* or *when* it is saved — that is the job
  of a persistence layer above it.
- That persistence layer orchestrates: write to localStorage on hub open,
  expose export/import via the text area, etc.
- This lets future options (auto-save frequency, etc.) be added in the
  persistence layer without touching the profile or the run.

---

## Applying preferences at runtime

Saving `profile.preferences` is not enough: systems that depend on preferences
must re-read them whenever the player changes a setting. The single hook for this
is `applyPreferences(prefs)` in `src/ui/applyPreferences.js`.

It is called in two places only:

1. **At startup** (`main.js`) — right after loading the profile from localStorage,
   so the previously saved settings take effect immediately.
2. **On Options validation** (`src/scenes/options.js`) — right after the new draft
   is written to `profile.preferences` and saved, so changes take effect without a
   reload.

### How to wire a new preference to a system

1. Add the key to `createProfile().preferences` in `profile.js`.
2. Add the field to the `schema` in `options.js` (one of `toggle`, `list`, `knob`).
3. Add `systems.setSomething(prefs.newKey)` inside `applyPreferences()`.
4. Add the localization strings in both language packs under `options.*`.

`applyPreferences` is the only place where preference values are pushed to
systems; do not read `profile.preferences` directly from within UI subsystems —
let them read the shared `preferences` object in `src/ui/preferences.js`, which
`applyPreferences` updates.

---

## Summary of rules

1. The profile is the root save unit; mono-profile, no save naming.
2. The profile contains the run as a field (or `null`); ending a run nulls that
   field but preserves the rest of the profile.
3. Two distinct currencies: `run.credit` (transient) and `profile.metaCurrency`
   (persistent).
4. `unlocks` stores ids only; unlockable/unlocked/locked are derived.
5. `stats` and `preferences` live in the profile.
6. The profile carries its own `saveFormatVersion` and `createdAt`.
7. Auto-save to localStorage; manual export/import via base64 copy-paste.
8. The profile serializes itself; a separate persistence layer decides where
   and when.
9. After any preference change, call `applyPreferences(prefs)` — never push
   preference values to systems directly from scenes or the profile.
