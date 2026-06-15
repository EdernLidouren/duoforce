# Système de statuts (`src/engine/statuses.js`)

Un **status** est un état attaché à une **cible** : le duo, l'ennemi, une
**entité** (un pouvoir), ou une **zone** du plateau. Il influence le combat via
des modificateurs (chaque tour), des triggers (en cours de tour), et une logique
de fin de tour.

## Instance de status (en jeu)

Objet minimal, selon la cible :

```js
// cible duo / enemy
{ id: string, stacks: number, target: 'duo' | 'enemy' }

// cible entity (un pouvoir) — porte en plus une référence à l'objet visé
{ id: string, stacks: number, target: 'entity', entity: object }

// cible area (une zone du plateau) — l'identifiant est la position (0–8)
{ id: string, stacks: number, target: 'area', position: number }
```

`target` prend donc quatre valeurs : `'duo' | 'enemy' | 'entity' | 'area'`.

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
  onLimitReached?: string,   // 'overwrite' | 'ignore' | 'stack_if_same' (voir Limites)
  immunityFlag?: string,     // drapeau d'immunité vérifié sur l'entité visée, ou sur le pouvoir occupant la zone visée
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
`= value(stacks)` (override). Les statuts dont la cible n'a pas d'objet de stats
(`entity`, `area`) sont ignorés par `applyModifiers`.

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
d'appliquer ce status quand le drapeau vaut `true` — soit sur l'**entité** visée
(cible `entity`), soit sur le **pouvoir occupant la zone** visée (cible `area`).
Exemple : `power_exhaustion_status`, `area_freeze_status` et `area_anchor_status`
déclarent tous `immunityFlag: 'immuneToNegativeStatus'`, et `iron_will_power`
porte `immuneToNegativeStatus: true` → ce pouvoir ne peut pas être épuisé, et la
zone qui le contient ne peut être ni gelée ni ancrée.

## Stockage

```js
combatState.statuses = { duo: [], enemy: [], entities: Map }
// + les statuts de zone vivent sur les zones :
combatState.board[position].statuses = []
```

- `duo` / `enemy` : tableaux d'instances.
- `entities` : **Map indexée par l'objet visé** (un pouvoir) → **tableau
  d'instances**. Plusieurs entités peuvent donc être statutées simultanément, et
  chacune peut porter plusieurs statuts.
- `area` : les statuts d'une zone sont stockés **sur la zone elle-même**
  (`board[position].statuses`), pas dans `combatState.statuses`. Ils persistent
  d'un tour à l'autre (la zone survit à la redistribution des pouvoirs).

> Les pouvoirs sont **instanciés en copies distinctes** à la construction du deck
> (`buildDeck`, cf. `src/engine/combat.js`). Deux cartes du même id sont donc des
> objets séparés : l'indexation par instance dans `entities` ne se télescope
> jamais.

## Limites de slots et `onLimitReached`

Chaque type de cible a un **nombre maximal de statuts simultanés**, centralisé
dans `src/engine/gameState.js` :

| Cible | Constante | Valeur |
|---|---|---|
| `duo` | `MAX_STATUSES_PER_DUO` | `Infinity` (illimité) |
| `enemy` | `MAX_STATUSES_PER_ENEMY` | `Infinity` (illimité) |
| `entity` | `MAX_STATUSES_PER_ENTITY` | `Infinity` (illimité) |
| `area` | `MAX_STATUSES_PER_AREA` | `1` |

`applyStatus` procède ainsi :

1. **Même id déjà présent** sur la cible → on met à jour ses `stacks` sans
   consommer de slot : on additionne si `stackable` (ou si `onLimitReached`
   vaut `'stack_if_same'`), sinon on remplace.
