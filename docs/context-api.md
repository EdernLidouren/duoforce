# Context API (`src/engine/context.js`)

Bibliothèque de helpers passés à chaque `customResolve(ctx)` de pouvoir. Le
**contexte** `ctx` est construit par `resolveBoard` pour chaque case occupée :

```js
{
  position,        // index 0–8 de la case du pouvoir
  neighbors,       // pouvoirs voisins orthogonaux (tableau, peut être vide)
  neighborsByDir,  // { left, right, above, below } → pouvoir voisin ou null
  boardState,      // les 9 cases (copie de travail), null si vide
  combatState,     // état de combat (copie de travail mutée par les écritures)
  effects,         // journal des effets (rempli par les helpers d'écriture)
}
```

> **Important :** `resolveBoard` travaille sur une **copie** du `combatState`.
> Les helpers d'écriture mutent donc cette copie (les valeurs sont ensuite
> commises par `resolveTurn`). Côté estimation, rien n'est corrompu.
>
> Chaque helper d'écriture **mute `ctx.combatState` et ne retourne rien**. Il
> enregistre aussi un descripteur `{ effect, value }` dans `ctx.effects` pour la
> construction des messages de fin de tour.

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
| `getNeighbor` | `(ctx, dir)` | `ctx.neighborsByDir[dir]` | pouvoir voisin dans `dir` (`'left'\|'right'\|'above'\|'below'`) ou `null` |
| `isInZone` | `(ctx, cells)` | `ctx.position` | `true` si la position est dans le tableau `cells` |
| `hasNeighborOfType` | `(ctx, type)` | `ctx.neighbors` | `true` s'il existe un voisin orthogonal de ce `type` |
| `hasNeighborById` | `(ctx, id)` | `ctx.neighbors` | `true` s'il existe un voisin orthogonal de cet `id` |
| `isIsolated` | `(ctx)` | `ctx.neighbors` | `true` si aucun voisin orthogonal |
| `countNeighborsOfType` | `(ctx, type)` | `ctx.neighbors` | nombre de voisins de ce `type` |

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

---

## Exemple d'usage dans un `customResolve`

```js
import { Rarity } from './rarity.js';
import {
  isInZone, hasNeighborOfType, hasNeighborById,
  addAttack, removeAttack, multiplyAttack,
} from '../../engine/context.js';

export const power_aerial_strike = {
  id: 'power_aerial_strike',
  type: 'offensive',
  rarity: Rarity.UNCOMMON,
  customResolve: (ctx) => {
    if (isInZone(ctx, [6, 7, 8])) addAttack(ctx, 4);          // +4 attaque dans le ciel
    else if (isInZone(ctx, [0, 1, 2])) removeAttack(ctx, 1);  // -1 attaque en terre
    else if (hasNeighborOfType(ctx, 'offensive')) addAttack(ctx, 2);
    else addAttack(ctx, 2);
  },
};

// Un pouvoir qui double l'attaque s'il est à côté d'un bouclier :
//   if (hasNeighborById(ctx, 'power_shield')) multiplyAttack(ctx, 2);
```

Chaque branche n'appelle qu'un seul helper : la sémantique « première condition
satisfaite » se traduit naturellement par des `if / else if / else`.
