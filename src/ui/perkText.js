// src/ui/perkText.js — Assemble les descriptions localisées d'une signature (perk).
//
// Une signature (src/data/perks/) ne porte que des identifiants : son nom et sa
// description sont des chaînes localisées (pack `perks`). Ce module compose la
// description longue affichée dans l'interface de combat :
//
//   description longue : "{name} : {description}"  (gabarit `perk.long`)
//
// La description est passée par format(), avec un objet `data` optionnel : un
// pouvoir/perk pourra ainsi interpoler des valeurs DYNAMIQUES (dépendant du
// contexte de combat) dans sa description, sur le modèle de {compteur} des
// statuts. Recomposée à chaque rafraîchissement, elle reflète l'état courant.
//
// Aucun DOM ; ne dépend que des données et du pack de langue passé en argument.

import { format } from './format.js';

/**
 * Nom localisé d'une signature (repli sur l'id si absent).
 * @param {object} perk
 * @param {object} strings  pack de langue
 * @returns {string}
 */
export function perkName(perk, strings) {
  return strings?.perks?.[perk.id]?.name ?? perk.id;
}

/**
 * Description longue d'une signature : "{name} : {description}".
 * @param {object} perk
 * @param {object} strings  pack de langue
 * @param {object} [data]   valeurs dynamiques à interpoler dans la description
 * @returns {string}
 */
export function perkLongDescription(perk, strings, data = {}) {
  const entry = strings?.perks?.[perk.id] ?? {};
  const name = perkName(perk, strings);
  const description = format(entry.description ?? '', data);
  const template = strings?.perk?.long ?? '{name} : {description}';
  return format(template, { name, description });
}
