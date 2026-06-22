// src/ui/combatMessages.js — Construction des messages de combat (localisés).
//
// À la résolution d'un tour, on produit, dans l'ordre, un (ou des) message(s)
// par pouvoir activé, puis les messages de résolution (dégâts, défaite), puis le
// message de début de tour suivant. Tout est en chaînes localisées ; ce module
// ne fait ni DOM ni annonce — il rend des tableaux de chaînes que la scène
// envoie une par une à l'annonceur.
//
// Par pouvoir :
//   - Effets de VALEUR (pv, pv adverses, attaque/adverse, défense/adverse,
//     manœuvres, crédit, stratégie ; +, -, ×, ÷) → concaténés en UN message
//     « {nom} : {effets}. », triés division → multiplication → augmentation →
//     réduction, joints « a, b et c ».
//   - Effets COMPLEXES (défausse, exil, pioche) → un message chacun.
//   - Aucun effet (valeurs neutres) → « {nom} est inactif. ».

import { format } from './format.js';
import { powerName } from './powerText.js';

// Effet de valeur → statistique (libellé via effectLabels) + opération.
const VALUE_EFFECTS = {
  add_attack: { stat: 'attack', op: 'add' },
  remove_attack: { stat: 'attack', op: 'remove' },
  multiply_attack: { stat: 'attack', op: 'multiply' },
  add_defense: { stat: 'defense', op: 'add' },
  remove_defense: { stat: 'defense', op: 'remove' },
  multiply_defense: { stat: 'defense', op: 'multiply' },
  add_enemy_attack: { stat: 'enemy_attack', op: 'add' },
  remove_enemy_attack: { stat: 'enemy_attack', op: 'remove' },
  multiply_enemy_attack: { stat: 'enemy_attack', op: 'multiply' },
  add_enemy_defense: { stat: 'enemy_defense', op: 'add' },
  remove_enemy_defense: { stat: 'enemy_defense', op: 'remove' },
  multiply_enemy_defense: { stat: 'enemy_defense', op: 'multiply' },
  heal: { stat: 'hp', op: 'add' },
  enemy_heal: { stat: 'enemy_hp', op: 'add' },
  maneuver: { stat: 'maneuver', op: 'add' },
  credit: { stat: 'credit', op: 'add' },
  strategy: { stat: 'strategy', op: 'add' },
};

// Ordre de tri des effets de valeur : division, multiplication, augmentation, réduction.
const CATEGORY = { '÷': 0, '×': 1, '+': 2, '-': 3 };

/**
 * Élément de message pour un effet de valeur (ex. « +2 attaque »), ou null si
 * l'effet est neutre (×1, ÷1, +0, -0).
 * @returns {{text:string, category:number}|null}
 */
function valueItem(eff, strings) {
  const spec = VALUE_EFFECTS[eff.effect];
  if (!spec) return null;
  const value = eff.value ?? 0;

  let symbol;
  let magnitude;
  switch (spec.op) {
    case 'multiply':
      if (value === 1) return null;
      symbol = '×'; magnitude = value; break;
    case 'divide':
      if (value === 1) return null;
      symbol = '÷'; magnitude = value; break;
    case 'remove':
      if (value === 0) return null;
      symbol = '-'; magnitude = value; break;
    case 'add':
    default:
      if (value === 0) return null;
      symbol = value > 0 ? '+' : '-';
      magnitude = Math.abs(value);
      break;
  }

  const label = strings?.effectLabels?.[spec.stat] ?? spec.stat;
  return { text: `${symbol}${magnitude} ${label}`, category: CATEGORY[symbol] ?? 9 };
}

/** Joint une liste « a, b et c » selon les séparateurs localisés. */
function joinList(items, strings) {
  const log = strings?.log ?? {};
  if (items.length <= 1) return items.join('');
  const sep = log.listSeparator ?? ', ';
  const last = log.listLast ?? ' et ';
  return items.slice(0, -1).join(sep) + last + items[items.length - 1];
}

