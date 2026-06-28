# Système de phases de combat

`src/engine/combatPhases.js` — transition centralisée, helpers de lecture.  
`src/engine/gameState.js` — enum `COMBAT_PHASES`.

## Phases et rôles

| Phase | Valeur | Rôle |
|---|---|---|
| **initialization** | `'initialization'` | Lancement du combat, avant la première distribution. Point d'accroche "début de combat" (une fois par combat). |
| **distribution** | `'distribution'` | Défausse du plateau, mélange si besoin, distribution de 9 pouvoirs. Point d'accroche "début de tour". |
| **play** | `'play'` | Phase principale : le joueur peut agir (manœuvres, stratégies, gadgets). |
| **resolution** | `'resolution'` | Lecture du plateau, activation des pouvoirs, application des effets. |
| **duo** | `'duo'` | Application de l'attaque du duo contre l'ennemi. |
| **enemy** | `'enemy'` | Application de l'attaque de l'ennemi contre le duo. |
| **turn_end** | `'turn_end'` | Décréments de statuts, expirations, perks onTurnEnd. Point d'accroche "fin de tour". |

## Phase courante — source de vérité unique

`combatState.phase` est la seule source de vérité.

**Règle absolue : `setPhase(state, newPhase)` est le seul endroit autorisé à écrire `state.phase`.** Aucun autre code ne modifie ce champ directement ; tout le reste le lit via `getPhase` ou les helpers sémantiques.

## Transition centralisée

```js
import { setPhase, getPhase, canPlayerAct, isPhaseActiveFor } from '../engine/combatPhases.js';

// Seul point d'écriture :
setPhase(state, COMBAT_PHASES.PLAY);
// → state.phase = 'play'
// → emitEvent(state, 'phase_changed', { phase: 'play' })

// Lecture :
getPhase(state)              // → 'play'
canPlayerAct(state)          // → true si phase === PLAY et status === 'ongoing'
isPhaseActiveFor(state, [COMBAT_PHASES.DISTRIBUTION, COMBAT_PHASES.PLAY])  // → boolean
```

### L'event `phase_changed`

À chaque appel à `setPhase`, un event `{ type: 'phase_changed', turn, data: { phase } }` est émis via l'event bus (`emitEvent`). Il est visible dans les journaux `turn`, `combat` et `progression`.

Cela rend trivial l'ajout futur d'annonces ciblées ou de triggers réagissant à un changement de phase, sans modifier la logique de transition :

```js
// Exemple futur : effet "début de tour"
if (getEvents(state, 'phase_changed', 'turn').some(e => e.data.phase === 'distribution')) {
  // appliquer l'effet de début de tour
}
```

## Transitions manuelles vs cascade automatique

### Deux transitions manuelles (déclenchées par le joueur)

1. **Lancer la mission** (depuis le hub) → combat initialisé → phase `initialization`
2. **Valider le tour** (bouton « fin de tour » ou Ctrl+E) → entrée en `resolution`

### Cascade automatique

Une fois le tour validé, le moteur enchaîne les phases sans intervention :

```
play → [joueur valide] → resolution → duo → enemy → turn_end
    → (tour suivant si combat ongoing) → distribution → play → …
```

La scène `combat.js` appelle `resolveTurn(state)` puis `startTurn(state)`. Ces fonctions appellent `setPhase` en interne pour chaque transition. La scène n'a pas à gérer les phases — elle pilote le moment de la transition (appui du joueur), le moteur gère l'ordre.

### Vérification d'issue à la fin de chaque phase

`checkOutcome(state)` (fonction privée de `combat.js`) est appelé après chaque phase
de `resolveTurn`. Si l'un des deux camps tombe à 0 PV, `state.status` passe à `'won'`
ou `'lost'` et les phases suivantes sont **entièrement ignorées** — elles ne sont pas
entrées, leur `setPhase` n'est pas appelé.

```
resolution → checkOutcome
  → si résolu : rapport immédiat, pas de DUO / ENEMY / TURN_END
duo        → checkOutcome
  → si résolu (victoire) : pas de ENEMY / TURN_END
enemy      → checkOutcome
  → si résolu (défaite)  : pas de TURN_END
turn_end   → checkOutcome
  → dernier filet : statuts/perks qui font tomber les PV à 0
```

