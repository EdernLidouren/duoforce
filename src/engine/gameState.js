// src/engine/gameState.js — Constantes de configuration du combat.
//
// Valeurs par défaut centralisées, importées par le moteur de combat plutôt que
// hardcodées. Les valeurs marquées d'un « * » dans les docs de design ne sont
// pas définitives : elles pourront être modifiées à l'exécution (talents,
// gadgets, signatures…). Ces constantes en sont les valeurs de base.
//
// Aucun DOM, aucune dépendance.

/** Nombre de cases du plateau (grille 3×3). */
export const BOARD_SIZE = 9;

/**
 * Nombre maximal d'itérations de résolution par tour (filet anti-boucle infinie).
 * En jeu normal la boucle principale parcourt 9 cases ; cette limite ne se
 * déclenche qu'en cas de bug (chaîne réactive non bornée, re-entrée accidentelle).
 */
export const MAX_RESOLUTION_STEPS = 1000;

/**
 * Profondeur maximale d'appels imbriqués à executeAction (garde-fou anti-cascade).
 * En jeu normal la profondeur est 1 (un appelant, un executeAction). Cette limite
 * ne se déclenche qu'en cas de bug (intercepteur qui déclenche une nouvelle action
 * qui déclenche un intercepteur, etc.).
 */
export const MAX_ACTION_DEPTH = 50;

/** Nombre de pouvoirs distribués sur le plateau au début de chaque tour. */
export const HAND_SIZE = 9;

/** Manœuvres regagnées en début de tour (top-up jusqu'à cette valeur). *2 */
export const DEFAULT_MANEUVERS = 2;

/** Stratégies regagnées en début de tour (top-up jusqu'à cette valeur). *1 */
export const DEFAULT_STRATEGIES = 1;

/** Cartes proposées depuis la pioche lors de l'usage d'une stratégie. *3 */
export const STRATEGY_PICK = 3;

/** Points de vie de départ du duo. */
export const DEFAULT_DUO_HP = 30;

/** Nombre d'emplacements de gadgets par défaut (liste compacte sans trou). */
export const DEFAULT_GADGET_SLOTS = 3;

/** Crédits de départ du duo. */
export const STARTING_CREDIT = 0;

/** Statistiques de l'ennemi par défaut (placeholder ; dépendra du niveau). */
export const DEFAULT_ENEMY_HP = 24;
export const DEFAULT_ENEMY_ATTACK = 6;
export const DEFAULT_ENEMY_DEFENSE = 2;

// --- Statuts : limites de slots par type de cible ---------------------------
//
// Nombre maximum de statuts simultanés sur une même cible. Le moteur de statuts
// (src/engine/statuses.js) consulte ces limites ; le comportement quand une
// limite est atteinte dépend du champ `onLimitReached` de la définition du
// status ajouté (overwrite / ignore / stack_if_same).

/** Statuts simultanés sur le duo (illimité). */
export const MAX_STATUSES_PER_DUO = Infinity;
/** Statuts simultanés sur l'ennemi (illimité). */
export const MAX_STATUSES_PER_ENEMY = Infinity;
/** Statuts simultanés sur une entité (pouvoir / side-kick / gadget) (illimité). */
export const MAX_STATUSES_PER_ENTITY = Infinity;
/** Statuts simultanés sur une zone du plateau. */
export const MAX_STATUSES_PER_AREA = 1;

// --- Pioche / défausse / exil -----------------------------------------------

/**
 * Quand la pioche doit être reconstituée et qu'elle compterait MOINS de cartes
 * que nécessaire pour remplir le plateau, on réinjecte l'exil — au prix de
 * dégâts imblocables infligés au duo, égaux à cette fraction de ses PV max.
 */
export const EXILE_REFILL_HP_PENALTY_RATIO = 0.5;
