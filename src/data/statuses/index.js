// src/data/statuses/index.js — Regroupe et réexporte les définitions de statuts.
//
// Une définition décrit le comportement d'un status (stackable / modifiers /
// triggers / onTurnEnd / immunityFlag). Les instances en jeu portent
// { id, stacks, target } (+ `entity` pour les statuts d'entité) et retrouvent
// leur définition par id via getStatusDefById.

import { power_exhaustion_status } from './power_exhaustion_status.js';
import { hero_poison_status } from './hero_poison_status.js';
import { area_freeze_status } from './area_freeze_status.js';
import { area_anchor_status } from './area_anchor_status.js';

export const STATUSES = [
  power_exhaustion_status,
  hero_poison_status,
  area_freeze_status,
  area_anchor_status,
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
