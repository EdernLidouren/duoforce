// src/data/gadgets/index.js — Catalogue des gadgets.
//
// Chaque entrée est une DÉFINITION (immuable). L'instance vivante (avec état
// mutable : counter.value, statuses) est créée par createGadgetInstance() dans
// src/engine/gadgets.js.
//
// Propriétés spécifiques aux gadgets (voir docs/gadget-system.md) :
//   trigger    — 'manual' par défaut ; n'interdit pas un effet passif (game design)
//   consumable — true par défaut : consommé après utilisation
//   usableIn   — 'combat' | 'hub' | 'both' : cadre d'usage (visible partout)
//   actions    — effets à exécuter à l'usage (même système que les pouvoirs).
//                Types compatibles hub : 'heal'. Types combat : tout le dispatcher.
//   counter    — { max: number } | null  (état { value, max } dans l'instance live)
//
// Aucun DOM, aucune dépendance UI.

export const GADGETS = [
  {
    // Pansement : soin rapide utilisable depuis la base secrète.
    id:         'gadget_bandage',
    trigger:    'manual',
    consumable: true,
    usableIn:   'hub',
    actions:    [{ type: 'heal', target: 'duo', value: 5 }],
    counter:    null,
  },
  {
    // Trousse de soin : soin important, utilisable partout.
    id:         'gadget_medkit',
    trigger:    'manual',
    consumable: true,
    usableIn:   'hub',
    actions:    [{ type: 'heal', target: 'duo', value: 15 }],
    counter:    null,
  },
  {
    // Stimulateur : boost d'attaque ponctuel — combat uniquement.
    // Visible au hub mais son usage n'a aucun effet ici (cadre 'combat').
    id:         'gadget_energizer',
    trigger:    'manual',
    consumable: true,
    usableIn:   'combat',
    actions:    [],   // Placeholder — bonus d'attaque à implémenter
    counter:    null,
  },
  {
    // Cellule de charge : se recharge au fil des tours, utilisable partout.
    // Non consommée (peut se recharger à nouveau). La condition jauge pleine
    // est déclarée dans ses actions, pas imposée par le moteur.
    id:         'gadget_charge_cell',
    trigger:    'manual',
    consumable: false,
    usableIn:   'both',
    actions:    [],   // Placeholder — effet conditionnel jauge pleine à implémenter
    counter:    { max: 3 },
  },
];

const GADGET_MAP = new Map(GADGETS.map((g) => [g.id, g]));

/** Retourne la définition catalogue d'un gadget par son id, ou null. */
export function getGadgetById(id) {
  return GADGET_MAP.get(id) ?? null;
}
