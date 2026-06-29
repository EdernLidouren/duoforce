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
//                Pour les gadgets à ciblage, peut être une fonction (targets, gadget) => action.
//   counter    — { max: number } | null  (état { value, max } dans l'instance live)
//   targeting  — TargetingStep descriptors | null (voir docs/targeting-system.md).
//                Absent ou vide : effet global immédiat.
//                Présent : la séquence de ciblage est déroulée avant l'application.
//                Chaque descripteur : { targetType, labelKey, forbiddenLabelKey,
//                  emptyKey?, autoSelect?, isValid(pos,board)?, getItems(collected,state)?,
//                  describeItem(item,strings)? }
//                labelKey/forbiddenLabelKey/emptyKey sont des clés dans
//                strings.gadgets[gadget.id] (ex. 'selectZone', 'emptyZone').
//   triggers   — Array<{ on: string, fn: (gadget, combatState) => void }> | []
//                Réactions automatiques à des events (ex. 'turn_end').
//                Aligné sur le pattern onTurnEnd des statuts et perks.
//                Non sérialisé (fonctions) — rechargé depuis le catalogue.
//                Note : fn n'importe pas de engine/gadgets.js pour éviter un cycle
//                (data/gadgets → engine/gadgets → data/gadgets). La logique de
//                compteur est inlinée directement dans fn.
//
// Aucun DOM, aucune dépendance UI.

import { reachablePositions } from '../../engine/maneuver.js';

