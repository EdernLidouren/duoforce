# Système de statuts (`src/engine/statuses.js`)

Un **status** est un état attaché au duo, à l'ennemi, ou à une entité (un pouvoir
sur le plateau). Il influence le combat via des modificateurs (chaque tour), des
triggers (en cours de tour), et une logique de fin de tour.

## Instance de status (en jeu)

Objet minimal stocké dans le `combatState` :

```js
// cible duo / enemy
{ id: string, stacks: number, target: 'duo' | 'enemy' }

// cible entity (un pouvoir) — porte en plus une référence à l'objet visé
{ id: string, stacks: number, target: 'entity', entity: object }
```

## Sémantique de `stacks`

`stacks` est **une seule valeur** dont le sens dépend du status (à la manière de
*Slay the Spire*) :

- **Intensité** — ex. Poison : `stacks` = dégâts infligés chaque fin de tour.
- **Durée** — ex. Épuisement : `stacks` = nombre de tours restants, décrémenté à
  chaque fin de tour, expire à 0.
- **Les deux** — un status peut interpréter `stacks` comme intensité *et* durée
  (ex. infliger `stacks` dégâts ET décrémenter — cf. le Poison ci-dessous).

Le moteur n'impose aucune sémantique : il stocke la valeur, l'expose aux
fonctions de la définition, et **retire le status quand `stacks <= 0`** après la
fin de tour.

## Définition de status (`src/data/statuses/`)

```js
{
  id: string,
  stackable: boolean,        // réappliquer cumule les stacks (true) ou remplace (false)
  immunityFlag?: string,     // (entity) drapeau d'immunité vérifié sur l'entité visée
  modifiers: [],             // appliqués chaque tour, avant la résolution
  triggers: [],              // effets conditionnels évalués après chaque pouvoir
  onTurnEnd: (status, combatState) => void,  // dégâts, décrément, expiration...
}
```

Les définitions ne portent **pas** de `target` : c'est l'instance qui le porte,
fixé au moment de l'application.

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
`= value(stacks)` (override). Les statuts d'entité (pas de `combatState['entity']`)
sont ignorés par `applyModifiers`.

### Trigger

Conditionne un effet à une situation :

```js
{
  condition: (combatState) => boolean,
  effect: (ctx, stacks) => void,   // mute via les helpers de context.js
}
```

`evaluateTriggers` est appelé **après chaque pouvoir résolu** : un trigger dont
la `condition` est vraie déclenche son `effect`. Un trigger peut donc se
déclencher plusieurs fois dans un même tour — à la définition d'en tenir compte.

### Immunité (`immunityFlag`)

Si une définition déclare `immunityFlag: 'xxx'`, alors `applyStatus` **refuse**
d'appliquer ce status à une entité qui porte ce drapeau à `true`. Exemple :
`power_exhaustion_status` a `immunityFlag: 'immuneToExhaustion'`, et
`iron_will_power` porte `immuneToExhaustion: true` → il ne peut jamais être
épuisé.

## Stockage

```js
combatState.statuses = { duo: [], enemy: [], entities: Map }
```

- `duo` / `enemy` : tableaux d'instances.
- `entities` : **Map indexée par l'objet visé** (un pouvoir) → **tableau
  d'instances**. Plusieurs entités peuvent donc être statutées simultanément, et
  chacune peut porter plusieurs statuts.

> Les pouvoirs sont **instanciés en copies distinctes** à la construction du deck
> (`buildDeck`, cf. `src/engine/combat.js`). Deux cartes du même id sont donc des
> objets séparés : l'indexation par instance dans `entities` ne se télescope
> jamais.

## Fonctions exposées

