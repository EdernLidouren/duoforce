// src/ui/keybindings.js — Registre centralisé des raccourcis clavier globaux.
//
// But : un seul endroit décrit les raccourcis « globaux » du jeu (ceux qui ne
// relèvent pas de la navigation d'un widget précis, gérée par ui/input.js ou
// ui/zones.js). On ajoute un raccourci en complétant l'objet KEYBINDINGS.
//
// Un raccourci = { id, key, ctrl?, shift?, alt?, meta?, descriptionId } :
//   - key          : valeur de KeyboardEvent.key, comparée sans tenir compte de
//                    la casse (ex. 'e', 'v', 'Enter', 'Escape').
//   - ctrl/shift/alt/meta : modificateurs requis (false par défaut). Un raccourci
//                    ne correspond que si l'état des modificateurs est EXACT.
//   - descriptionId : id de chaîne (localisation) décrivant l'action.
//
// matchKeybinding(event) renvoie le raccourci correspondant, ou null.
// matchPositionKey(event) gère à part la famille des touches 1–9 (rangée du haut
// ou pavé numérique), qui désignent un emplacement du plateau (0–8) plutôt qu'une
// action fixe.
//
// La pose du listener et l'action associée restent à la charge de la scène (pour
// un cycle de vie propre : brancher au mount, débrancher au unmount).
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
  ANNOUNCE_DUO_HP: {
    id: 'announce_duo_hp',
    key: 'v',
    descriptionId: 'keybinding_duo_hp',
  },
  ANNOUNCE_ENEMY_HP: {
    id: 'announce_enemy_hp',
    key: 'v',
    shift: true,
    descriptionId: 'keybinding_enemy_hp',
  },
  ANNOUNCE_DUO_ATTACK: {
    id: 'announce_duo_attack',
    key: 'a',
    descriptionId: 'keybinding_duo_attack',
  },
  ANNOUNCE_ENEMY_ATTACK: {
    id: 'announce_enemy_attack',
    key: 'a',
    shift: true,
    descriptionId: 'keybinding_enemy_attack',
  },
  ANNOUNCE_DUO_DEFENSE: {
    id: 'announce_duo_defense',
    key: 'd',
    descriptionId: 'keybinding_duo_defense',
  },
  ANNOUNCE_ENEMY_DEFENSE: {
    id: 'announce_enemy_defense',
    key: 'd',
    shift: true,
    descriptionId: 'keybinding_enemy_defense',
  },
  ANNOUNCE_MANEUVERS: {
    id: 'announce_maneuvers',
    key: 'm',
    descriptionId: 'keybinding_maneuvers',
  },
  ANNOUNCE_STRATEGIES: {
    id: 'announce_strategies',
    key: 's',
    descriptionId: 'keybinding_strategies',
  },
  ANNOUNCE_CREDIT: {
    id: 'announce_credit',
    key: 'c',
    descriptionId: 'keybinding_credit',
  },
  ANNOUNCE_TURN: {
    id: 'announce_turn',
    key: 't',
    descriptionId: 'keybinding_turn',
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

/**
 * Touches 1–9 (rangée du haut OU pavé numérique), sans modificateur, désignant
 * un emplacement du plateau. La disposition du pavé numérique (789 / 456 / 123)
 * correspond aux index du plateau, d'où : emplacement = chiffre − 1.
 *   pavé/chiffre 7 → index 6 (ciel gauche) … chiffre 1 → index 0 (terre gauche).
 * @param {KeyboardEvent} event
 * @returns {number|null} index d'emplacement 0–8, ou null
 */
export function matchPositionKey(event) {
  if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return null;
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
  if (!match) return null;
  return Number(match[1]) - 1;
}
