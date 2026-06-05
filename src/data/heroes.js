// src/data/heroes.js — Données des héros (placeholder).
//
// Un héros référence ses pouvoirs de départ par leur id (voir src/data/powers.js),
// avec d'éventuelles copies (mêmes id répétés) pour ajuster la composition du
// deck. À l'initialisation d'un combat, les pouvoirs des deux héros du duo sont
// fusionnés puis mélangés en un unique deck (cf. docs/combats.md).
//
// Contraintes respectées :
//   - chaque id de starting_powers existe dans powers.js,
//   - le deck combiné des deux héros fait au moins 15 cartes (ici 8 + 8 = 16),
//   - signature est null pour les deux placeholders.
//
// Les noms sont des id de chaîne (localisation), pas du texte affichable.
// Module de données pur — aucun DOM. Référence les pouvoirs par id uniquement
// (pas d'import de powers.js) : la résolution id → objet se fait dans combat.js.

export const HEROES = [
  {
    id: 'hero_atlas',
    nameId: 'hero_atlas_name',
    // 8 cartes, orientées attaque / défense.
    starting_powers: [
      'power_aerial_strike',
      'power_aerial_strike',
      'power_vanguard',
      'power_vanguard',
      'power_shield',
      'power_shield',
      'power_phalanx',
      'power_medic',
    ],
    signature: null,
  },
  {
    id: 'hero_nova',
    nameId: 'hero_nova_name',
    // 8 cartes, orientées contrôle / spécial.
    starting_powers: [
      'power_disrupt',
      'power_disrupt',
      'power_curse',
      'power_curse',
      'power_tactician',
      'power_sabotage',
      'power_sabotage',
      'power_medic',
    ],
    signature: null,
  },
];

/** Index id → héros. */
const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));

/**
 * Retourne le héros correspondant à un id, ou undefined si inconnu.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getHeroById(id) {
  return HERO_BY_ID.get(id);
}
