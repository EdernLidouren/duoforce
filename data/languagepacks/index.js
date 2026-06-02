// data/languagepacks/index.js — Registre et chargeur des packs de langue.
//
// Responsabilités :
//   - Déclarer la langue par défaut.
//   - Charger un pack de langue à la demande (import dynamique) à partir de son
//     code (ex. 'fr', 'en') → objet de chaînes utilisé par l'UI et les annonces.
//
// Chaque pack vit dans son propre répertoire (./fr/, ./en/) et exporte par
// défaut un objet de libellés à la structure commune.

export const DEFAULT_LANG = 'fr';

/** Codes de langue disponibles → importeur du pack correspondant. */
const PACKS = {
  fr: () => import('./fr/index.js'),
  en: () => import('./en/index.js'),
};

/**
 * Charge le pack de langue demandé (repli sur DEFAULT_LANG si inconnu).
 * @param {string} lang
 * @returns {Promise<object>} objet de chaînes
 */
export async function loadLanguagePack(lang = DEFAULT_LANG) {
  const importer = PACKS[lang] ?? PACKS[DEFAULT_LANG];
  const module = await importer();
  return module.default;
}

/** @returns {string[]} codes de langue disponibles. */
export function availableLanguages() {
  return Object.keys(PACKS);
}