2. Sinon, **s'il reste de la place** (`< limite`) → on ajoute le statut.
3. Sinon (**limite atteinte**, ids tous différents) → on applique le champ
   `onLimitReached` de la **définition du statut à ajouter** :
   - `'overwrite'` — on évince le(s) plus ancien(s) pour faire de la place (pour
     une limite de 1, l'ancien statut est simplement remplacé) ;
   - `'ignore'` — le nouveau statut n'est pas appliqué, rien ne change ;
   - `'stack_if_same'` — comme un même id est déjà traité à l'étape 1, il s'agit
     forcément d'un id différent ici → comportement `'ignore'`.

> Pour les cibles illimitées (`duo`/`enemy`/`entity`), l'étape 3 n'est jamais
> atteinte ; `onLimitReached` n'a d'effet pratique que sur les `area` (limite 1).
> `power_exhaustion_status` et `area_freeze_status` déclarent `'overwrite'`.

## Fonctions exposées

| Fonction | Rôle |
|---|---|
| `applyStatus(combatState, instance)` | Applique un status (duo/enemy/entity/area). Gère les limites de slots et `onLimitReached`. Pour `entity`, requiert `instance.entity` et respecte `immunityFlag` ; pour `area`, requiert `instance.position`. |
| `removeStatus(combatState, statusId, target)` | Retire un status d'une cible `duo`/`enemy`. |
| `removeEntityStatus(combatState, entity, statusId)` | Retire un status d'une entité. |
| `removeAreaStatus(combatState, position, statusId)` | Retire un status d'une zone. |
| `hasStatus(combatState, statusId, target)` | `true` si le status est présent sur `duo`/`enemy`. |
| `hasEntityStatus(combatState, entity, statusId)` | `true` si l'entité porte ce status. |
| `hasAreaStatus(combatState, position, statusId)` | `true` si la zone porte ce status. |
| `getStacks(combatState, statusId, target)` | Stacks sur `duo`/`enemy`, ou `0`. |
| `getEntityStacks(combatState, entity, statusId)` | Stacks sur une entité, ou `0`. |
| `getAreaStacks(combatState, position, statusId)` | Stacks sur une zone, ou `0`. |
| `applyModifiers(combatState)` | Applique tous les modificateurs actifs (appelé par `resolveBoard` avant la résolution). |
| `evaluateTriggers(combatState, ctx)` | Évalue/déclenche les triggers actifs (appelé par `resolveBoard` après chaque pouvoir). |
| `processTurnEnd(combatState)` | Appelle `onTurnEnd` de chaque status, puis retire ceux dont les stacks `<= 0` (appelé par `combat.js` en fin de tour). |

## Intégration dans la boucle de combat

1. **Avant la résolution** — `resolveBoard` (sur sa copie de travail, statuts ET
   zones inclus) appelle `applyModifiers`.
2. **Pendant la résolution** — pour chaque zone, on évalue `isResolutionBlocked` :
   le **pouvoir d'abord** (épuisé → bloqué), **la zone ensuite** (gelée → bloqué
   si le pouvoir est offensif ou de soutien). Si rien ne bloque, `customResolve`
   s'exécute ; après chaque pouvoir, `evaluateTriggers` est appelé.
3. **En fin de tour** — `combat.js` (`resolveTurn`) appelle `processTurnEnd`
   après les phases de dégâts, puis ré-évalue victoire/défaite (un statut a pu
   faire tomber des PV).

> **« Le pouvoir résout, puis la zone résout ».** Le contrôle `isResolutionBlocked`
> a lieu *en amont*, mais conceptuellement le gel est un effet de la **zone** qui
> s'applique après celui du pouvoir dans la hiérarchie. L'ordre de vérification
> (pouvoir → zone) reflète cette priorité.

> **Portée et pureté.** `resolveBoard` clone en profondeur statuts ET zones
> (pureté pour l'estimateur). Un statut posé *pendant* la résolution (ex.
> épuisement par `heavy_slam`) vit donc sur la copie : il agit dans la même
> résolution (le pouvoir visé est sauté) puis est jeté. Les statuts persistants
> (poison sur un héros, gel sur une zone) vivent sur l'état réel et sont
> décrémentés par `processTurnEnd`.

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
  immunityFlag: 'immuneToNegativeStatus', // un pouvoir avec ce drapeau est immunisé
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

## Exemple 3 — Gel (`area_freeze_status`, durée, zone)

