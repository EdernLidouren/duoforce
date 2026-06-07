// src/data/powers/index.js — Regroupe et réexporte tous les pouvoirs.
//
// Chaque pouvoir vit dans son propre fichier (nommé d'après son id). Cet index
// les rassemble dans le tableau POWERS, réexporte l'énumération Rarity et fournit
// l'accès indexé getPowerById.
//
// Le NOM et la DESCRIPTION d'un pouvoir ne sont PAS ici : ce sont des chaînes
// localisées (pack `powers`), assemblées par src/ui/powerText.js.

import { power_aerial_strike } from './power_aerial_strike.js';
import { power_shield } from './power_shield.js';
import { power_phalanx } from './power_phalanx.js';
import { power_vanguard } from './power_vanguard.js';
import { power_disrupt } from './power_disrupt.js';
import { power_curse } from './power_curse.js';
import { power_medic } from './power_medic.js';
import { power_tactician } from './power_tactician.js';
import { power_sabotage } from './power_sabotage.js';

export { Rarity } from './rarity.js';

export const POWERS = [
  power_aerial_strike,
  power_shield,
  power_phalanx,
  power_vanguard,
  power_disrupt,
  power_curse,
  power_medic,
  power_tactician,
  power_sabotage,
];

/** Index id → pouvoir, construit une fois. */
const POWER_BY_ID = new Map(POWERS.map((power) => [power.id, power]));

/**
 * Retourne le pouvoir correspondant à un id, ou undefined si inconnu.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getPowerById(id) {
  return POWER_BY_ID.get(id);
}
