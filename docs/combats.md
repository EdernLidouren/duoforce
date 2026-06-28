
# Règles de combat

## Description globale

Un combat voit s'affronter le duo contrôlé par le joueur et un unique ennemi. Le déroulement est tour par tour et ne s'achève que par la victoire ou la défaite du joueur. L'ennemi, contrôlé par l'ordinateur, affiche les dégâts qu'il infligera. Si ses points de vie tombent à 0, le joueur gagne. Si les points de vie du duo tombent à 0, le joueur perd.

## Interface de combat

- Une zone affichant les statistiques de l'ennemi : PV actuels / PV max, attaque, défense.
- Le plateau de jeu : une grille 3×3 où sont placés les pouvoirs tirés ce tour.
- Une zone affichant les statistiques du duo : PV actuels / PV max, attaque, défense, manœuvres, stratégies, crédit.
- Une zone affichant les side-kicks du joueur et une zone affichant ses gadgets.
- Un bouton « fin de tour ».
- Un bouton affichant le nombre de cartes dans la pioche, un bouton pour ouvrir la défausse, un bouton pour ouvrir l'exil.

## Phase préparatoire

Au début du combat, on mélange les pouvoirs de chacun des héros du duo pour constituer un unique deck mélangé. Le premier tour commence.

## Phases de combat

Un tour est découpé en phases explicites. La phase courante est stockée dans `combatState.phase` (source de vérité unique). Voir `docs/combat-phases.md` pour l'architecture complète.

### initialization

Émise une fois, à la création du combat. Point d'accroche « début de combat ».

### distribution

Défausse de tous les pouvoirs du plateau. Puis on pioche neuf pouvoirs et on les place sur le plateau.  
Le duo gagne des manœuvres jusqu'à en avoir *2.  
Le duo gagne des stratégies jusqu'à en avoir *1.  
L'attaque et la défense du duo sont remises à 0.  
L'attaque et la défense ennemies sont réévaluées.  
Point d'accroche « début de tour ».

### play

Phase principale. Le joueur peut agir : manœuvres, stratégies, gadgets (voir ci-dessous). Quand il valide son tour, la cascade de résolution commence.

### resolution

Activation des effets des pouvoirs par ordre de lecture. Voir `docs/rules_system.md`.  
Les valeurs d'attaque/défense/soins accumulées sont appliquées à l'état de combat.  
**Vérification d'issue** : si un effet direct a fait tomber des PV à 0, le combat est résolu ici et les phases suivantes sont ignorées.

### duo

Application de l'attaque du duo contre l'ennemi (la défense de l'ennemi absorbe en priorité).  
**Vérification d'issue** : si les PV de l'ennemi tombent à 0 → victoire, phases `enemy` et `turn_end` ignorées.

### enemy

Application de l'attaque de l'ennemi contre le duo.  
**Vérification d'issue** : si les PV du duo tombent à 0 → défaite, phase `turn_end` ignorée.

### turn_end

Décréments de statuts (poison, gel…), expirations, perks `onTurnEnd`. Commit des statuts de zone.  
**Vérification d'issue** (dernier filet) : si un statut ou une signature a fait tomber des PV à 0.  
Point d'accroche « fin de tour ».

### Résumé de la cascade par tour

```
[distribution → play]  ← startTurn()
play → [joueur valide]
    → resolution → (checkOutcome)
    → duo        → (checkOutcome)
    → enemy      → (checkOutcome)
    → turn_end   → (checkOutcome)
                                     ← resolveTurn()
[distribution → play]  ← startTurn() du tour suivant
```

Chaque flèche `→` n'est franchie que si `state.status === 'ongoing'`. Les phases après une issue détectée sont intégralement ignorées (ni exécutées, ni émises dans le journal).

## Actions du joueur (phase play)

Le joueur ne peut agir que pendant `play`. `canPlayerAct(combatState)` est le seul point de vérification — les fonctions d'exécution du moteur le vérifient en interne.

### Manœuvre

Contre 1 point de manœuvre, échange la position d'un pouvoir sur le plateau avec un pouvoir adjacent.  
Sélection par le système de ciblage (1 étape : zone destination).

### Stratégie

Contre 1 point de stratégie, défausse un pouvoir sur le plateau et le remplace par un choix parmi les *3 premières cartes de la pioche.  
Sélection par le système de ciblage (2 étapes : zone source → choix dans la liste).

### Gadgets (combat)

Consommables à effet immédiat. Utilisables uniquement pendant `play`. La sélection et l'exécution passent par le widget gadget et le pipeline d'actions. Voir `docs/gadget-system.md`.

## Résolution d'un combat

En cas de victoire : le joueur est amené sur la prochaine scène de préparation. Crédits gagnés transférés à la run.  
En cas de défaite : scène game over.

## Mécaniques complémentaires

**Valeurs numériques** : les valeurs précédées d'un `*` ne sont pas hardcodées et peuvent être modifiées par talents, gadgets, signatures, etc.

**Ordre d'activation** : l'activation (et la défausse/distribution) des pouvoirs suit l'ordre de lecture 7→8→9→4→5→6→1→2→3 (référence clavier numérique). Voir `docs/rules_system.md`.

**Zones** : les neuf cases du plateau sont des objets à part entière, chacune peut porter un statut. Une case ne possède qu'un seul statut à la fois (en appliquer un nouveau remplace l'ancien). Les statuts de zone persistent d'un tour à l'autre. Voir `docs/status-system.md`.

**Défausse** : un pouvoir explicitement défaussé ou encore présent sur le plateau en fin de tour va à la défausse. Si la pioche est vide lors du remplissage du plateau, on mélange la défausse pour reconstituer une nouvelle pioche.

**Exil** : une carte exilée est retirée du jeu (plateau, pioche ou défausse) et placée à part. Si, en reconstituant la pioche, on n'obtient pas assez de cartes et que l'exil n'est pas vide, on y injecte son contenu — mais le duo subit alors des dégâts imbloquables (ignorant la défense) égaux à la moitié (*) de ses PV max. Si tout reste insuffisant, on pioche moins que demandé.

**Side-kicks** : effets et modifications passifs, actifs tant qu'ils sont en jeu.

**Crédit** : monnaie du jeu — aucun effet direct en combat, transféré à la run en fin de combat.

## Lexique

| Terme | Définition |
|---|---|
| Ciel | Ligne supérieure du plateau (positions 6, 7, 8) |
| Surface | Ligne médiane du plateau (positions 3, 4, 5) |
| Terre | Ligne inférieure du plateau (positions 0, 1, 2) |
| Gauche | Colonne gauche du plateau (positions 0, 3, 6) |
| Centre | Colonne centrale du plateau (positions 1, 4, 7) |
| Droite | Colonne droite du plateau (positions 2, 5, 8) |
| Cœur | Case centrale (position 4) |
