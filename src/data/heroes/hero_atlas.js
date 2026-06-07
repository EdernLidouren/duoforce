// src/data/heroes/hero_atlas.js
// Héros placeholder, orienté attaque / défense. 8 cartes de départ.
// Référence les pouvoirs par id (résolus en objets dans combat.js).

export const hero_atlas = {
  id: 'hero_atlas',
  nameId: 'hero_atlas_name',
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
};
