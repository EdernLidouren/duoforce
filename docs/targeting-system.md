# Système de ciblage (Targeting System)

`src/ui/targeting.js` — orchestrateur de sélections multi-étapes.

## Vocabulaire

| Terme | Rôle |
|---|---|
| **TargetingSequence** | Tableau ordonné de `TargetingStep` décrivant une sélection complète. |
| **TargetingStep** | Une étape unique — déclare le type de cible, sa validation, et les libellés associés. |
| **TargetingResolver** | Moteur qui déroule une séquence pas à pas, accumule les cibles, et restitue l'ensemble à l'appelant. |

## Structure d'une TargetingStep

```js
{
  // Champ commun à tous les types :
  targetType:   'area' | 'list' | 'power' | 'hero' | 'gadget',
  label:        string | (collectedSoFar) => string,   // annonce/titre de l'étape

  // Pour targetType === 'area' (sélection sur la grille du plateau) :
  getZoneState: (pos, collectedSoFar, resolveContext) => { status, label?, sources? },
  forbiddenPrefix: string,    // préfixe annoncé pour les zones forbidden
  initialPosition: number | (collectedSoFar) => number,  // défaut 4 (centre)

  // Pour targetType === 'list' (menu de sélection linéaire) :
  getItems:     (collectedSoFar, resolveContext) => any[],
  describeItem: (item, strings) => string,
  autoSelect:   boolean,  // confirme silencieusement si 1 seul item
  emptyLabel:   string,   // annoncé si aucun item, puis annulation
}
```

`collectedSoFar` est le tableau des cibles déjà collectées aux étapes précédentes.
Cela permet les **étapes dépendantes** : `getZoneState` ou `getItems` d'une étape
peut inspecter le résultat des étapes précédentes pour filtrer les cibles valides.

`getZoneState` retourne un objet compatible `createZoneSelector` :
- `status`: `'selectable'` | `'out_of_range'` | `'forbidden'`
- `label?`: libellé spécifique à cette zone (prioritaire sur `forbiddenPrefix`)
- `sources?`: origines du blocage (pour debug)

## Types d'étape et briques de sélection

| `targetType` | Brique utilisée | Statut |
|---|---|---|
| `'area'` | `createZoneSelector` (grille 3×3) | Implémenté |
| `'list'` | `createStrategyPicker` (liste linéaire) | Implémenté |
| `'power'` | — | Stub (console.warn + annulation) |
| `'hero'` | — | Stub |
| `'gadget'` | — | Stub |

Les stubs annulent proprement la séquence sans appliquer aucun effet.

## Annulation en pile

- **Échap à une étape > 0** : recule d'une étape. La cible de l'étape quittée est
  oubliée. L'étape précédente se rouvre avec son interface d'origine.
- **Échap à l'étape 0** : annule toute la séquence. `onCancel()` est appelé.
  Aucune cible n'est restituée, aucun effet n'est appliqué, aucune ressource n'est consommée.

## Pipeline d'actions et consommation de ressources

Le resolver ne consomme aucune ressource et n'exécute aucune action. Il collecte
des cibles et les restitue via `onComplete(collectedTargets)`.

L'appelant est responsable de :
1. Construire les actions avec les cibles collectées.
2. Les faire passer par le pipeline (`executeAction`).
3. Ne consommer les ressources (manœuvre, stratégie…) **qu'après** validation
   complète de la séquence ET réussite du pipeline.

Cette règle garantit que l'annulation (Échap à l'étape 0) ne coûte jamais rien.

## Intégration dans combat.js

```js
const resolver = createTargetingResolver({
  steps: [ /* TargetingStep[] */ ],
  resolveContext: { tdByIndex, announce: context.announce, strings, describeCell: describeCellAt },
  onComplete: (collectedTargets) => {
    activeSelector = null;
    boardKeyHandler = onBoardKey;
    // Appliquer l'effet, consommer les ressources ici seulement.
  },
  onCancel: () => {
    activeSelector = null;
    boardKeyHandler = onBoardKey;
    // Annoncer l'annulation, rien d'autre.
  },
});

activeSelector = resolver;
boardKeyHandler = (e) => resolver.handleKey(e);
controller.activate(zoneIndex, { silent: true });
resolver.start();
```

`activeSelector.close()` nettoie le CSS et ferme le picker actif si le caller
doit interrompre la séquence de l'extérieur.

## Exemple concret : séquence à deux étapes dépendantes

Scénario : sélectionner une zone source, puis un pouvoir dans une zone adjacente.
L'étape 2 filtre ses options en fonction du choix de l'étape 1.

