// src/data/powers/rarity.js — Gradation de rareté des pouvoirs.
//
// Entiers croissants pour faciliter comparaisons et tris ; les libellés affichés
// ("Commun", etc.) sont localisés via le pack `rarities`. Module isolé pour que
// chaque fichier de pouvoir puisse l'importer sans dépendance circulaire avec
// l'index.

export const Rarity = Object.freeze({
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
});
