// src/config/debug.js — Flags de debug centralisés.
//
// FICHIER MAINTENU MANUELLEMENT — ne pas modifier automatiquement.
// L'agent peut lire ce fichier ; il ne doit pas en changer les valeurs.
// C'est le développeur humain qui active ou désactive les flags.
//
// Règle absolue : quand `enabled` est false, aucun comportement de debug ne
// s'exécute ni n'a d'effet, quelle que soit la valeur des autres flags.
// Un build de production aura simplement `enabled: false`.

export const debug = Object.freeze({
  /**
   * Interrupteur maître. Quand false, tous les flags ci-dessous sont ignorés
   * et aucun comportement de debug n'est actif.
   */
  enabled: true,

  /**
   * Affiche l'option « Combat test » dans le menu principal.
   * Remplace l'ancien drapeau DEBUG de main.js.
   */
  showTestCombat: true,

  /**
   * Si non null et que enabled est true, createRun utilise cette valeur comme
   * seed au lieu d'en générer un aléatoire — pour reproduire un état de run
   * exact pendant le développement.
   * Un seed passé explicitement à createRun reste toujours prioritaire.
   * Mettre à null pour laisser le seed être généré normalement.
   */
  forcedSeed: null,
});
