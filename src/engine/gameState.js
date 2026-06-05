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

/** Crédits de départ du duo. */
export const STARTING_CREDIT = 0;

/** Statistiques de l'ennemi par défaut (placeholder ; dépendra du niveau). */
export const DEFAULT_ENEMY_HP = 24;
export const DEFAULT_ENEMY_ATTACK = 6;
export const DEFAULT_ENEMY_DEFENSE = 2;
