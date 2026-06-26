# Scenes

All scenes follow the `{ mount(context), unmount() }` contract.  
They are registered with `router.register(name, scene)` in `main.js` and navigated to with `context.router.go(name)`.

---

## `menu` — Main menu (`src/scenes/mainMenu.js`)

Entry point of the application.  
Presents a LinearMenu with the standard choices (New game, Options, Quit) plus debug-only entries when `debug.enabled && debug.showTestCombat`.

**Debug entries:**
- `Combat test` → navigates directly to `combat`.
- `Test sous-menu informatif / choix unique / choix multiples` → demonstrates each SubMenu mode.

---

## `new-game` — New game configuration (`src/scenes/newGame.js`)

Collects the parameters for a new run: seed mode and two heroes.  
Delegates run creation exclusively to `createRun` from `src/engine/run.js`.

### Navigation hierarchy

```
Config menu  (LinearMenu)
  ├─ Seed picker      (SubMenu  · mode: single_choice)
  ├─ Hero selector    (LinearMenu)          ← one per hero slot
  │    └─ Hero detail (SubMenu  · mode: informative + per-item onConfirm)
  │         └─ Powers list (SubMenu · mode: informative)
  └─ [Back] → router.go('menu')
```

### Config menu items

| Item | Condition | Action |
|---|---|---|
| Seed: {current} | always | opens seed picker |
| First hero: {name\|None} | always | opens hero selector (slot 1) |
| Second hero: {name\|None} | always | opens hero selector (slot 2) |
| Preview: {hp} HP, {powers} powers | both heroes chosen | informative, no action |
| Start game | both heroes chosen | calls `createRun`, navigates to `combat`* |
| Back | always | `router.go('menu')` |

*Placeholder: the `combat` scene is used until a dedicated run/intercombat scene exists.  
The created `run` object is stored on `context.run` for future scenes to consume.

### Seed picker

A `single_choice` SubMenu listing seed options.  
Current options: `random` (auto-generated). Structure ready for manual entry or named seeds.

### Hero selector

A LinearMenu listing heroes eligible for the target slot.  
**Eligibility** is handled by `isHeroEligible(hero, config, targetSlot)` — currently: the hero must not already occupy the other slot.  
Extend this function to add unlock checks, faction restrictions, etc.

### Hero detail

A SubMenu in `informative` mode. Action items use the per-item `onConfirm` extension:

| Entry | Behavior |
|---|---|
| Name | informative |
| Description (if available) | informative |
| Hit points | informative |
| Starting powers (N) | opens powers list |
| Signature | informative |
| **Choose this hero** | sets `config.heroN`, returns to config menu |
| Fermer | returns to hero selector |

### Powers list

A SubMenu in `informative` mode listing each starting power with its count and description.  
Powers appearing multiple times in the deck are grouped: `{name} × {count}: {description}`.  
Closing returns to the hero detail.

---

## `run-hub` — Hub de run : Base secrète (`src/scenes/runHub.js`)

Scène d'arrivée après création ou chargement d'une partie.  
Affiche l'état du duo, les options inter-combats et la prochaine mission.  
**Point de sauvegarde** : `serialize(run)` est appelé à chaque montage → `localStorage['duoforce_save']`.

### Vocabulaire joueur

| Terme interne | Présentation joueur |
|---|---|
| `round` (1–10) | **Jour** |
| `phase` 1 | **Mission de reconnaissance** |
| `phase` 2 | **Mission d'intervention** |
| `phase` 3 | **Mission d'élimination** |

### Entrées du menu

| Item | Interactivité | Contenu |
|---|---|---|
| Statut duo | informatif | `{hero1} et {hero2} : {hp}/{maxHp} PV, {powers} pouvoirs.` |
| Améliorations | informatif (shop à brancher) | `Améliorations ({credit} crédit) : …` |
| Lancer la mission | informatif (combat à brancher) | `Lancer la mission {type} contre {ennemi} : {description}` |
| Retour au menu principal | **interactif** | Vide `ctx.run`, navigue vers `menu` |

L'ennemi courant est obtenu via `getNextEnemy(run)` — le hub ne connaît pas le mécanisme de seed.

### Raccourcis clavier (système `keybindings.js`)

| Touche | Action |
|---|---|
| `v` | Annonce PV courants / max |
| `c` | Annonce le crédit |
| `t` | Annonce `{ennemi} : {type}, jour {round}` |

### Identité de l'interface (Retour-arrière)

`Base secrète : Préparation pour le jour {round}, mission {type}`

---

## `victory` — Victoire de combat (`src/scenes/victory.js`)

Scène transitoire affichée après chaque combat gagné, avant le retour au hub.

### Entrée

- `context.run` — PV du duo déjà mis à jour (`applyVictoryToRun` déjà appelé dans la scène combat).
- `context.lastVictory.creditsEarned` — crédits gagnés pendant ce combat (0 si aucun).

### Contenu (LinearMenu)

| Item | Condition | Comportement |
|---|---|---|
| Message de victoire | toujours | informatif |
| PV restants `{hp}/{maxHp}` | toujours | informatif |
| Crédits gagnés `{credits}` | si > 0 | informatif |
| **Continuer** | toujours | interactif → avance la progression |

Un emplacement commenté réserve la place pour un futur choix de récompense (cartes, gadgets, atouts) entre les items informatifs et « Continuer ».

### Action « Continuer »

1. `advancePhase(run)` — avance la progression (phase, puis round si phase > 3).
2. Si `isRunWon(run)` → `router.go('run-won')`.
3. Sinon → `router.go('run-hub')` — le hub sauvegarde et affiche le nouvel état.

---

## `run-won` — Fin de run victorieuse (`src/scenes/runWon.js`)

Placeholder affiché quand la run est gagnée (boss du jour 10 vaincu).

### Contenu (LinearMenu)

| Item | Comportement |
|---|---|
| Message de félicitations | informatif |
| Retour au menu principal | `ctx.run = null` puis `router.go('menu')` |

Cette scène sera étoffée ultérieurement (récapitulatif de run, score, déverrouillages).

---

## `combat` — Test combat (`src/scenes/combat.js`)

Debug scene. Initializes a combat with two fixed heroes (Paladium + Mindel) and a dummy enemy.  
Does not read `context.run`; it builds its own state from the `HEROES` constant.  
Used as a launch placeholder for new-game until a proper run/intercombat scene is built.

---

## `game` — Game (stub) (`src/scenes/game.js`)

Placeholder. Not yet functional.

---

## `gameover` — Game over (`src/scenes/gameover.js`)

End-of-game screen. Displays win/loss/draw. Offers navigation back to `menu`.
