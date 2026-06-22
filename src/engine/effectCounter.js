// src/engine/effectCounter.js
// Compteur « fill-and-fire » partageable entre les objets à effets (perks,
// statuts, gadgets…). L'état courant est stocké dans combatState.perkCounters,
// qui est un objet partagé par référence dans la copie de travail (cloneForResolve
// fait un spread superficiel), donc les mutations persistent immédiatement sur le
// vrai combatState sans commit supplémentaire.
//
// Comportement :
//   - Si le compteur est déjà au max, incrémenter ne fait rien → retourne false.
//   - Dès qu'il atteint le max, il se réinitialise à 0 → retourne true (effet à déclencher).
//   - Reset naturel entre combats : combatState est recréé à chaque combat.
//
// Aucun DOM.

/**
 * Crée un compteur fill-and-fire identifié par `id`, avec un seuil `max`.
 * @param {string} id   identifiant unique (généralement l'id du perk/statut)
 * @param {number} max  nombre d'incréments avant déclenchement
 */
export function createEffectCounter(id, max) {
  function getStore(combatState) {
    if (!combatState.perkCounters) combatState.perkCounters = {};
    return combatState.perkCounters;
  }

  return {
    max,

    /** Valeur courante du compteur. */
    getValue(combatState) {
      return getStore(combatState)[id] ?? 0;
    },

    /**
     * Tente d'incrémenter. Retourne true si le seuil est atteint (l'effet doit
     * se déclencher et le compteur est remis à 0). Retourne false si le compteur
     * était déjà au max (rien ne se passe) ou si le seuil n'est pas encore atteint.
     */
    increment(combatState) {
      const s = getStore(combatState);
      const current = s[id] ?? 0;
      if (current >= max) return false;
      const next = current + 1;
      if (next >= max) {
        s[id] = 0;
        return true;
      }
      s[id] = next;
      return false;
    },

    /** Remet le compteur à 0. */
    reset(combatState) {
      getStore(combatState)[id] = 0;
    },
  };
}
