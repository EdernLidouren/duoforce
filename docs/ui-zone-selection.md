# Sélecteur de zone (`src/ui/zoneSelector.js`)

Composant générique de sélection d'une zone sur le plateau de combat. Réutilisable par la manœuvre (deux passes : source puis cible), les gadgets ciblant une zone, et tout futur effet qui demande au joueur de désigner une case.

Ce composant ne contient aucune règle de jeu. Toute logique de validité est fournie par l'appelant via un callback `getZoneState`.

---

## Signature

```js
import { createZoneSelector } from '../ui/zoneSelector.js';

const selector = createZoneSelector({
  tdByIndex,        // Map<number, HTMLElement> — cellules <td> du plateau
  strings,          // pack de langue
  announce,         // { polite: Function }
  getZoneState,     // (pos: number) => { status, sources? } — voir ci-dessous
  describeCell,     // (pos: number) => string — description NVDA d'une case
  openMessage,      // string — annoncé à l'ouverture
  forbiddenPrefix,  // string — préfixe des zones interdites (ex. "Échange interdit")
  onConfirm,        // (pos: number) => void
  onCancel,         // () => void
  initialPosition,  // number, défaut 4 (centre)
});
```

Retourne `{ open, close, handleKey }`.

### `getZoneState(pos)`

Retourne le statut d'une zone :

| `status`        | Signification |
|-----------------|---------------|
| `'selectable'`  | Le joueur peut confirmer cette zone. |
| `'out_of_range'`| Zone existante mais hors portée ou hors critère. |
| `'forbidden'`   | Zone bloquée par une règle (ancrage, etc.). |

`sources` (optionnel, tableau de chaînes) : raisons de l'interdiction. Non utilisé actuellement par le composant, prévu pour un affichage futur.

---

## Intégration dans une scène

Le sélecteur ne crée pas de listener propre. Il expose `handleKey(event) → boolean` qui doit remplacer temporairement le handler de la zone Plateau dans `createZoneController`.

**Pattern recommandé** (indirection mutable) :

```js
// Dans la scène :
let boardKeyHandler = onBoardKey;
// Zone Plateau déclarée avec l'indirection :
{ id: 'board', ..., onKey: (e) => boardKeyHandler(e) }

// Ouverture du sélecteur :
const selector = createZoneSelector({ ..., onConfirm, onCancel });
boardKeyHandler = selector.handleKey;
selector.open();

// Dans onConfirm / onCancel — restauration :
boardKeyHandler = onBoardKey;
```

---

## Clavier

| Touche    | Comportement |
|-----------|---|
| `↑↓←→`   | Déplace le curseur (bord = clamp, pas de wrap) |
| `Entrée` / `Espace` | Confirme si `selectable` ; annonce le motif sinon |
| `Échap`   | Annule → `onCancel()` |

---

## Annonces NVDA

Toutes les annonces passent par `announce.polite()`. Aucune région ARIA propre.

| Situation | Annonce |
|---|---|
| Ouverture | `openMessage` |
| Navigation → `selectable` | `describeCell(pos)` |
| Navigation → `out_of_range` | `strings.zoneSelector.outOfRange + '. ' + describeCell(pos)` |
| Navigation → `forbidden` | `forbiddenPrefix + '. ' + describeCell(pos)` |
| Entrée sur `out_of_range` | `strings.zoneSelector.outOfRange` |
| Entrée sur `forbidden` | `forbiddenPrefix` |
| Confirmation | géré par l'appelant dans `onConfirm` |
| Annulation | géré par l'appelant dans `onCancel` |

---

## Classes CSS

Ajoutées sur les `<td>` du plateau pendant la sélection, supprimées à la fermeture.

| Classe                 | Signification |
|------------------------|---|
| `zone-sel--cursor`     | Case courante du curseur |
| `zone-sel--selectable` | Zone sélectionnable |
| `zone-sel--out-of-range` | Hors portée |
| `zone-sel--forbidden`  | Interdite |

