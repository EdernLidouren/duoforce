# Context API (`src/engine/context.js`)

Bibliothèque de helpers passés à chaque `customResolve(ctx)` de pouvoir. Le
**contexte** `ctx` est construit par `resolveBoard` pour chaque case occupée :

```js
{
  position,            // index 0–8 de la zone
  power,               // le pouvoir de la zone courante (objet)
  area,                // la zone courante : { position, power, statuses }
  neighbors,           // POUVOIRS voisins orthogonaux (tableau, peut être vide)
  neighborsByDir,      // { left, right, above, below } → pouvoir voisin ou null
  neighborAreasByDir,  // { left, right, above, below } → zone voisine ou null
  boardState,          // les 9 zones (copie de travail)
  combatState,         // état de combat (copie de travail mutée par les écritures)
  effects,             // journal des effets (rempli par les helpers d'écriture)
}
```

> **Important :** `resolveBoard` travaille sur une **copie** du `combatState`
> (duo, enemy, statuts ET zones sont clonés). Les helpers d'écriture mutent donc
> cette copie ; les valeurs sont ensuite commises par `resolveTurn`. L'estimateur
> peut appeler `resolveBoard` autant qu'il veut sans rien corrompre.
>
> Chaque helper d'écriture **mute `ctx.combatState` et ne retourne rien**. Il
> enregistre aussi un descripteur `{ effect, value }` dans `ctx.effects` pour la
> construction des messages de fin de tour.

## Le plateau et les zones (`area`)

Le plateau (`boardState`) est un tableau de **9 zones**. Chaque zone (« area »
dans le code) est un objet à part entière :

```js
{
  position: number,         // 0–8
  power: PowerInstance | null,
  statuses: [],             // statuts de zone (ex. gel) — voir status-system.md
}
```

Le pouvoir d'une zone s'obtient via `area.power`. Les statuts attachés à la zone
(et non au pouvoir) vivent dans `area.statuses` et **persistent d'un tour à
l'autre** (le pouvoir est redistribué chaque tour, pas la zone).

Disposition du plateau (index) :

```
6 | 7 | 8     (ciel)
3 | 4 | 5     (surface)
0 | 1 | 2     (terre)
```

---

## Helpers de lecture du plateau

| Helper | Signature | Lit | Retour |
|---|---|---|---|
| `getNeighbor` | `(ctx, dir)` | `ctx.neighborsByDir[dir]` | **pouvoir** voisin dans `dir` (`'left'\|'right'\|'above'\|'below'`) ou `null` |
| `getNeighborArea` | `(ctx, dir)` | `ctx.neighborAreasByDir[dir]` | **zone** voisine dans `dir` (pour lire `area.statuses` / `area.power`) ou `null` |
| `isInZone` | `(ctx, cells)` | `ctx.position` | `true` si la position est dans le tableau `cells` |
| `hasNeighborOfType` | `(ctx, type)` | `ctx.neighbors` | `true` s'il existe un voisin orthogonal de ce `type` |
| `hasNeighborById` | `(ctx, id)` | `ctx.neighbors` | `true` s'il existe un voisin orthogonal de cet `id` |
| `isIsolated` | `(ctx)` | `ctx.neighbors` | `true` si aucun voisin orthogonal |
| `countNeighborsOfType` | `(ctx, type)` | `ctx.neighbors` | nombre de voisins de ce `type` |

Pour lire une valeur de combat (rare), on accède directement à
`ctx.combatState.duo` / `ctx.combatState.enemy` — ex. `impregnable` teste
`ctx.combatState.duo.defense === 0`.

---

## Helpers d'écriture du combat

Tous mutent `ctx.combatState` et ne retournent rien. `n` est un nombre.

