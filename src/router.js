// src/router.js — Routeur de scènes minimaliste.
//
// Modèle :
//   - Table de scènes enregistrées (nom → objet scène).
//   - Une scène est un objet exposant mount(context) et unmount().
//   - Le routeur garde la scène active en mémoire. À chaque navigation :
//       1. appelle unmount() sur la scène sortante (si présente),
//       2. mémorise la nouvelle scène active,
//       3. appelle mount(context) sur la scène entrante.
//   - Pas d'historique, pas d'URL : navigation unidirectionnelle pilotée par
//     le code via router.go(name).
//
// Le routeur ne connaît rien du jeu ni du DOM ; il orchestre seulement le
// cycle de vie des scènes.

/**
 * @param {object} context  Contexte partagé injecté dans chaque mount().
 * @returns {{ register: Function, go: Function, current: Function }}
 */
export function createRouter(context) {
  /** @type {Map<string, {mount: Function, unmount?: Function}>} */
  const scenes = new Map();
  let activeScene = null;
  let activeName = null;

  /**
   * Enregistre une scène sous un nom unique.
   * @param {string} name
   * @param {{mount: Function, unmount?: Function}} scene
   */
  function register(name, scene) {
    scenes.set(name, scene);
  }

  /**
   * Navigue vers la scène nommée : démonte l'ancienne, monte la nouvelle.
   * @param {string} name
   */
  function go(name) {
    const next = scenes.get(name);
    if (!next) {
      throw new Error(`Scène inconnue : « ${name} »`);
    }

    if (activeScene && typeof activeScene.unmount === 'function') {
      activeScene.unmount();
    }

    activeScene = next;
    activeName = name;
    next.mount(context);
  }

  /** @returns {string|null} Nom de la scène active. */
  function current() {
    return activeName;
  }

  return { register, go, current };
}
