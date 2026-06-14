// src/data/powers/index.js — Regroupe et réexporte tous les pouvoirs.
//
// Chaque pouvoir vit dans son propre fichier (nommé d'après son id). Cet index
// les rassemble dans le tableau POWERS, réexporte l'énumération Rarity et fournit
// l'accès indexé getPowerById.
//
// Le NOM et la DESCRIPTION d'un pouvoir ne sont PAS ici : ce sont des chaînes
// localisées (pack `powers`), assemblées par src/ui/powerText.js.

import { helmbutt_power } from './helmbutt_power.js';
import { iron_grip_power } from './iron_grip_power.js';
import { shield_charge_power } from './shield_charge_power.js';
import { metalloy_power } from './metalloy_power.js';
import { heavy_slam_power } from './heavy_slam_power.js';
import { force_palm_power } from './force_palm_power.js';
import { close_protection_power } from './close_protection_power.js';
import { impregnable_power } from './impregnable_power.js';
import { lead_boots_power } from './lead_boots_power.js';
import { iron_will_power } from './iron_will_power.js';

export { Rarity } from './rarity.js';

export const POWERS = [
  helmbutt_power,
  iron_grip_power,
  shield_charge_power,
  metalloy_power,
  heavy_slam_power,
  force_palm_power,
  close_protection_power,
  impregnable_power,
  lead_boots_power,
  iron_will_power,
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