Cible une **zone** (`target: 'area'`, identifiée par `position`). Tant qu'elle
est active, un pouvoir **offensif ou de soutien** placé sur la zone ne résout pas
(ses effets sont annulés) ; les pouvoirs **special** résolvent normalement. Ce
blocage est appliqué par `resolveBoard` (`isResolutionBlocked`), pas par la
définition, qui ne gère que la durée. Limite de zone = 1 ; `onLimitReached`
`'overwrite'` (un nouveau gel remplace l'ancien).

```js
// src/data/statuses/area_freeze_status.js
export const area_freeze_status = {
  id: 'area_freeze_status',
  stackable: false,
  onLimitReached: 'overwrite',
  immunityFlag: 'immuneToNegativeStatus',
  modifiers: [],
  triggers: [],
  onTurnEnd: (status) => { status.stacks -= 1; },
};
```

Application :
`applyStatus(combatState, { id: 'area_freeze_status', stacks: 1, target: 'area', position: 4 })`.
La zone 4 est gelée ce tour ; son éventuel pouvoir offensif/soutien est neutralisé.
Le statut vit sur `board[4].statuses` et persiste jusqu'à expiration, quels que
soient les pouvoirs qui occupent la zone au fil des tours.

## Exemple 4 — Ancrage (`area_anchor_status`, durée, zone)

Cible une **zone** (`target: 'area'`). Empêche le **déplacement** du pouvoir de
cette zone sur le plateau (ex. échange via une manœuvre). Contrairement au gel,
il **n'affecte pas la résolution** : un pouvoir ancré résout normalement. Même
structure de zone que le gel (limite 1, `onLimitReached: 'overwrite'`, durée
décrémentée par `onTurnEnd`).

```js
// src/data/statuses/area_anchor_status.js
export const area_anchor_status = {
  id: 'area_anchor_status',
  stackable: false,
  onLimitReached: 'overwrite',
  immunityFlag: 'immuneToNegativeStatus',
  modifiers: [],
  triggers: [],
  onTurnEnd: (status) => { status.stacks -= 1; },
};
```

L'interdiction de déplacement n'est pas portée par la définition : elle sera
appliquée par le **système de déplacement** (manœuvres, à venir) qui consultera
`hasAreaStatus(combatState, position, 'area_anchor_status')` avant de bouger un
pouvoir. Aujourd'hui, le statut s'applique, se compte et s'éteint correctement,
mais aucun déplacement n'existe encore à bloquer.

---

# Signatures (perks) — `src/engine/perks.js`

Une **signature** (perk) est un effet **passif et permanent** pour toute la durée
du combat, attaché à un camp. C'est un cousin du statut, mais plus simple.

## Structure d'une signature (`src/data/perks/`)

```js
{
  id: string,
  onTurnEnd?: (combatState, ctx, owner) => void, // fin de tour ; owner: 'duo' | 'enemy'
  modifiers?: [],   // appliqués chaque tour (avant résolution), comme pour un statut
  triggers?:  [],   // évalués après chaque pouvoir, comme pour un statut
}
```

Les `modifiers`/`triggers` ont la même forme que ceux d'un statut, à une nuance
près : une signature n'ayant **pas de stacks**, `modifier.value()` est appelé
**sans argument** (au lieu de `value(stacks)`).

## Stockage : deux listes par camp

```js
combatState.duo.perks   = [] // signatures du duo
combatState.enemy.perks = [] // signatures de l'ennemi
```

Chaque liste peut être vide ou contenir plusieurs signatures. Elles sont
**initialisées dans `combat.js` (`initCombat`)** : le duo agrège les `signature`
de ses héros, l'ennemi prend sa propre `signature`. Les définitions sont
stateless : on stocke directement les objets (pas de copie nécessaire).

## Cycle de vie et points d'intégration

| Moment | Statuts | Signatures (mêmes points) |
|---|---|---|
| Avant la résolution (`resolveBoard`) | `applyModifiers` | `applyPerkModifiers` |
| Après chaque pouvoir (`resolveBoard`) | `evaluateTriggers` | `evaluatePerkTriggers` |
| Fin de tour (`resolveTurn`) | `processTurnEnd` | `processPerksTurnEnd` |

`onTurnEnd(combatState, ctx, owner)` reçoit un `ctx` minimal (`{ combatState }`)
afin de pouvoir consulter l'event bus via `countEvents` (voir
[`context-api.md`](./context-api.md)). Le journal du tour est encore peuplé à ce
moment : un perk peut donc réagir à ce qui s'est passé pendant la résolution.

## Différences avec un statut

| | Statut | Signature (perk) |
|---|---|---|
| Durée | temporaire (`stacks`, expiration) | permanente (durée du combat) |
| `stacks` | oui | non |
| Cible | `duo`/`enemy`/`entity`/`area` | aucune cible propre : agit sur son `owner` |
| Limite de slots | oui (selon la cible) | non : un camp peut en cumuler plusieurs |
| Application en jeu | `applyStatus` | fixée à l'initialisation du combat |

> Un statut appliqué au **duo** ou à l'**ennemi** peut influencer ses signatures
> indirectement, via les `modifiers`/`triggers` existants (ils modifient les
> statistiques que les perks lisent/écrivent). En revanche, une **signature
> elle-même ne peut pas porter de statut** : ce n'est pas une cible (`target`).

## Les deux signatures implémentées

```js
// src/data/perks/rusted_armor_perk.js  (fr « Armure rouillée », en « rusted armor »)
export const rusted_armor_perk = {
  id: 'rusted_armor_perk',
  onTurnEnd: (combatState, ctx, owner) => {
    const subject = combatState[owner];
    if (subject) subject.defense += 2; // +2 défense à l'owner en fin de tour
  },
};

// src/data/perks/blue_comet_mark_perk.js  (fr « marque de la comète bleue », en « blue comet mark »)
import { countEvents } from '../../engine/context.js';
export const blue_comet_mark_perk = {
  id: 'blue_comet_mark_perk',
  onTurnEnd: (combatState, ctx, owner) => {
    const bonus = Math.floor(countEvents(ctx, 'power_blocked_by_area', 'turn') / 3);
    if (bonus > 0) combatState[owner].attack += bonus; // +1 attaque / 3 pouvoirs gelés ce tour
  },
};
```
