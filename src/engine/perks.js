// src/engine/perks.js — Moteur des signatures (perks).
//
// Une SIGNATURE (perk) est un effet PASSIF permanent pour la durée du combat,
// attaché à un camp (owner : 'duo' ou 'enemy'). Contrairement à un statut, elle
// n'a ni stacks, ni cible propre, ni limite de slots ; un camp peut en porter
// plusieurs. Structure d'une définition (src/data/perks/) :
//   {
//     id: string,
//     onTurnEnd?:           (combatState, ctx, owner) => void,
//     onPowerBlockedByArea?: (combatState, area, owner) => activation|null,
//     modifiers?: [],   // appliqués chaque tour (avant résolution)
//     triggers?:  [],   // évalués après chaque pouvoir résolu
//     descriptionData?:  (combatState) => object, // valeurs dynamiques pour la description
//   }
//
// Stockage : combatState.duo.perks / combatState.enemy.perks (tableaux de
// définitions ; stateless, donc partagées sans copie).
// État par-combat (ex. compteurs) : combatState.perkCounters[perkId].
//
// Points d'intégration (parallèles à ceux des statuts) :
//   - applyPerkModifiers        ↔ applyModifiers   (resolveBoard, avant la boucle)
//   - evaluatePerkTriggers      ↔ evaluateTriggers (resolveBoard, après chaque pouvoir)
//   - evaluatePerkBlockTriggers                    (resolveBoard, quand un pouvoir est bloqué par zone)
//   - processPerksTurnEnd       ↔ processTurnEnd   (resolveTurn, fin de tour)
//
// Aucun DOM.

/** Couples [owner, perks] pour le duo puis l'ennemi. */
function ownerPerks(combatState) {
  return [
    ['duo', combatState.duo?.perks],
    ['enemy', combatState.enemy?.perks],
  ];
}

/**
 * Applique les modificateurs de toutes les signatures à leur owner (à appeler
 * chaque tour, avant la résolution — même point que applyModifiers des statuts).
 * Un perk étant sans stacks, `mod.value()` est appelé sans argument.
 * @param {object} combatState
 */
export function applyPerkModifiers(combatState) {
  for (const [owner, perks] of ownerPerks(combatState)) {
    if (!Array.isArray(perks)) continue;
    const subject = combatState[owner];
    if (!subject) continue;
    for (const perk of perks) {
      for (const mod of perk.modifiers ?? []) {
        const n = mod.value();
        const prop = mod.property;
        if (mod.operation === 'add') subject[prop] = (subject[prop] ?? 0) + n;
        else if (mod.operation === 'multiply') subject[prop] = (subject[prop] ?? 0) * n;
        else if (mod.operation === 'override') subject[prop] = n;
      }
    }
  }
}

/**
 * Évalue/déclenche les triggers de toutes les signatures (à appeler après chaque
 * pouvoir résolu — même point que evaluateTriggers des statuts).
 * @param {object} combatState
 * @param {object} ctx  contexte du pouvoir courant
 */
export function evaluatePerkTriggers(combatState, ctx) {
  for (const [owner, perks] of ownerPerks(combatState)) {
    if (!Array.isArray(perks)) continue;
    for (const perk of perks) {
      for (const trig of perk.triggers ?? []) {
        if (trig.condition(combatState, owner)) trig.effect(ctx, owner);
      }
    }
  }
}

/**
 * Évalue les hooks onPowerBlockedByArea de toutes les signatures (à appeler
 * uniquement lors de la résolution réelle, quand un power_blocked_by_area est émis).
 * Retourne les activations de perk (objets { perkId, effects }) à inclure dans le rapport.
 * @param {object} combatState  copie de travail (perkCounters partagé par référence)
 * @param {object} area         zone dont le pouvoir vient d'être bloqué
 * @returns {Array}
 */
export function evaluatePerkBlockTriggers(combatState, area) {
  const activations = [];
  for (const [owner, perks] of ownerPerks(combatState)) {
    if (!Array.isArray(perks)) continue;
    for (const perk of perks) {
      if (typeof perk.onPowerBlockedByArea === 'function') {
        const act = perk.onPowerBlockedByArea(combatState, area, owner);
        if (act) activations.push(act);
      }
    }
  }
  return activations;
}

/**
 * Appelle onTurnEnd de chaque signature (à appeler en fin de tour — même moment
 * que processTurnEnd des statuts).
 * @param {object} combatState
 */
export function processPerksTurnEnd(combatState) {
  const ctx = { combatState };
  for (const [owner, perks] of ownerPerks(combatState)) {
    if (!Array.isArray(perks)) continue;
    for (const perk of perks) {
      if (typeof perk.onTurnEnd === 'function') perk.onTurnEnd(combatState, ctx, owner);
    }
  }
}