| Fonction | Rôle |
|---|---|
| `applyStatus(combatState, instance)` | Applique un status (duo/enemy ou entity). Cumule si `stackable`, sinon remplace. Pour `entity`, requiert `instance.entity` et respecte `immunityFlag`. |
| `removeStatus(combatState, statusId, target)` | Retire un status d'une cible `duo`/`enemy`. |
| `removeEntityStatus(combatState, entity, statusId)` | Retire un status d'une entité. |
| `hasStatus(combatState, statusId, target)` | `true` si le status est présent sur `duo`/`enemy`. |
| `hasEntityStatus(combatState, entity, statusId)` | `true` si l'entité porte ce status. |
| `getStacks(combatState, statusId, target)` | Stacks sur `duo`/`enemy`, ou `0`. |
| `getEntityStacks(combatState, entity, statusId)` | Stacks sur une entité, ou `0`. |
| `applyModifiers(combatState)` | Applique tous les modificateurs actifs (appelé par `resolveBoard` avant la résolution). |
| `evaluateTriggers(combatState, ctx)` | Évalue/déclenche les triggers actifs (appelé par `resolveBoard` après chaque pouvoir). |
| `processTurnEnd(combatState)` | Appelle `onTurnEnd` de chaque status, puis retire ceux dont les stacks `<= 0` (appelé par `combat.js` en fin de tour). |

## Intégration dans la boucle de combat

1. **Avant la résolution** — `resolveBoard` (sur sa copie de travail, statuts
   inclus) appelle `applyModifiers`.
2. **Pendant la résolution** — un pouvoir **épuisé** (portant
   `power_exhaustion_status`) voit son `customResolve` **sauté** ; après chaque
   pouvoir résolu, `evaluateTriggers` est appelé.
3. **En fin de tour** — `combat.js` (`resolveTurn`) appelle `processTurnEnd`
   après les phases de dégâts, puis ré-évalue victoire/défaite (un statut a pu
   faire tomber des PV).

> **Portée des statuts d'entité.** `resolveBoard` clone les statuts en
> profondeur (pureté pour l'estimateur). Un statut posé sur un pouvoir *pendant*
> la résolution (ex. épuisement par `heavy_slam`) vit donc sur la copie : il
> agit dans la même résolution (le pouvoir visé est sauté) puis est jeté. Comme
> le plateau est entièrement redistribué à chaque début de tour, c'est la portée
> voulue (effet intra-tour).

---

## Exemple 1 — Épuisement (`power_exhaustion_status`, durée, entité)

Empêche l'activation d'un pouvoir. `stacks` = tours restants ; le saut du
`customResolve` est assuré par `resolveBoard`. La définition ne gère que la
durée. Le drapeau d'immunité protège certains pouvoirs.

```js
// src/data/statuses/power_exhaustion_status.js
export const power_exhaustion_status = {
  id: 'power_exhaustion_status',
  stackable: false,                    // réappliquer réinitialise la durée
  immunityFlag: 'immuneToExhaustion',  // un pouvoir avec ce drapeau est immunisé
  modifiers: [],
  triggers: [],
  onTurnEnd: (status) => { status.stacks -= 1; },
};
```

Application (par `heavy_slam_power`) :
`applyStatus(combatState, { id: 'power_exhaustion_status', stacks: 1, target: 'entity', entity: pouvoirEnDessous })`.

## Exemple 2 — Poison (`hero_poison_status`, intensité + durée)

Inflige `stacks` dégâts **imblocables** (ils ignorent la défense) en fin de tour,
puis s'estompe de 1.

```js
// src/data/statuses/hero_poison_status.js
export const hero_poison_status = {
  id: 'hero_poison_status',
  stackable: true,                     // réappliquer cumule l'intensité
  modifiers: [],
  triggers: [],
  onTurnEnd: (status, combatState) => {
    const subject = combatState[status.target];   // duo / enemy
    if (subject) subject.hp -= status.stacks;     // dégâts directs, ignorent la défense
    status.stacks -= 1;                            // le poison s'estompe
  },
};
```

Application :
`applyStatus(combatState, { id: 'hero_poison_status', stacks: 3, target: 'enemy' })`.
Tour 1 : −3 PV, stacks → 2 ; tour 2 : −2, → 1 ; tour 3 : −1, → 0 (retiré).
Réappliquer Poison 2 (stackable) cumule l'intensité restante.
