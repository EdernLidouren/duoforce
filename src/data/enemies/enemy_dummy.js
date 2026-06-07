// src/data/enemies/enemy_dummy.js
// Ennemi factice pour les tests de combat (fixture, hors catalogue ENEMIES).
//
// À terme, un adversaire pourra être soit un ennemi classique (objet comme
// celui-ci), soit un héros converti en boss (objet hero adapté à l'init du
// combat). Cette bascule n'est pas implémentée.

export const DUMMY_ENEMY = {
  id: 'enemy_dummy',
  nameId: 'enemy_dummy', // clé de localisation (pack `enemies`)
  hp: 24,
  attack: 6,
  defense: 2,
};