Ces classes coexistent avec `is-cursor` (cursor normal du plateau) — les deux systèmes sont indépendants.

---

## Utilitaires partagés (`src/ui/boardText.js`)

Ce module factorise la géométrie et la description des cases, réutilisées par `combat.js` et `zoneSelector.js`.

```js
import { BOARD_ROWS, indexToXY, xyToIndex, describeBoardCell } from '../ui/boardText.js';
```

| Export | Rôle |
|---|---|
| `BOARD_ROWS` | Disposition du plateau (ciel/surface/terre, indices) |
| `indexToXY(index)` | Index → `{ x, y }` |
| `xyToIndex(x, y)` | `{ x, y }` → index |
| `describeBoardCell(index, board, strings, combatState)` | Description NVDA complète d'une case |

---

## Manœuvre — intégration dans `combat.js`

La manœuvre est le premier consommateur réel du sélecteur. Elle n'utilise qu'une passe (source déjà connue → sélection de la cible).

### Flux complet

```
1. Joueur appuie sur Entrée sur une case du plateau
   ├─ Zone vide → rien (touche consommée, silence)
   ├─ Zone occupée + !canStartManeuver → announce maneuver.no_points
   └─ Zone occupée + canStartManeuver → openManeuverSelector(sourcePos)

2. openManeuverSelector(sourcePos)
   ├─ getZoneState(pos) :
   │   ├─ pos === sourcePos → 'forbidden'  (échange avec soi-même impossible)
   │   ├─ validateAction(swap_powers, maxDistance:1).reason === 'out_of_range' → 'out_of_range'
   │   ├─ allowed → 'selectable'
   │   └─ autre raison → 'forbidden', sources:[reason]
   ├─ initialPosition = sourcePos
   ├─ openMessage = format(maneuver.selectTarget, { name: powerName(sourcePower) })
   └─ forbiddenPrefix = maneuver.swapForbidden

3. Confirmation (Entrée sur case selectable)
   ├─ executeManeuver(state, sourcePos, targetPos)
   │   ├─ swap_powers via executeAction (intercepteurs + exécuteur)
   │   └─ spend_maneuver uniquement si swap réussi
   ├─ success → announce maneuver.swapDone
   ├─ failure (edge case) → announce raison localisée
   └─ updateView()

4. Annulation (Échap)
   └─ announce maneuver.cancelled
```

La source est **pré-déterminée** par la zone sur laquelle le joueur appuie — il n'y a pas de « première passe » de sélection de source dans cette implémentation.

### Clés de localisation manœuvre

| Clé | Usage |
|---|---|
| `maneuver.no_points` | Refus à l'ouverture (aucun point de manœuvre) |
| `maneuver.selectTarget` | Message d'ouverture — gabarit `{name}` = nom du pouvoir source |
| `maneuver.swapForbidden` | Préfixe pour les zones interdites dans le sélecteur |
| `maneuver.swapDone` | Confirmation après échange réussi |
| `maneuver.cancelled` | Annonce après Échap |

---

## Raccourci de test (`Shift+S`)

Dans la scène de combat, `Shift+S` ouvre le sélecteur avec des paramètres fixes :
- Case centre (4) → `forbidden`
- Cases adjacentes orthogonales (1, 3, 5, 7) → `selectable`
- Autres → `out_of_range`

La position initiale du curseur est la case 3 (surface gauche). Ce raccourci est uniquement destiné aux tests de développement.

---

## Clés de localisation

| Clé | Usage |
|---|---|
| `zoneSelector.outOfRange` | Préfixe et refus pour zones hors portée |
| `zoneSelector.forbidden` | Préfixe par défaut si `forbiddenPrefix` non fourni |
| `zoneSelector.confirmed` | Optionnel — utilisé par l'appelant dans `onConfirm` |
| `zoneSelector.cancelled` | Optionnel — utilisé par l'appelant dans `onCancel` |
| `zoneSelector.testOpen` | Message d'ouverture du raccourci de test |
| `zoneSelector.testForbidden` | Préfixe des zones interdites dans le test |
