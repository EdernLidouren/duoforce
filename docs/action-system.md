# Système d'actions (`src/engine/actions.js`)

Toute action significative du jeu (application de statut, dégâts hors résolution,
déplacement de pouvoir, soin, usage de gadget…) transite par `executeAction`.
Les intercepteurs enregistrés peuvent bloquer ou modifier l'action ; le dispatcher
interne route ensuite vers la logique d'exécution si l'action n'est pas annulée.

---

## Structure d'une action

```js
{
  type: string,        // ex. 'apply_status', 'deal_damage', 'move_power'
  source: any,         // déclencheur (pouvoir, statut, perk, joueur…) — peut être null
  target: any,         // cible — encodage dépend du type (voir tableau ci-dessous)
  value: any,          // valeur principale — encodage dépend du type
  data: {},            // contexte additionnel libre
  cancelled: boolean,  // false par défaut ; mis à true par un intercepteur bloquant
  reason: string|null, // clé de localisation du motif de blocage
}
```

Utilisez `createAction` pour construire une action avec les bonnes valeurs par
défaut :

```js
import { createAction } from '../../engine/actions.js';

const action = createAction('apply_status', {
  source: ctx.power,
  target: { type: 'entity', entity: below },
  value: { statusId: 'power_exhaustion_status', stacks: 1 },
});
```

---

## Types d'action et encodage target/value

| Type | `target` | `value` | Notes |
|---|---|---|---|
| `apply_status`  | `{ type, entity?, position? }` | `{ statusId, stacks }` | Déféré si `type:'area'` |
| `remove_status` | `{ type, entity?, position? }` | `{ statusId }` | — |
| `modify_status` | `{ type, entity?, position? }` | `{ statusId, stacksDelta }` | Delta +/- |
| `deal_damage`   | `'duo'` ou `'enemy'` | `number` | `data.unblockable?` (ignoré par le moteur actuel, utile aux intercepteurs) |
| `add_attack`    | `'duo'` ou `'enemy'` | `number` | Hors résolution uniquement |
| `add_defense`   | `'duo'` ou `'enemy'` | `number` | Hors résolution uniquement |
| `swap_powers`   | `number` (position dest.) | — | `source`: position source ; `data.maxDistance?`: portée |
| `spend_maneuver` | `'duo'`\|`'enemy'`       | `number` | Décrémente la manœuvre |
| `move_power`    | `number` (position dest.) | — | `source`: position source (exécuteur à venir) |

Pour `target.type` des actions de statut :

| `target.type` | Cible | Clé complémentaire |
|---|---|---|
| `'duo'` | Héros du joueur | — |
| `'enemy'` | Ennemi | — |
| `'entity'` | Pouvoir (objet) | `target.entity` |
| `'area'` | Zone du plateau | `target.position` (0–8) |

---

## Frontière : actions vs helpers de résolution

**Les helpers d'accumulation** (`addAttack`, `addDefense`, `addEnemyAttack`…
depuis `context.js`) **ne passent PAS par le pipeline d'actions.** Ce sont des
mutations de la passe de résolution de `resolveBoard` — des calculs intermédiaires
qui construisent les valeurs finales du tour. Ils n'ont pas de déclencheur discret,
pas d'interception pertinente, et leur résultat n'est commis qu'en sortie de
`resolveBoard`.

Le pipeline d'actions concerne les **effets discrets** qui surviennent en dehors
de la passe de résolution : application de statuts, dégâts de poison, bonus de
perk en fin de tour, déplacements. Ce sont ces effets qu'un intercepteur (un
gadget, un perk adverse) pourrait légitimement vouloir bloquer ou modifier.

---

## Action `swap_powers` et mécanique de manœuvre

### Règles de `swap_powers`

```js
createAction('swap_powers', {
  source: fromPos,   // position source (doit contenir un pouvoir)
  target: toPos,     // position cible (peut être vide)
  data: { maxDistance: 1 },  // portée orthogonale maximale
})
```

**Interversion vs déplacement vers case vide :**
- Si la zone cible contient un pouvoir → les deux pouvoirs échangent leurs zones.
- Si la zone cible est vide → le pouvoir source se déplace, laissant sa zone vide.

**Statuts de zone ≠ statuts de pouvoir :**
- Les statuts de zone (`area_freeze_status`, `area_anchor_status`…) restent attachés à leur zone physique — ils ne bougent pas avec le pouvoir.
- Les statuts d'entité (`power_exhaustion_status`…) sont stockés dans `combatState.statuses.entities` indexés par référence d'objet pouvoir. Ils voyagent automatiquement avec le pouvoir lors d'un échange.

