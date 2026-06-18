// src/ui/powerText.js — Assemble les descriptions localisées d'un pouvoir.
//
// Un pouvoir (src/data/powers/) ne porte que des identifiants : son nom et sa
// description sont des chaînes localisées (pack `powers`), son type et sa rareté
// se traduisent via les packs `powerTypes` et `rarities`. Ce module compose, à
// partir de gabarits localisés (`power.short`, `power.long`), deux textes :
//
//   - description courte : "{name}, {type}, {rarity}"  (hors combat : deck, boutique…)
//   - description longue  : "{name}[, {statuts}] : {description}"  (case de combat ;
//     sans type ni rareté, statuts du pouvoir insérés après le nom)
//
// Tout est interpolé via format(), pour rester localisable et dynamique.
// Aucun DOM ; ne dépend que des données et du pack de langue passé en argument.

import { format } from './format.js';
import { statusListShort } from './statusText.js';

/**
 * Nom localisé d'un pouvoir (repli sur l'id si absent).
 * @param {object} power
 * @param {object} strings  pack de langue
 * @returns {string}
 */
export function powerName(power, strings) {
  return strings?.powers?.[power.id]?.name ?? power.id;
}

/** Extrait les morceaux localisés d'un pouvoir (avec valeurs de repli). */
function powerParts(power, strings) {
  const entry = strings?.powers?.[power.id] ?? {};
  const rarityLabel = strings?.rarities?.[power.rarity];
  return {
    name: powerName(power, strings),
    type: strings?.powerTypes?.[power.type] ?? power.type ?? '',
    // Jamais le littéral « undefined » : libellé localisé, sinon l'entier s'il
    // existe, sinon chaîne vide.
    rarity: rarityLabel ?? (typeof power.rarity === 'number' ? String(power.rarity) : ''),
    description: entry.description ?? '',
  };
}

/**
 * Description courte : nom, type, rareté.
 * @param {object} power
 * @param {object} strings  pack de langue
 * @returns {string}
 */
export function shortDescription(power, strings) {
  const template = strings?.power?.short ?? '{name}, {type}, {rarity}';
  return format(template, powerParts(power, strings));
}

/**
 * Description longue d'un pouvoir SUR LE PLATEAU : « {nom}[, {statuts}] : {description} ».
 * Volontairement sans type ni rareté (cf. décision de design). Les éventuels
 * statuts du pouvoir (ex. épuisement) sont insérés après le nom, avant les
 * deux-points.
 * @param {object} power
 * @param {object} strings  pack de langue
 * @param {Array} [powerStatuses]  instances de statut portées par ce pouvoir
 * @returns {string}
 */
export function longDescription(power, strings, powerStatuses = []) {
  const name = powerName(power, strings);
  const statusPart = statusListShort(powerStatuses, strings);
  const namePart = statusPart ? `${name}, ${statusPart}` : name;

  const description = strings?.powers?.[power.id]?.description ?? '';
  // Description vide → on s'en tient au nom (+ statuts), sans deux-points orphelins.
  if (!description) return namePart;

  const template = strings?.power?.long ?? '{name} : {description}';
  return format(template, { name: namePart, description });
}
