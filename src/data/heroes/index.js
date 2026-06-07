// src/data/heroes/index.js — Regroupe et réexporte tous les héros.
//
// Chaque héros vit dans son propre fichier (nommé d'après son id). Cet index les
// rassemble dans le tableau HEROES et fournit l'accès indexé getHeroById.
// Contrainte respectée : deck combiné des deux héros >= 15 cartes (8 + 8 = 16).

import { hero_atlas } from './hero_atlas.js';
import { hero_nova } from './hero_nova.js';

export const HEROES = [
  hero_atlas,
  hero_nova,
];

/** Index id → héros. */
const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));

/**
 * Retourne le héros correspondant à un id, ou undefined si inconnu.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getHeroById(id) {
  return HERO_BY_ID.get(id);
}
