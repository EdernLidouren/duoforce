// src/ui/preferences.js — Préférences utilisateur (accessibilité / interface).
//
// Objet unique, mutable, lu en direct par les modules concernés : changer une
// valeur ici modifie le comportement immédiatement (utile pour un futur écran
// d'options). Chaque clé est nommée explicitement ; on en ajoutera régulièrement.
//
// Pour chaque option, prévoir un nom et une description localisés dans les packs
// de langue, sous la clé `preferences` (indexée par le nom de l'option).
//
// Aucun DOM.

export const preferences = {
  // Cyclage des menus : au bord d'un menu vertical, presser la direction renvoie
  // le curseur à l'autre extrémité (true) plutôt que de rester bloqué (false).
  menuCycling: false,
};
