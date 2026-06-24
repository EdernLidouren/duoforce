// src/data/enemies/index.js — Regroupe et réexporte les ennemis.
//
// ENEMIES : catalogue des ennemis réels, indexé par id via getEnemyById.
// DUMMY_ENEMY : fixture de test (ennemi factice), conservée et réexportée car
// utilisée par la scène de combat de test.

export { DUMMY_ENEMY } from './enemy_dummy.js';

import { enemy_gros_bras } from './enemy_gros_bras.js';
import { enemy_caid }      from './enemy_caid.js';
import { enemy_nemesis }   from './enemy_nemesis.js';

export const ENEMIES = [
  enemy_gros_bras,
  enemy_caid,
  enemy_nemesis,
];

const ENEMY_BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));

/**
 * Retourne l'ennemi correspondant à un id, ou undefined si inconnu.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getEnemyById(id) {
  return ENEMY_BY_ID.get(id);
}