| Helper | Mute | Effet enregistré |
|---|---|---|
| `addAttack(ctx, n)` | `combatState.duo.attack += n` | `add_attack` |
| `removeAttack(ctx, n)` | `combatState.duo.attack -= n` | `remove_attack` |
| `addDefense(ctx, n)` | `combatState.duo.defense += n` | `add_defense` |
| `removeDefense(ctx, n)` | `combatState.duo.defense -= n` | `remove_defense` |
| `addEnemyAttack(ctx, n)` | `combatState.enemy.attack += n` | `add_enemy_attack` |
| `removeEnemyAttack(ctx, n)` | `combatState.enemy.attack -= n` | `remove_enemy_attack` |
| `addEnemyDefense(ctx, n)` | `combatState.enemy.defense += n` | `add_enemy_defense` |
| `removeEnemyDefense(ctx, n)` | `combatState.enemy.defense -= n` | `remove_enemy_defense` |
| `multiplyAttack(ctx, n)` | `combatState.duo.attack *= n` | `multiply_attack` |
| `multiplyDefense(ctx, n)` | `combatState.duo.defense *= n` | `multiply_defense` |
| `multiplyEnemyAttack(ctx, n)` | `combatState.enemy.attack *= n` | `multiply_enemy_attack` |
| `multiplyEnemyDefense(ctx, n)` | `combatState.enemy.defense *= n` | `multiply_enemy_defense` |
| `heal(ctx, n)` | `combatState.duo.hp += n` (plafonné à `maxHp`) | `heal` |
| `enemyHeal(ctx, n)` | `combatState.enemy.hp += n` (plafonné à `maxHp`) | `enemy_heal` |
| `grantManeuver(ctx, n)` | `combatState.duo.maneuver += n` | `maneuver` |
| `grantStrategy(ctx, n)` | `combatState.duo.strategy += n` | `strategy` |
| `grantCredit(ctx, n)` | `combatState.duo.credit += n` | `credit` |

> **Ordre et multiplicateurs :** dans ce modèle impératif, les mutations
> s'appliquent dans l'ordre de résolution (6,7,8,3,4,5,0,1,2). Un
> `multiplyAttack` ne multiplie donc que l'attaque accumulée *à ce moment-là*
> (contrairement à l'ancien modèle où tous les multiplicateurs étaient appliqués
> en dernier).

### Renforcer des voisins

| Helper | Effet |
|---|---|
| `empowerNeighborsOfType(ctx, type, amount)` | Enregistre un bonus d'attaque de `amount` pour chaque voisin orthogonal du `type` donné. |

Le bonus n'est pas appliqué immédiatement : il est consommé lors de la
**finalisation** de `resolveBoard`, APRÈS la résolution de tous les pouvoirs.
Cela garantit que **tous** les voisins concernés en profitent, quel que soit
l'ordre de résolution. Le bonus compte dans l'attaque du duo et apparaît dans le
message du voisin renforcé (fusionné à son `add_attack`), pas dans celui du
pouvoir qui renforce. Exemple : `iron_grip_power` fait
`empowerNeighborsOfType(ctx, 'offensive', 2)`.

---

## Appliquer un statut à un voisin (entité)

Pour poser un statut sur un autre pouvoir du plateau, on importe `applyStatus`
depuis `../../engine/statuses.js` et on vise l'objet pouvoir (target `'entity'`).
L'immunité éventuelle est vérifiée par `applyStatus` (voir
[`status-system.md`](./status-system.md)).

```js
import { getNeighbor, addAttack } from '../../engine/context.js';
import { applyStatus } from '../../engine/statuses.js';

// heavy_slam : +4 attaque, épuise le pouvoir directement en dessous.
customResolve: (ctx) => {
  addAttack(ctx, 4);
  const below = getNeighbor(ctx, 'below');
  if (below) {
    applyStatus(ctx.combatState, {
      id: 'power_exhaustion_status', stacks: 1, target: 'entity', entity: below,
    });
  }
}
```

---

## Exemple d'usage dans un `customResolve`

```js
import { Rarity } from './rarity.js';
import { getNeighbor, addAttack } from '../../engine/context.js';

// force_palm : +3 attaque si un voisin de même ligne est offensif, +1 sinon.
export const force_palm_power = {
  id: 'force_palm_power',
  type: 'offensive',
  rarity: Rarity.COMMON,
  customResolve: (ctx) => {
    const left = getNeighbor(ctx, 'left');
    const right = getNeighbor(ctx, 'right');
    const sameRowOffensive =
      (left && left.type === 'offensive') || (right && right.type === 'offensive');
    addAttack(ctx, sameRowOffensive ? 3 : 1);
  },
};
```

Chaque branche n'appelle que les helpers nécessaires : la sémantique « première
condition satisfaite » se traduit naturellement par des `if / else if / else`.