**Victoire prioritaire** : si les deux camps atteignent 0 PV simultanément (effet de
résolution qui les touche tous les deux), `'won'` est retourné.

Ce mécanisme évite d'appliquer les effets de fin de tour (poison, expirations de
statuts de zone) à un combat déjà terminé, ce qui aurait un impact sur la progression
des données sans utilité pour la partie.

### Protection contre les boucles

- La cascade de phases est déterministe et bornée (≤ 6 transitions par tour) : elle ne peut pas diverger.
- La résolution du plateau (`resolveBoard`, au sein de la phase `resolution`) est protégée par `MAX_RESOLUTION_STEPS` contre les chaînes d'effets non bornées.
- Les actions déclenchées par des événements de phase passent par `executeAction`, protégé par `MAX_ACTION_DEPTH` (50 niveaux d'imbrication).

## Helpers de lecture

### `getPhase(state) → string|null`

Retourne la phase courante (`state.phase`). Lecture pure, aucune écriture.

### `canPlayerAct(state) → boolean`

Retourne `true` si le joueur peut agir. Actuellement : `phase === PLAY && status === 'ongoing'`.

Point central : toutes les actions du joueur consultent **ce helper** et non une comparaison directe à l'enum, pour que la condition reste à un seul endroit si elle évolue.

Utilisé :
- Dans le moteur (`executeManeuver`, `executeStrategy`) — garde robuste.
- Dans l'UI (`openManeuverSelector`, `openStrategyUI`) — retour immédiat avant ouverture du sélecteur.

### `isPhaseActiveFor(state, phases[]) → boolean`

Vérifie si la phase courante appartient à un ensemble de phases.

Permet à un effet, trigger ou hook de déclarer les phases où il est actif sans comparaison directe à l'enum :

```js
// Effet actif à la fois en distribution et en play :
if (isPhaseActiveFor(state, [COMBAT_PHASES.DISTRIBUTION, COMBAT_PHASES.PLAY])) {
  applyEffect(state);
}
```

Cette capacité est posée maintenant pour que les effets "début de combat", "début de tour", "fin de tour" s'y branchent quand ils seront créés, sans modifier l'architecture.

## Annonces de phase

Les transitions ne sont pas annoncées au joueur (éviter le spam NVDA). Le système les rend observables via l'event `phase_changed`, ce qui permettra d'ajouter des annonces ciblées plus tard en s'abonnant à cet event, sans toucher à la logique de transition.

## Phases et actions du joueur

Le joueur ne peut agir que pendant la phase `play`. `canPlayerAct(state)` est le seul point de vérification — voir aussi `docs/targeting-system.md` pour la mécanique de ciblage.

| Action | Phase requise | Où la garde est posée |
|---|---|---|
| Manœuvre | `play` | `executeManeuver` (moteur) + `openManeuverSelector` (UI) |
| Stratégie | `play` | `executeStrategy` (moteur) + `openStrategyUI` (UI) |
| Gadget (combat) | `play` | `executeGadget` (moteur, Prompt 3) + UI gadget |

## Vérification en mode debug

La scène de combat produit des logs console si `context.debug.enabled` :

```
// Au montage du combat :
[DEBUG phases] initialisation : distribution → play

// Tour normal (pas de mort anticipée) :
[DEBUG phases] tour complet : resolution → duo → enemy → turn_end → distribution → play

// Victoire dès la phase duo (enemy tombe, ENEMY et TURN_END sautées) :
[DEBUG phases] tour complet : resolution → duo → distribution → play

// Victoire dès la résolution (dégât direct par effet, DUO/ENEMY/TURN_END sautées) :
[DEBUG phases] tour complet : resolution → distribution → play
```

Pour vérifier qu'une action hors phase est refusée : tenter une manœuvre (Enter sur une case) ou une stratégie (Backspace) pendant une phase non-play (inatteignable en jeu normal, mais testable en modifiant manuellement `state.phase` en console).
