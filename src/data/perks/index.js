// src/data/perks/index.js — Regroupe et réexporte les signatures (perks).
//
// Une signature est un effet passif permanent (durée du combat). Voir le moteur
// src/engine/perks.js et docs/status-system.md.

import { rusted_armor_perk } from './rusted_armor_perk.js';
import { blue_comet_mark_perk } from './blue_comet_mark_perk.js';

export const PERKS = [
  rusted_armor_perk,
  blue_comet_mark_perk,
];

/** Index id → définition de signature. */
const PERK_BY_ID = new Map(PERKS.map((perk) => [perk.id, perk]));

/**
 * Retourne la définition de signature correspondant à un id, ou undefined.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getPerkById(id) {
  return PERK_BY_ID.get(id);
}