/** Message d'un effet complexe (défausse/exil) sur une case touchée. */
function complexMessage(actorName, eff, affected, strings) {
  const log = strings?.log ?? {};
  const targetName = powerName({ id: affected.powerId }, strings);
  const phrase = (log.directions ?? {})[affected.direction ?? 'none'] ?? '';
  const direction = phrase ? ` ${phrase}` : '';
  const template = eff.effect === 'exile'
    ? (log.exileOne ?? '{actor} exile {target}{direction}.')
    : (log.discardOne ?? '{actor} défausse {target}{direction}.');
  return format(template, { actor: actorName, target: targetName, direction });
}

/**
 * Messages d'un pouvoir activé (dans l'ordre) : message d'effets de valeur,
 * messages complexes, ou « inactif ».
 * @param {{powerId:string, effects:Array}} activation
 * @param {object} strings
 * @returns {string[]}
 */
export function powerActivationMessages(activation, strings) {
  const log = strings?.log ?? {};
  const name = powerName({ id: activation.powerId }, strings);

  const valueItems = [];
  const complex = [];
  for (const eff of activation.effects ?? []) {
    if (VALUE_EFFECTS[eff.effect]) {
      const item = valueItem(eff, strings);
      if (item) valueItems.push(item);
    } else if (eff.effect === 'discard' || eff.effect === 'exile') {
      for (const affected of eff.affected ?? []) {
        complex.push(complexMessage(name, eff, affected, strings));
      }
    } else if (eff.effect === 'draw' && (eff.value ?? 0) > 0) {
      complex.push(format(log.draw ?? '{actor} pioche {value}.', { actor: name, value: eff.value }));
    }
  }

  const messages = [];
  if (valueItems.length > 0) {
    valueItems.sort((a, b) => a.category - b.category);
    const effects = joinList(valueItems.map((i) => i.text), strings);
    messages.push(format(log.effects ?? '{name} : {effects}.', { name, effects }));
  }
  messages.push(...complex);
  if (messages.length === 0) {
    messages.push(format(log.inactive ?? '{name} est inactif.', { name }));
  }
  return messages;
}

/**
 * Message d'activation d'une signature (perk) : "{nom} s'active : {effets}.".
 * Fallback générique utilisable par tout objet à effet.
 * @param {{perkId:string, effects:Array}} activation
 * @param {object} strings
 * @returns {string}
 */
export function perkActivationMessage(activation, strings) {
  const log = strings?.log ?? {};
  const name = strings?.perks?.[activation.perkId]?.name ?? activation.perkId;
  const items = (activation.effects ?? []).map((e) => valueItem(e, strings)).filter(Boolean);
  const effects = items.length > 0 ? joinList(items.map((i) => i.text), strings) : '';
  return format(log.perkActivation ?? '{name} activates: {effects}.', { name, effects });
}

/**
 * Tous les messages de pouvoirs d'un tour, dans l'ordre de résolution.
 * @param {Array} activations  resolveBoard(...).activations (ou report.activations)
 * @param {object} strings
 * @returns {string[]}
 */
export function turnMessages(activations, strings) {
  const out = [];
  for (const activation of activations ?? []) {
    out.push(...powerActivationMessages(activation, strings));
  }
  return out;
}

/**
 * Messages de résolution (après les pouvoirs) : dégâts à l'ennemi, défaite
 * éventuelle (et arrêt), sinon dégâts au duo.
 * @param {{damageToEnemy:number, damageToDuo:number, status:string}} report
 * @param {string} enemyName
 * @param {object} strings
 * @returns {string[]}
 */
export function resolutionMessages(report, enemyName, strings) {
  const log = strings?.log ?? {};
  const out = [];
  out.push(format(log.enemyHit ?? '{enemy} subit {damage}.', { enemy: enemyName, damage: report.damageToEnemy }));
  if (report.status === 'won') {
    out.push(format(log.enemyDefeated ?? '{enemy} est vaincu.', { enemy: enemyName }));
    return out;
  }
  out.push(format(log.duoHit ?? 'Votre duo subit {damage}.', { damage: report.damageToDuo }));
  return out;
}

/** Message de début de tour. */
export function turnStartMessage(turn, strings) {
  const log = strings?.log ?? {};
  return format(log.turnStart ?? 'Début du tour {turn}.', { turn });
}
