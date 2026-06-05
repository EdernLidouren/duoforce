// src/ui/keybindings.js — Registre centralisé des raccourcis clavier globaux.
//
// But : un seul endroit décrit les raccourcis « globaux » du jeu (ceux qui ne
// relèvent pas de la navigation d'un widget précis, gérée par ui/input.js). On
// peut ajouter un raccourci en complétant simplement l'objet KEYBINDINGS.
//
// Un raccourci = { id, key, ctrl?, shift?, alt?, meta?, descriptionId } :
//   - key          : valeur de KeyboardEvent.key, comparée sans tenir compte de
//                    la casse (ex. 'e', 'Enter', 'Escape', 'ArrowUp').
//   - ctrl/shift/alt/meta : modificateurs requis (false par défaut). Un raccourci
//                    ne correspond que si l'état des modificateurs est EXACT.
//   - descriptionId : id de chaîne (localisation) décrivant l'action.
//
// matchKeybinding(event) renvoie le raccourci correspondant, ou null. La pose du
// listener et l'action associée restent à la charge de la scène (pour un cycle
// de vie propre : brancher au mount, débrancher au unmount).
//
// Aucun DOM ici : ce module ne lit/écrit pas le document, il décrit et compare.

/** Raccourcis globaux, indexés par identifiant d'action. */
export const KEYBINDINGS = {
  END_TURN: {
    id: 'end_turn',
    key: 'e',
    ctrl: true,
    descriptionId: 'keybinding_end_turn',
  },
};

/**
 * Un événement clavier correspond-il exactement à un raccourci ?
 * @param {KeyboardEvent} event
 * @param {object} binding
 * @returns {boolean}
 */
function eventMatches(event, binding) {
  return (
    event.key.toLowerCase() === binding.key.toLowerCase() &&
    event.ctrlKey === Boolean(binding.ctrl) &&
    event.shiftKey === Boolean(binding.shift) &&
    event.altKey === Boolean(binding.alt) &&
    event.metaKey === Boolean(binding.meta)
  );
}

/**
 * Retourne le raccourci correspondant à un événement clavier, ou null.
 * @param {KeyboardEvent} event
 * @returns {object|null}
 */
export function matchKeybinding(event) {
  for (const binding of Object.values(KEYBINDINGS)) {
    if (eventMatches(event, binding)) return binding;
  }
  return null;
}
