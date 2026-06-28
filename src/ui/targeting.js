// src/ui/targeting.js — TargetingResolver : orchestrateur de séquences de ciblage.
//
// Structures :
//   TargetingSequence : tableau ordonné de TargetingStep.
//   TargetingStep     : décrit une sélection à faire (type, validation, libellé).
//   TargetingResolver : déroule une séquence étape par étape, accumule les cibles
//                       dans collectedTargets, et les restitue à onComplete().
//
// Le resolver ne connaît ni gadgets, ni pouvoirs, ni manœuvre en particulier.
// Il déroule des étapes et restitue des cibles. L'application des effets via le
// pipeline d'actions (et toute consommation de ressource) est à la charge de
// l'appelant, après validation complète de la séquence.
//
// Types d'étape supportés :
//   'area' → createZoneSelector (grille du plateau)
//   'list' → createStrategyPicker (menu linéaire)
//   autres → stub (console.warn + annulation propre)
//
// Annulation en pile :
//   Échap à une étape > 0 recule d'une étape (oublie la cible de l'étape courante,
//   ouvre à nouveau l'étape précédente).
//   Échap à l'étape 0 annule toute la séquence : onCancel() est appelé, rien
//   n'est appliqué, aucune ressource n'est consommée.
//
// Intégration dans combat.js :
//   activeSelector = createTargetingResolver({ steps, resolveContext, onComplete, onCancel });
//   boardKeyHandler = (e) => activeSelector.handleKey(e);
//   activeSelector.start();
//   // onComplete / onCancel réinitialisent boardKeyHandler = onBoardKey.
//
// Contrat d'une TargetingStep (selon targetType) :
//   Commune :
//     targetType   : 'area' | 'list' | 'power' | 'hero' | 'gadget'
//     label        : string | (collectedSoFar: any[]) => string
//   Pour 'area' :
//     getZoneState : (pos, collectedSoFar, resolveContext) => { status, label?, sources? }
//     forbiddenPrefix : string  (préfixe annoncé pour les zones interdites)
//     initialPosition : number | (collectedSoFar) => number  (défaut 4)
//   Pour 'list' :
//     getItems     : (collectedSoFar, resolveContext) => any[]
//     describeItem : (item, strings) => string
//     autoSelect   : boolean  (confirme automatiquement si 1 seul item)
//     emptyLabel   : string   (annoncé si aucun item disponible, puis annulation)
//
// Aucun DOM propre — délègue entièrement à zoneSelector et strategyPicker.

import { createZoneSelector } from './zoneSelector.js';
import { createStrategyPicker } from './strategyPicker.js';

/**
 * Crée un TargetingResolver.
 *
 * @param {object}   options
 * @param {object[]} options.steps           Séquence d'étapes (TargetingStep[]).
 * @param {object}   options.resolveContext  { tdByIndex, announce, strings, describeCell }
 * @param {Function} options.onComplete      (collectedTargets: any[]) => void
 * @param {Function} options.onCancel        () => void
 * @returns {{ start: Function, close: Function, handleKey: Function }}
 */
export function createTargetingResolver({ steps, resolveContext, onComplete, onCancel }) {
  let stepIndex = 0;
  let collectedTargets = [];
  let activePicker = null;

  // --- Navigation séquentielle -----------------------------------------------

  /**
   * Recule d'une étape (ou annule toute la séquence si déjà à l'étape 0).
   * L'appelant (onCancel d'un picker) a déjà nullé activePicker avant d'appeler
   * backtrack, donc la guard activePicker.close() ici n'est qu'une sécurité.
   */
  function backtrack() {
    if (activePicker) { activePicker.close(); activePicker = null; }
    if (stepIndex === 0) {
      onCancel();
    } else {
      collectedTargets.pop();
      stepIndex--;
      startStep(stepIndex);
    }
  }

  /**
   * Valide la cible de l'étape courante et avance à la suivante (ou termine).
   */
  function advance(result) {
    collectedTargets.push(result);
    stepIndex++;
    if (stepIndex >= steps.length) {
      activePicker = null;
      onComplete([...collectedTargets]);
    } else {
      startStep(stepIndex);
    }
  }

  // --- Démarrage d'une étape -------------------------------------------------

  function startStep(i) {
    const step = steps[i];
    const label = typeof step.label === 'function'
      ? step.label(collectedTargets)
      : (step.label ?? '');

    if (step.targetType === 'area') {
      startAreaStep(step, label);
    } else if (step.targetType === 'list') {
      startListStep(step, label);
    } else {
      // Type non implémenté — annule proprement avec avertissement.
      console.warn(
        `[TargetingResolver] type d'étape '${step.targetType}' non implémenté — annulation.`,
      );
      activePicker = null;
      onCancel();
    }
  }

  /**
   * Ouvre la brique createZoneSelector pour une étape de type 'area'.
   * getZoneState reçoit les cibles collectées aux étapes précédentes
   * pour permettre les étapes dépendantes (ex. « zone adjacente à l'étape 1 »).
   */
  function startAreaStep(step, label) {
    const initialPos = typeof step.initialPosition === 'function'
      ? step.initialPosition(collectedTargets)
      : (step.initialPosition ?? 4);

    activePicker = createZoneSelector({
      tdByIndex:       resolveContext.tdByIndex,
      strings:         resolveContext.strings,
      announce:        resolveContext.announce,
      getZoneState:    (pos) => step.getZoneState(pos, collectedTargets, resolveContext),
      describeCell:    resolveContext.describeCell,
      openMessage:     label,
      forbiddenPrefix: step.forbiddenPrefix,
      onConfirm:       (pos) => { activePicker = null; advance(pos); },
      onCancel:        () => { activePicker = null; backtrack(); },
      initialPosition: initialPos,
    });
    activePicker.open();
  }

  /**
   * Ouvre la brique createStrategyPicker pour une étape de type 'list'.
   * getItems reçoit les cibles collectées pour permettre le filtrage dépendant.
   * Si un seul item et autoSelect=true, confirme sans ouvrir de picker.
   * Si aucun item, annonce emptyLabel et annule la séquence.
   */
  function startListStep(step, label) {
    const items = step.getItems(collectedTargets, resolveContext);

    if (items.length === 0) {
      activePicker = null;
      resolveContext.announce.polite(
        step.emptyLabel
          ?? resolveContext.strings?.targeting?.noItems
          ?? 'No options available.',
      );
      onCancel();
      return;
    }

    if (items.length === 1 && step.autoSelect) {
      // Confirmation silencieuse : un seul choix possible, pas d'interface.
      advance(items[0]);
      return;
    }

    activePicker = createStrategyPicker({
      items,
      getLabel:    (item) => step.describeItem(item, resolveContext.strings),
      announce:    (text) => resolveContext.announce.polite(text),
      openMessage: label,
      onConfirm:   (chosen) => { activePicker = null; advance(chosen); },
      onCancel:    () => { activePicker = null; backtrack(); },
    });
    activePicker.open();
  }

  // --- API publique -----------------------------------------------------------

  /** Délègue les touches au picker de l'étape active. */
  function handleKey(event) {
    return activePicker ? activePicker.handleKey(event) : false;
  }

  /** Ferme le picker actif proprement (CSS nettoyé). Appelé si le caller annule de l'extérieur. */
  function close() {
    if (activePicker) { activePicker.close(); activePicker = null; }
  }

  /** Démarre la séquence depuis l'étape 0. */
  function start() {
    stepIndex = 0;
    collectedTargets = [];
    startStep(0);
  }

  return { start, close, handleKey };
}
