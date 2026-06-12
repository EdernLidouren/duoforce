// src/data/statuses/index.js — Regroupe et réexporte les définitions de statuts.
//
// Une définition décrit le comportement d'un status (modifiers / triggers /
// onTurnEnd). Les instances en jeu ne portent que { id, stacks, target } et
// retrouvent leur définition par id via getStatusDefById.

import { status_fatigue } from './status_fatigue.js';
import { status_poison } from './status_poison.js';

export const STATUSES = [
  status_fatigue,
  status_poison,
];

/** Index id → définition de status. */
const STATUS_BY_ID = new Map(STATUSES.map((def) => [def.id, def]));

/**
 * Retourne la définition de status correspondant à un id, ou undefined.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getStatusDefById(id) {
  return STATUS_BY_ID.get(id);
}
