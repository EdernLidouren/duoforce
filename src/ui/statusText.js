// src/ui/statusText.js — Descriptions localisées des statuts (court).
//
// Un statut en jeu est une instance { id, stacks, target, ... }. Son nom est une
// chaîne localisée (pack `statuses`). La description COURTE assemble nom + compteur
// via le gabarit `status.short` ("{name} {stacks}"), p. ex. « gel 1 », « épuisement 2 ».
//
// Aucun DOM ; ne dépend que des données et du pack de langue passé en argument.

import { format } from './format.js';

/**
 * Nom localisé d'un statut (repli sur l'id si absent).
 * @param {{id:string}} status
 * @param {object} strings  pack de langue
 * @returns {string}
 */
export function statusName(status, strings) {
  return strings?.statuses?.[status.id]?.name ?? status.id;
}

/**
 * Description courte d'une instance de statut : « {nom} {compteur} ».
 * @param {{id:string, stacks:number}} status
 * @param {object} strings  pack de langue
 * @returns {string}
 */
export function statusShortDescription(status, strings) {
  const template = strings?.status?.short ?? '{name} {stacks}';
  return format(template, { name: statusName(status, strings), stacks: status.stacks });
}

/**
 * Descriptions courtes d'une liste de statuts, jointes par « , ».
 * @param {Array} statuses
 * @param {object} strings
 * @returns {string} '' si la liste est vide
 */
export function statusListShort(statuses, strings) {
  if (!Array.isArray(statuses) || statuses.length === 0) return '';
  return statuses.map((s) => statusShortDescription(s, strings)).join(', ');
}
