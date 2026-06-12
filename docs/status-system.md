# Système de statuts (`src/engine/statuses.js`)

Un **status** est un état persistant attaché au duo, à l'ennemi, ou à une entité
(pouvoir/sidekick/gadget). Il influence le combat via des modificateurs (chaque
tour), des triggers (en cours de tour), et une logique de fin de tour.

## Instance de status (en jeu)

Objet minimal stocké dans le `combatState` :

```js
{
  id: string,      // référence à la définition
  stacks: number,  // valeur unique — sémantique définie par la définition
  target: 'duo' | 'enemy' | 'entity',
}
```

## Sémantique de `stacks`

`stacks` est **une seule valeur** dont le sens dépend du status (à la manière de
*Slay the Spire*) :

- **Intensité** — ex. Poison : `stacks` = dégâts infligés chaque fin de tour.
- **Durée** — ex. Fatigue : `stacks` = nombre de tours restants, décrémenté à
  chaque fin de tour, expire à 0.
- **Les deux** — un status peut interpréter `stacks` comme intensité *et* durée
  (ex. décrémenter ET infliger `stacks` dégâts). C'est à la définition de
  décider, dans ses `modifiers` / `triggers` / `onTurnEnd`.

Le moteur n'impose aucune sémantique : il ne fait que stocker la valeur,
l'exposer aux fonctions de la définition, et **retirer le status quand
`stacks <= 0`** après la fin de tour.

## Définition de status (`src/data/statuses/`)

```js
{
  id: string,
  stackable: boolean,        // réappliquer cumule les stacks (true) ou remplace (false)
  modifiers: [],             // appliqués chaque tour, avant la résolution
  triggers: [],              // effets conditionnels évalués après chaque pouvoir
  onTurnEnd: (status, combatState) => void,  // dégâts, décrément, expiration...
}
```

### Modifier

Altère une propriété du sujet (`combatState[target]`, soit `duo` soit `enemy`) :

```js
{
  property: 'attack' | 'defense' | 'maneuver' | 'credit' | ...,
  operation: 'add' | 'multiply' | 'override',
  value: (stacks) => number,   // fonction de stacks → intensité proportionnelle
}
```

`applyModifiers` applique, pour chaque status actif, chaque modifier :
`subject[property]` ← `+ value(stacks)` (add) / `* value(stacks)` (multiply) /
`= value(stacks)` (override).

### Trigger

Conditionne un effet à une situation :

```js
{
  condition: (combatState) => boolean,
  effect: (ctx, stacks) => void,   // mute via les helpers de context.js
}
```

`evaluateTriggers` est appelé **après chaque pouvoir résolu** : un trigger dont
la `condition` est vraie déclenche son `effect` (qui mute le contexte courant).
Un trigger peut donc se déclencher plusieurs fois dans un même tour — à la
définition d'en tenir compte.

## Stockage

```js
combatState.statuses = { duo: [], enemy: [], entities: Map }
```

- `duo` / `enemy` : tableaux d'instances.
- `entities` : `Map` indexée par id de status (support minimal des statuts
  d'entité — l'API actuelle ne porte pas d'identité d'entité distincte).

## Fonctions exposées

| Fonction | Rôle |
|---|---|
| `applyStatus(combatState, statusInstance)` | Ajoute le status ; s'il est déjà présent, **cumule** les stacks si `stackable`, **remplace** sinon. |
| `removeStatus(combatState, statusId, target)` | Retire un status d'une cible. |
| `hasStatus(combatState, statusId, target)` | `true` si le status est présent sur la cible. |
| `getStacks(combatState, statusId, target)` | Stacks du status sur la cible, ou `0`. |
| `applyModifiers(combatState)` | Applique tous les modificateurs actifs (appelé par `resolveBoard` avant la résolution). |
| `evaluateTriggers(combatState, ctx)` | Évalue/déclenche les triggers actifs (appelé par `resolveBoard` après chaque pouvoir). |
| `processTurnEnd(combatState)` | Appelle `onTurnEnd` de chaque status, puis retire ceux dont les stacks `<= 0` (appelé par `combat.js` en fin de tour). |

## Intégration dans la boucle de combat

1. **Avant la résolution** — `resolveBoard` appelle `applyModifiers` (sur sa
   copie de travail).
2. **Pendant la résolution** — après chaque pouvoir, `resolveBoard` appelle
   `evaluateTriggers`.
3. **En fin de tour** — `combat.js` (`resolveTurn`) appelle `processTurnEnd`
   après les phases de dégâts, puis ré-évalue victoire/défaite (un statut a pu
   faire tomber des PV).

---

## Exemple 1 — Fatigue 3 (durée)

Malus de défense **fixe** tant qu'elle est active ; `stacks` = tours restants,
décrémenté chaque fin de tour, expire à 0.

```js
// src/data/statuses/status_fatigue.js
export const status_fatigue = {
  id: 'status_fatigue',
  stackable: false,                 // réappliquer remet la durée (ne cumule pas)
  modifiers: [
    { property: 'defense', operation: 'add', value: () => -2 }, // malus FIXE
  ],
  triggers: [],
  onTurnEnd: (status) => {
    status.stacks -= 1;             // décrément de durée ; retiré à 0 par le moteur
  },
};
```

Application : `applyStatus(combatState, { id: 'status_fatigue', stacks: 3, target: 'duo' })`.
Chaque tour : `-2` défense ; après 3 fins de tour, le status expire.

## Exemple 2 — Poison 3 (intensité)

Inflige `stacks` dégâts chaque fin de tour, **sans décrémentation automatique**
— c'est au poison de décider s'il se réduit (ici il persiste).

```js
// src/data/statuses/status_poison.js
export const status_poison = {
  id: 'status_poison',
  stackable: true,                  // réappliquer cumule l'intensité
  modifiers: [],
  triggers: [],
  onTurnEnd: (status, combatState) => {
    const subject = combatState[status.target];   // duo / enemy
    if (subject) subject.hp -= status.stacks;      // dégâts = stacks, pas de décrément
  },
};
```

Application : `applyStatus(combatState, { id: 'status_poison', stacks: 3, target: 'enemy' })`.
Chaque tour : l'ennemi perd 3 PV ; le poison reste à 3 jusqu'à retrait explicite.
Réappliquer Poison 2 (stackable) le porte à 5.