export const GADGETS = [
  {
    // Pansement : soin rapide utilisable depuis la base secrète.
    id:         'gadget_bandage',
    trigger:    'manual',
    consumable: true,
    usableIn:   'hub',
    actions:    [{ type: 'heal', target: 'duo', value: 5 }],
    targeting:  null,
    triggers:   [],
    counter:    null,
  },
  {
    // Trousse de soin : soin important, utilisable partout.
    id:         'gadget_medkit',
    trigger:    'manual',
    consumable: true,
    usableIn:   'hub',
    actions:    [{ type: 'heal', target: 'duo', value: 15 }],
    targeting:  null,
    triggers:   [],
    counter:    null,
  },
  {
    // Stimulateur : +3 en attaque au duo pour ce tour — combat uniquement.
    // Visible au hub mais non utilisable là-bas (cadre 'combat').
    id:         'gadget_energizer',
    trigger:    'manual',
    consumable: true,
    usableIn:   'combat',
    actions:    [{ type: 'add_attack', target: 'duo', value: 3 }],
    targeting:  null,
    triggers:   [],
    counter:    null,
  },
  {
    // Cryo-grenade : gèle une zone choisie pendant 2 tours — combat uniquement.
    // Séquence de ciblage : l'utilisateur sélectionne la zone à geler.
    // L'action utilise la position collectée (targets[0]) pour appliquer le statut.
    id:         'gadget_cryo_blast',
    trigger:    'manual',
    consumable: true,
    usableIn:   'combat',
    actions:    [
      (targets) => ({
        type:   'apply_status',
        target: { type: 'area', position: targets[0] },
        value:  { statusId: 'area_freeze_status', stacks: 2 },
      }),
    ],
    targeting: [
      {
        targetType:        'area',
        labelKey:          'selectZone',
        forbiddenLabelKey: 'emptyZone',
        isValid: (pos, board) => board[pos]?.power != null,
      },
    ],
    triggers:   [],
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
    targeting:  null,
    triggers:   [],
    counter:    { max: 3 },
  },

  // -----------------------------------------------------------------------
  // Gadgets de test (stress-test des mécanismes avancés)
  // -----------------------------------------------------------------------

  {
    // Téléporteur : déplace un pouvoir vers une zone adjacente vide.
    //
    // Ciblage enchaîné dépendant — deux étapes :
    //   Étape 1 (area)   : choisir une zone contenant un pouvoir (source).
    //   Étape 2 (list)   : choisir parmi les zones adjacentes VIDES à l'étape 1.
    //                      getItems lit collected[0] pour filtrer les candidats.
    //
    // Action : swap_powers(étape1, étape2).
    //   → source a un pouvoir, target est vide → équivalent à un move unilatéral.
    //   Passe par anchorInterceptor (si l'une des deux zones est ancrée : bloqué).
    //
    // Friction signalée : move_power n'a pas d'exécuteur dans le dispatcher
    // (marqué TODO dans actions.js). Contournement : swap_powers avec cible vide.
    //
    // Friction signalée : describeItem(pos, strings) n'a pas accès au board —
    // le catalogue ne peut pas décrire la case (dépendance UI interdite).
    // Solution : laisser describeItem absent → openGadgetUse fournit un fallback
    // qui appelle describeCellAt(pos) en closure sur state.
    id:         'gadget_teleporter',
    trigger:    'manual',
    consumable: true,
    usableIn:   'combat',
    triggers:   [],
    actions: [
      (targets) => ({
        type:   'swap_powers',
        source: targets[0],  // zone-source (avec pouvoir, choisie à l'étape 1)
        target: targets[1],  // zone-cible adjacente vide (choisie à l'étape 2)
      }),
    ],
    targeting: [
      {
        // Étape 1 : zone source.
        targetType:        'area',
        labelKey:          'selectSource',
        forbiddenLabelKey: 'emptySource',
        isValid: (pos, board) => board[pos]?.power != null,
      },
      {
        // Étape 2 : zones adjacentes à la source, vides.
        // getItems reçoit (collected, state) — collected[0] est la position choisie à l'étape 1.
        targetType: 'list',
        labelKey:   'selectDest',
        emptyKey:   'noAdjacentEmpty',
        getItems: (collected, state) =>
          reachablePositions(collected[0], 1)
            .filter((pos) => state.board[pos]?.power == null),
        // describeItem omis intentionnellement → openGadgetUse fournit le fallback
        // describeCellAt(pos) via closure sur state (friction documentée).
      },
    ],
    counter: null,
  },

  {
    // Résonateur : effet proportionnel à la jauge de charge.
    //
    // Trigger 'turn_end' : incrémente le compteur à chaque fin de tour.
    //   → Aligné sur le pattern onTurnEnd des statuts et des perks.
    //   → Aucun id de gadget en dur dans la scène de combat (la boucle générique
    //     processGadgetTriggers(run, 'turn_end', state) remplace le code spécifique).
    //
    // Note : fn n'importe pas incrementCounter (cycle data↔engine) — la logique
    //   est inlinée directement.
    //
    // Effet conditionnel à l'usage :
    //   jauge incomplète (value < max) → add_attack +value au duo (min 1)
    //   jauge pleine    (value >= max) → heal duo +max*4
    id:         'gadget_resonator',
    trigger:    'manual',
    consumable: true,
    usableIn:   'combat',
    actions: [
      (targets, gadget) => {
        const val = gadget.counter?.value ?? 0;
        const max = gadget.counter?.max ?? 3;
        if (val >= max) {
          return { type: 'heal', target: 'duo', value: max * 4 };
        }
        return { type: 'add_attack', target: 'duo', value: Math.max(1, val) };
      },
    ],
    targeting: null,
    triggers: [
      {
        on: 'turn_end',
        fn: (gadget) => {
          // Incrémente la jauge sans dépasser le maximum.
          // Logique identique à incrementCounter() — inlinée pour éviter un cycle
          // d'import (data/gadgets ↔ engine/gadgets).
          const c = gadget.counter;
          if (c && c.value < c.max) c.value += 1;
        },
      },
    ],
    counter: { max: 3 },
  },

  {
    // Neutraliseur : pose area_anchor_status sur une zone ciblée.
    //
    // Passe par le pipeline executeAction → immunityInterceptor.
    // Si le pouvoir dans la zone ciblée a immuneToNegativeStatus: true,
    // l'action est annulée (action.cancelled = true) et le gadget n'est PAS consommé.
    //
    // Friction signalée : avant ce fix, applyGadgetActionsCombat consommait
    // systématiquement, même en cas d'annulation par intercepteur.
    // Fix appliqué : on vérifie action.cancelled ; consommation conditionnelle.
    //
    // area_anchor_status est différé (_pendingAreaStatuses → actif au tour suivant).
    id:         'gadget_nullifier',
    trigger:    'manual',
    consumable: true,
    usableIn:   'combat',
    triggers:   [],
    actions: [
      (targets) => ({
        type:   'apply_status',
        target: { type: 'area', position: targets[0] },
        value:  { statusId: 'area_anchor_status', stacks: 2 },
      }),
    ],
    targeting: [
      {
        targetType:        'area',
        labelKey:          'selectZone',
        forbiddenLabelKey: 'emptyZone',
        isValid: (pos, board) => board[pos]?.power != null,
      },
    ],
    counter: null,
  },
];

const GADGET_MAP = new Map(GADGETS.map((g) => [g.id, g]));

/** Retourne la définition catalogue d'un gadget par son id, ou null. */
export function getGadgetById(id) {
  return GADGET_MAP.get(id) ?? null;
}
