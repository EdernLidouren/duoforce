// src/data/heroes/index.js — Regroupe et réexporte tous les héros.
//
// Chaque héros vit dans son propre fichier (nommé d'après son id). Cet index les
// rassemble dans le tableau HEROES et fournit l'accès indexé getHeroById.

import { hero_paladium } from './hero_paladium.js';
import { hero_mindel } from './hero_mindel.js';

export const HEROES = [
  hero_paladium,
  hero_mindel,
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
