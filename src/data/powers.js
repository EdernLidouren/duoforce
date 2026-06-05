// src/data/powers.js — Données des pouvoirs (placeholder).
//
// Chaque pouvoir suit la structure et le lexique de docs/rules_system.md :
//   { id, type, rarity, rules: [ { condition, effect, value, target? } ], customResolve }
//
// - type        : "offensive" | "support" | "special"
// - rarity       : entier (voir l'énumération Rarity ci-dessous). On stocke un
//                 entier pour pouvoir réordonner/étendre la gradation facilement ;
//                 le terme affiché ("Commun", etc.) est localisé via le pack.
// - rules       : évaluées dans l'ordre ; la PREMIÈRE condition satisfaite
//                 s'applique, les suivantes sont ignorées. "default" est
//                 toujours vraie et doit être en dernier.
// - customResolve: null pour tous ces placeholders (échappatoire non utilisée).
//
// Le NOM et la DESCRIPTION d'un pouvoir ne sont PAS ici : ce sont des chaînes
// localisées, indexées par l'id du pouvoir dans les language packs (section
// `powers`). Les descriptions courtes/longues sont assemblées par
// src/ui/powerText.js.
//
// Module de données pur — aucun DOM, aucun import.

/**
 * Gradation de rareté. Entiers croissants pour faciliter comparaisons et tris ;
 * les libellés sont localisés (pack `rarities`).
 */
export const Rarity = Object.freeze({
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
});

export const POWERS = [
  // 1 — Offensif. Conditions positionnelles (ciel/terre), voisinage offensif.
  //     Effets : add_attack, remove_attack.
  {
    id: 'power_aerial_strike',
    type: 'offensive',
    rarity: Rarity.UNCOMMON,
    rules: [
      { condition: [6, 7, 8], effect: 'add_attack', value: 4 },     // ciel
      { condition: [0, 1, 2], effect: 'remove_attack', value: 1 },  // terre
      { condition: 'adjacent_to:offensive', effect: 'add_attack', value: 2 },
      { condition: 'default', effect: 'add_attack', value: 2 },
    ],
    customResolve: null,
  },

  // 2 — Support défensif. Colonnes gauche/droite. Sert de référence d'id pour
  //     "adjacent_to:power_shield". Effets : add_defense, remove_defense.
  {
    id: 'power_shield',
    type: 'support',
    rarity: Rarity.COMMON,
    rules: [
      { condition: [6, 3, 0], effect: 'add_defense', value: 3 },     // gauche
      { condition: [8, 5, 2], effect: 'remove_defense', value: 1 },  // droite
      { condition: 'default', effect: 'add_defense', value: 1 },
    ],
    customResolve: null,
  },

  // 3 — Support. Synergie entre supports + multiplicateur de défense au centre.
  //     Effets : add_defense, multiply_defense ; condition isolated.
  {
    id: 'power_phalanx',
    type: 'support',
    rarity: Rarity.RARE,
    rules: [
      { condition: 'adjacent_to:support', effect: 'add_defense', value: 3 },
      { condition: [7, 4, 1], effect: 'multiply_defense', value: 2 }, // centre
      { condition: 'isolated', effect: 'add_defense', value: 0 },
      { condition: 'default', effect: 'add_defense', value: 1 },
    ],
    customResolve: null,
  },

  // 4 — Offensif. Bonus si adjacent à un bouclier (adjacent_to:<id>), multiplie
  //     l'attaque dans les coins. Effets : add_attack, multiply_attack.
  {
    id: 'power_vanguard',
    type: 'offensive',
    rarity: Rarity.UNCOMMON,
    rules: [
      { condition: 'adjacent_to:power_shield', effect: 'add_attack', value: 5 },
      { condition: [6, 8, 0, 2], effect: 'multiply_attack', value: 2 }, // coins
      { condition: 'default', effect: 'add_attack', value: 2 },
    ],
    customResolve: null,
  },

  // 5 — Spécial. Débuff ennemi + exil d'une colonne depuis les coins.
  //     Effets : remove_enemy_attack, remove_enemy_defense, exile (target "col").
  {
    id: 'power_disrupt',
    type: 'special',
    rarity: Rarity.RARE,
    rules: [
      { condition: 'adjacent_to:special', effect: 'remove_enemy_attack', value: 3 },
      { condition: [7, 4, 1], effect: 'remove_enemy_defense', value: 2 }, // centre
      { condition: [6, 8, 0, 2], effect: 'exile', value: 1, target: 'col' },
      { condition: 'default', effect: 'remove_enemy_attack', value: 1 },
    ],
    customResolve: null,
  },

  // 6 — Spécial à double tranchant. Couvre tous les effets "ennemi" agressifs
  //     et leurs multiplicateurs. Effets : multiply_enemy_defense (coeur, x0 =
  //     annule la défense ennemie), add_enemy_defense, multiply_enemy_attack,
  //     add_enemy_attack (revers en terre / par défaut).
  {
    id: 'power_curse',
    type: 'special',
    rarity: Rarity.EPIC,
    rules: [
      { condition: [4], effect: 'multiply_enemy_defense', value: 0 },        // coeur
      { condition: 'adjacent_to:offensive', effect: 'add_enemy_defense', value: 1 },
      { condition: [0, 1, 2], effect: 'multiply_enemy_attack', value: 2 },   // terre (revers)
      { condition: 'default', effect: 'add_enemy_attack', value: 1 },        // revers
    ],
    customResolve: null,
  },

  // 7 — Support. Ressources et soins. Effets : heal, maneuver, enemy_heal
  //     (revers près d'un spécial), strategy.
  {
    id: 'power_medic',
    type: 'support',
    rarity: Rarity.COMMON,
    rules: [
      { condition: 'adjacent_to:support', effect: 'heal', value: 3 },
      { condition: [0, 1, 2], effect: 'maneuver', value: 1 },          // terre
      { condition: 'adjacent_to:special', effect: 'enemy_heal', value: 1 },
      { condition: 'default', effect: 'strategy', value: 1 },
    ],
    customResolve: null,
  },

  // 8 — Spécial. Économie et manipulation de deck. Effets : credit (coeur),
  //     draw (isolé), discard/exile avec cibles "above", indices absolus, "row".
  {
    id: 'power_tactician',
    type: 'special',
    rarity: Rarity.EPIC,
    rules: [
      { condition: [4], effect: 'credit', value: 1 },                      // coeur
      { condition: 'isolated', effect: 'draw', value: 2 },
      { condition: [6, 7, 8], effect: 'discard', value: 1, target: 'above' }, // ciel
      { condition: [3, 4, 5], effect: 'exile', value: 1, target: [0, 1, 2] }, // surface → terre
      { condition: 'default', effect: 'discard', value: 1, target: 'row' },
    ],
    customResolve: null,
  },

  // 9 — Offensif. Sabotage du plateau : couvre les cibles relatives restantes.
  //     Effets : exile (neighbors), discard (self/right/left/below).
  {
    id: 'power_sabotage',
    type: 'offensive',
    rarity: Rarity.LEGENDARY,
    rules: [
      { condition: 'adjacent_to:offensive', effect: 'exile', value: 1, target: 'neighbors' },
      { condition: [8, 5, 2], effect: 'discard', value: 1, target: 'self' },   // droite
      { condition: [6, 3, 0], effect: 'discard', value: 1, target: 'right' },  // gauche
      { condition: [0, 1, 2], effect: 'discard', value: 1, target: 'left' },   // terre
      { condition: 'default', effect: 'discard', value: 1, target: 'below' },
    ],
    customResolve: null,
  },
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
