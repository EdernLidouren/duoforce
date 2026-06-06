// src/ui/combatMessages.js — Construction des messages de combat (localisés).
//
// But (bases) : produire, à la résolution d'un tour, un message court par
// pouvoir activé, dans l'ordre — ex. « +2 attaque », « -1 défense ennemie »,
// « +3 points de vie ». Aucun message n'est produit si un pouvoir n'apporte
// aucun effet « messageable » (effet hors périmètre pour l'instant, ou valeur
// nulle).
//
// Périmètre actuel (effets traduits en message) : valeurs additives de combat
// du duo et de l'ennemi, plus les ressources du duo. Les autres effets
// (multiplicateurs, pioche/défausse/exil, soin ennemi) sont volontairement
// laissés vides pour l'instant → ils ne produisent pas de message.
//
// Aucun DOM ; ne dépend que des données d'effet et du pack de langue.

import { format } from './format.js';

// Effet → { stat, sign }. `stat` indexe le libellé localisé (pack effectLabels) ;
// `sign` donne le sens de variation (+1 ajoute, -1 retire). La valeur de l'effet
// est toujours une magnitude positive dans les données ; le signe est porté ici.
const EFFECT_TO_STAT = {
  add_attack: { stat: 'attack', sign: 1 },
  remove_attack: { stat: 'attack', sign: -1 },
  add_defense: { stat: 'defense', sign: 1 },
  remove_defense: { stat: 'defense', sign: -1 },
  add_enemy_attack: { stat: 'enemy_attack', sign: 1 },
  remove_enemy_attack: { stat: 'enemy_attack', sign: -1 },
  add_enemy_defense: { stat: 'enemy_defense', sign: 1 },
  remove_enemy_defense: { stat: 'enemy_defense', sign: -1 },
  heal: { stat: 'hp', sign: 1 },
  credit: { stat: 'credit', sign: 1 },
  maneuver: { stat: 'maneuver', sign: 1 },
  strategy: { stat: 'strategy', sign: 1 },
  // Hors périmètre pour l'instant (pas d'entrée → pas de message) :
  //   multiply_*, enemy_heal, draw, discard, exile.
};

/**
 * Message court pour un effet unique, ou null si rien à afficher.
 * @param {{effect:string, value:number}} effect
 * @param {object} strings  pack de langue
 * @returns {string|null}
 */
export function effectMessage(effect, strings) {
  if (!effect) return null;
  const mapping = EFFECT_TO_STAT[effect.effect];
  if (!mapping) return null; // effet hors périmètre

  const delta = mapping.sign * (effect.value ?? 0);
  if (delta === 0) return null; // aucun effet réel

  const label = strings?.effectLabels?.[mapping.stat] ?? mapping.stat;
  const change = `${delta > 0 ? '+' : '-'}${Math.abs(delta)}`;
  const template = strings?.effectMessageFormat ?? '{change} {label}';
  return format(template, { change, label });
}

/**
 * Messages d'un pouvoir : tous les messages de ses effets activés (filtrés).
 * @param {Array} effects  effets produits par le pouvoir ce tour-ci
 * @param {object} strings
 * @returns {string[]} liste éventuellement vide
 */
export function powerMessages(effects, strings) {
  if (!Array.isArray(effects)) return [];
  return effects.map((e) => effectMessage(e, strings)).filter((m) => m != null);
}

/**
 * Messages d'un tour : pour chaque pouvoir activé (dans l'ordre fourni), ses
 * messages — en omettant les pouvoirs sans aucun message.
 * @param {Array<{position:number, powerId:string, effects:Array}>} activations
 *   journal d'activation, typiquement resolveBoard(...).activations
 * @param {object} strings
 * @returns {Array<{position:number, powerId:string, messages:string[]}>}
 */
export function turnMessages(activations, strings) {
  if (!Array.isArray(activations)) return [];
  const out = [];
  for (const activation of activations) {
    const messages = powerMessages(activation.effects, strings);
    if (messages.length > 0) {
      out.push({ position: activation.position, powerId: activation.powerId, messages });
    }
  }
  return out;
}