**Blocage par ancrage :** `anchorInterceptor` annule tout `swap_powers` dont la zone **source ou cible** (l'une suffit) porte `area_anchor_status`.

**Distance orthogonale :** `data.maxDistance` limite la portée en distance de Manhattan. Pour une manœuvre standard : `maxDistance: 1` (adjacents orthogonaux uniquement — jamais de diagonale). Sans `maxDistance`, aucune limite.

**Préconditions interceptées :**
- Zone source vide → `action.blocked.no_source_power`
- Cible hors portée → `action.blocked.out_of_range`
- Zone ancrée (source ou cible) → `action.blocked.anchored`

### Manœuvre — cas particulier (`src/engine/maneuver.js`)

La manœuvre est un `swap_powers` à distance 1 qui coûte 1 point de manœuvre.

```
┌─────────────────────────────────────────────────┐
│ 1. canStartManeuver(combatState)                │  → au moins 1 manœuvre ?
│ 2. canManeuverFrom(combatState, sourcePos)      │  → source légale ?
│ 3. canManeuverTo(combatState, sourcePos, tgtPos)│  → cible légale ? (read-only)
│ 4. executeManeuver(combatState, sourcePos, tgt) │  → échange + dépense
└─────────────────────────────────────────────────┘
```

**Dépense après succès uniquement** : si l'échange est annulé (ancrage, portée, interdiction externe), aucun point de manœuvre n'est consommé.

```js
import { executeManeuver, canManeuverFrom, canManeuverTo } from '../../engine/maneuver.js';

// Vérification avant proposition à l'UI :
if (canManeuverFrom(combatState, sourcePos)) {
  for (const pos of reachablePositions(sourcePos, 1)) {
    if (canManeuverTo(combatState, sourcePos, pos)) { /* proposer cette case */ }
  }
}

// Exécution :
const result = executeManeuver(combatState, sourcePos, targetPos);
if (!result.success) announce(strings[result.reason]);
```

`canManeuverTo` passe par `validateAction` — il reflète tout le pipeline
d'intercepteurs, y compris les futurs intercepteurs de perk ou de gadget.

`spend_maneuver` (dépense du point) transite par `executeAction` : un futur
intercepteur pourrait le bloquer (ex. pouvoir qui donne une manœuvre gratuite)
ou le réduire.

`reachablePositions(fromPos, maxDistance)` retourne les positions dans la portée
orthogonale, quel que soit leur contenu. La validation des contraintes de jeu
reste la responsabilité de `canManeuverTo` / `validateAction`.

---

## `executeAction` — point d'entrée unique

```js
import { createAction, executeAction } from '../../engine/actions.js';

executeAction(combatState, createAction('apply_status', {
  source: ctx.power,
  target: { type: 'entity', entity: below },
  value: { statusId: 'power_exhaustion_status', stacks: 1 },
}));
```

`executeAction` :
1. Incrémente le compteur de profondeur (garde-fou anti-cascade).
2. Fait passer l'action par tous les intercepteurs concernés (`processAction`).
3. Si `action.cancelled === false`, route vers l'exécuteur du type (`dispatch`).
4. Décrémente le compteur.
5. Retourne l'action (possiblement modifiée ou annulée).

L'appelant peut inspecter `action.cancelled` après `executeAction` si le résultat
lui importe (ex. `blue_comet_mark_perk` vérifie si son bonus a été annulé pour
décider de retourner une activation ou non).

---

## `processAction` et `validateAction`

| Fonction | Mute l'action | Exécute l'effet | Usage |
|---|---|---|---|
| `executeAction` | oui | oui | cas normal — toute action effective |
| `processAction` | oui | **non** | usages avancés, tests d'intercepteurs |
| `validateAction` | **non** (copie) | **non** | UI : tester la faisabilité avant de proposer |

```js
// Test de faisabilité (UI) :
const probe = createAction('swap_powers', { source: pos1, target: pos2 });
const { allowed, reason } = validateAction(combatState, probe);
```

---

## Garde-fou anti-cascade (`MAX_ACTION_DEPTH`)

`executeAction` maintient un compteur de profondeur d'appel. Si un intercepteur
ou un exécuteur déclenche lui-même une nouvelle action (cascade), ce compteur
s'incrémente. S'il dépasse `MAX_ACTION_DEPTH` (exporté depuis `gameState.js`,
valeur : 50), l'action en cours est annulée et un avertissement identifie le
type fautif :

```
[executeAction] MAX_ACTION_DEPTH (50) dépassé — cascade sur le type 'apply_status'. Action annulée.
```

En jeu normal la profondeur est toujours 1 (un appelant → un executeAction). Ce
garde-fou est distinct de `MAX_RESOLUTION_STEPS` (qui couvre la boucle de
`resolveBoard`) : les deux filets opèrent à des niveaux différents.

---

## Écrire et enregistrer un intercepteur

Un intercepteur est une fonction `(action, combatState) => void` :
- **Bloquer** : `action.cancelled = true; action.reason = 'ma.cle.locale';`
- **Modifier** : `action.value = ...;` ou `action.target = ...;`
- **Laisser passer** : ne rien faire.

```js
import { registerInterceptor } from '../../engine/actions.js';

// Plafonner les soins à 5 PV :
registerInterceptor('heal', (action) => {
  if (typeof action.value === 'number') action.value = Math.min(action.value, 5);
});
```

### Convention de registration

`initInterceptors()` (appelé dans `initCombat`) vide le registre et enregistre
les intercepteurs natifs. Les intercepteurs spécifiques à un perk ou un gadget
se registrent après cet appel, depuis le code d'initialisation de l'élément.
**Ajouter un nouvel intercepteur ne modifie jamais le pipeline.**

---

## Intercepteurs natifs

| Intercepteur | Type(s) concernés | Logique |
|---|---|---|
| `anchorInterceptor` | `move_power`, `swap_powers` | Bloque si `source` ou `target` (position) porte `area_anchor_status` |
| `immunityInterceptor` | `apply_status` | Bloque si la cible (`entity` ou `area`) porte le drapeau `immunityFlag` défini par le statut |

`immunityInterceptor` remplace le check d'immunité qui était hardcodé dans
`applyStatus` (`statuses.js`). Il intercepte toute action `apply_status` avant
que le statut soit écrit, garantissant que même les appels futurs passent par la
même logique d'immunité.

---

## Exemples concrets

### 1. Bloquer : ancrage interdit le déplacement

```js
// Côté UI (vérification avant de proposer le swap) :
const probe = createAction('swap_powers', { source: fromPos, target: toPos });
const { allowed, reason } = validateAction(combatState, probe);
if (!allowed) announce(strings[reason]); // → "Ce pouvoir est ancré…"

// Côté exécution (si le joueur tente quand même) :
const action = createAction('swap_powers', { source: fromPos, target: toPos });
executeAction(combatState, action);
if (!action.cancelled) { /* effectuer le swap */ }
```

### 2. Bloquer : immunité empêche l'épuisement (iron_will)

```js
// heavy_slam_power.js — aucun check d'immunité dans le pouvoir :
executeAction(ctx.combatState, createAction('apply_status', {
  source: ctx.power,
  target: { type: 'entity', entity: below },
  value: { statusId: 'power_exhaustion_status', stacks: 1 },
}));
// immunityInterceptor annule silencieusement si `below.immuneToNegativeStatus === true`
```

### 3. Modifier : plafonner un soin

```js
// Dans l'init d'un perk hypothétique "frugal_healer_perk" :
registerInterceptor('heal', (action) => {
  if (typeof action.value === 'number') action.value = Math.min(action.value, 5);
});
// Le soin s'exécute normalement, mais action.value est plafonné à 5.
```

### 4. Dégâts de fin de tour (poison)

```js
// hero_poison_status.js — onTurnEnd :
executeAction(combatState, createAction('deal_damage', {
  source: status,
  target: status.target,   // 'duo' | 'enemy'
  value: status.stacks,
  data: { unblockable: true },
}));
// Un futur intercepteur sur 'deal_damage' peut réduire action.value
// (résistance) ou poser action.cancelled = true (immunité temporaire).
```

---

## Clés de localisation

| Clé | Signification |
|---|---|
| `action.blocked.anchored` | Zone source ou cible porte `area_anchor_status` |
| `action.blocked.immune` | Cible porte un drapeau d'immunité contre ce statut |
| `action.blocked.no_source_power` | Zone source vide — `swap_powers` impossible |
| `action.blocked.out_of_range` | Zone cible hors de la portée `data.maxDistance` |
| `action.blocked.no_maneuver` | Aucun point de manœuvre disponible |