```js
createTargetingResolver({
  steps: [
    {
      targetType: 'area',
      label: 'Étape 1 : choisissez une zone avec un pouvoir.',
      getZoneState: (pos, _collected, { /* ctx */ }) =>
        board[pos]?.power ? { status: 'selectable' } : { status: 'forbidden' },
      initialPosition: currentBoardIndex,
    },
    {
      targetType: 'list',
      // label reçoit collectedSoFar = [sourcePos] pour afficher le contexte.
      label: (collected) => `Étape 2 : choisissez un pouvoir adjacent à la zone ${collected[0]}.`,
      getItems: (collected) =>
        reachablePositions(collected[0], 1)        // étape 2 dépend de l'étape 1
          .filter((p) => board[p]?.power)
          .map((p) => ({ pos: p, power: board[p].power })),
      describeItem: (item, strings) => powerName(item.power, strings),
      autoSelect: false,
      emptyLabel: 'Aucun pouvoir adjacent.',
    },
  ],
  resolveContext: { /* ... */ },
  onComplete: ([sourcePos, adjacentItem]) => {
    // Appliquer l'effet avec sourcePos et adjacentItem.pos.
    // Consommer les ressources ici, après validation complète.
  },
  onCancel: () => { /* rien consommé, annoncer annulation */ },
});
```

**Vérification** :
- L'étape 2 ne propose que des zones adjacentes à l'étape 1 contenant un pouvoir.
- Échap à l'étape 2 → retour à l'étape 1 (area selector se rouvre).
- Échap à l'étape 1 → `onCancel()` : aucun effet, aucune ressource.

## Migration : manœuvre et stratégie

### Manœuvre (1 étape)

La manœuvre est une séquence à 1 étape de type `'area'`. La source est déjà
connue (position du curseur au moment de la pression d'Entrée). Le resolver
sélectionne la cible, valide via `validateAction` (distance, ancrage, source),
puis `executeManeuver` est appelé dans `onComplete`.

Le point de manœuvre est consommé par `executeManeuver` **après** l'échange
réussi — comportement identique à l'implémentation précédente.

### Stratégie (2 étapes dépendantes)

La stratégie est une séquence à 2 étapes :
1. **Étape 1** (`'area'`) : sélectionner le pouvoir à remplacer. La validation
   utilise `canUseStrategySource` (`removable` + `discardable`). Le sélecteur
   s'ouvre à la position du curseur courant.
2. **Étape 2** (`'list'`) : choisir le remplaçant parmi `buildCandidates(state, sourcePos)`
   — filtré par `canDraw` + `canPlace`. Si 1 seul candidat, `autoSelect: true`
   confirme sans ouvrir de menu (comportement identique à l'ancienne sélection automatique).

Le point de stratégie est consommé dans `executeStrategy`, appelé dans `onComplete`
après validation complète des deux étapes.

Annuler à l'étape 2 (Échap) revient à l'étape 1 sans rien consommer.
Annuler à l'étape 1 (Échap) annule tout sans rien consommer.

## Phases de combat et ciblage

Le resolver est agnostique des phases — il ne lit pas `combatState.phase`. C'est
l'appelant qui vérifie la phase **avant d'ouvrir une séquence**, via
`canPlayerAct(combatState)`.

### Règle : ouvrir une séquence seulement pendant `play`

Toute action déclenchée par le joueur (manœuvre, stratégie, gadget) doit
vérifier `canPlayerAct` avant d'appeler `resolver.start()` :

```js
// Vérification dans l'UI (retour immédiat avant d'ouvrir le resolver) :
if (!canPlayerAct(state)) {
  say(strings.combat.wrongPhase);
  return;
}
// … construire le resolver …
resolver.start();
```

La fonction d'exécution dans le moteur (ex. `executeManeuver`, `executeStrategy`)
répète la vérification comme garde robuste — pour le cas où la séquence aurait
été ouverte en dehors du flux normal.

### Effets et phases

Les effets exécutés dans `onComplete` se produisent **toujours pendant `play`**
(puisque `canPlayerAct` est vérifié à l'ouverture). Un effet ne devrait pas lire
`combatState.phase` pour distinguer son comportement sauf cas de design explicite.

Pour un effet actif sur plusieurs phases (mécanique de trigger futur) :

```js
import { isPhaseActiveFor } from '../engine/combatPhases.js';
import { COMBAT_PHASES } from '../engine/gameState.js';

// Exemple : effet "début de tour ou jeu" — n'est pas dans onComplete, c'est
// un trigger passif branché sur phase_changed.
if (isPhaseActiveFor(state, [COMBAT_PHASES.DISTRIBUTION, COMBAT_PHASES.PLAY])) {
  applyPassiveEffect(state);
}
```

Voir `docs/combat-phases.md` pour la liste complète des phases et leur sémantique.

## Contrat complet appelant/resolver

| Responsabilité | Resolver | Appelant |
|---|---|---|
| Orchestrer les étapes | ✓ | |
| Gérer Échap (annulation en pile) | ✓ | |
| Vérifier la phase avant d'ouvrir | | ✓ (`canPlayerAct`) |
| Consommer les ressources | | ✓ (dans `onComplete` seulement) |
| Exécuter les actions de jeu | | ✓ (dans `onComplete` seulement) |
| Annoncer l'annulation | | ✓ (dans `onCancel`) |
| Ne rien consommer en cas d'annulation | ✓ (garantit le non-appel de onComplete) | ✓ (onCancel ne consomme pas) |
