// src/ui/format.js — Interpolation de chaînes localisées (textes dynamiques).
//
// Prépare le terrain pour des textes qui changent selon le contexte : un gabarit
// localisé contient des marqueurs `{clef}` remplacés par des valeurs fournies à
// l'exécution. Exemple :
//   format('{value} sur {max} points de vie.', { value: 12, max: 30 })
//     → '12 sur 30 points de vie.'
//
// Les marqueurs sans valeur correspondante sont laissés tels quels (utile en
// développement pour repérer une variable manquante). Aucun DOM.

/**
 * Remplace les marqueurs `{clef}` d'un gabarit par les valeurs de `params`.
 * @param {string} template
 * @param {Object<string, any>} [params]
 * @returns {string}
 */
export function format(template, params = {}) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}
