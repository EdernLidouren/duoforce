// src/data/enemies.js — Données des ennemis (placeholder).
//
// À terme, l'adversaire d'un combat pourra être de deux natures :
//   1. Un ennemi classique : un objet comme celui ci-dessous, décrit directement
//      par ses statistiques (id, hp, attack, defense).
//   2. Un héros converti en boss : on réutilisera alors un objet hero de
//      heroes.js, adapté en statistiques d'ennemi au moment de l'initialisation
//      du combat (mapping hero → ennemi). Cette bascule n'est PAS implémentée
//      pour l'instant.
//
// Module de données pur — aucun DOM.

/** Ennemi factice pour les tests de combat. */
export const DUMMY_ENEMY = {
  id: 'enemy_dummy',
  hp: 24,
  attack: 6,
  defense: 2,
};
