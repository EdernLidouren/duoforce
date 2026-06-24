// src/data/heroes/hero_paladium.js
// Héros défensif/tank. Deck de départ : une copie de chacun des dix pouvoirs
// Paladium. Référence les pouvoirs par id (résolus en objets dans combat.js).

export const hero_paladium = {
  id: 'hero_paladium',
  nameId: 'hero_paladium',
  hp: 15,
  starting_powers: [
    'iron_will_power',
    'impregnable_power',
    'helmbutt_power',
    'iron_grip_power',
    'shield_charge_power',
    'metalloy_power',
    'heavy_slam_power',
    'force_palm_power',
    'close_protection_power',
    'lead_boots_power',
  ],
  signature: 'rusted_armor_perk',
};
