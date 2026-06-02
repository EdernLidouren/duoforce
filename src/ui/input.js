// src/ui/input.js — Inputs clavier custom.
//
// Responsabilités :
//   - Capter les événements clavier et les traduire en intentions de jeu
//     abstraites (déplacer, sélectionner, valider, annuler…), indépendantes
//     des touches physiques.
//   - Exposer une carte de touches (keymap) configurable.
//   - Fournir branchement/débranchement propre des écouteurs (les scènes les
//     appellent dans mount()/unmount()).
//
// Contrainte : ne contient aucune règle de jeu. Émet des intentions ; c'est la
// scène qui décide quoi en faire (appeler engine, annoncer, re-rendre).

/** Intentions abstraites émises vers les scènes. */
export const Intent = Object.freeze({
  MOVE_UP: 'move-up',
  MOVE_DOWN: 'move-down',
  MOVE_LEFT: 'move-left',
  MOVE_RIGHT: 'move-right',
  CONFIRM: 'confirm',
  CANCEL: 'cancel',
});

/** Carte par défaut : code touche (KeyboardEvent.key) → intention. */
export const defaultKeymap = Object.freeze({
  ArrowUp: Intent.MOVE_UP,
  ArrowDown: Intent.MOVE_DOWN,
  ArrowLeft: Intent.MOVE_LEFT,
  ArrowRight: Intent.MOVE_RIGHT,
  Enter: Intent.CONFIRM,
  ' ': Intent.CONFIRM,
  Escape: Intent.CANCEL,
});

/**
 * Branche l'écoute clavier sur un élément.
 * @param {HTMLElement} target  Élément focusable recevant le clavier.
 * @param {(intent: string, event: KeyboardEvent) => void} onIntent
 * @param {object} [keymap]
 * @returns {() => void} fonction de débranchement à appeler dans unmount().
 */
export function attachInput(target, onIntent, keymap = defaultKeymap) {
  function handleKeydown(event) {
    const intent = keymap[event.key];
    if (!intent) return;
    event.preventDefault();
    onIntent(intent, event);
  }

  target.addEventListener('keydown', handleKeydown);
  return () => target.removeEventListener('keydown', handleKeydown);
}
