// src/config/version.js — Versions du jeu et du format de sauvegarde.
//
// FICHIER MAINTENU MANUELLEMENT — ne pas modifier automatiquement.
// L'agent peut lire ce fichier ; il ne doit pas l'incrémenter de lui-même.
// C'est le développeur humain qui décide quand une version change.

/**
 * Version du jeu, lisible par un humain.
 * Incrémentée librement quand le développeur juge avoir franchi une étape
 * significative. N'a pas d'impact sur la compatibilité des sauvegardes.
 * Format suggéré : semver (majeur.mineur.patch).
 */
export const GAME_VERSION = '0.1.0';

/**
 * Version du format de sauvegarde — entier strictement croissant.
 * Incrémentée UNIQUEMENT quand la structure de l'objet de sauvegarde change
 * de façon incompatible (champ renommé, supprimé, sémantique modifiée).
 * C'est le garde-fou de compatibilité : deserialize() compare cette valeur à
 * celle stockée dans la save et signale toute divergence.
 *
 * Historique :
 *   1 — format initial (run v0.1.0 : progression, heroes, hp, credit, seed)
 */
export const SAVE_FORMAT_VERSION = 1;
