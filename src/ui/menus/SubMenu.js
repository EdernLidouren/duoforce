// src/ui/menus/SubMenu.js — Sous-menu à trois modes d'interaction.
//
// Étend LinearMenu (navigation verticale héritée) avec :
//   - 'informative'      : affiche des entrées sans interaction (navigation seule).
//   - 'single_choice'    : Entrée/clic sur une entrée la sélectionne et ferme.
//   - 'multiple_choice'  : Entrée/clic coche/décoche ; une entrée « Valider »
//                          confirme la sélection (en respectant min/max).
//
// Entrée de fermeture optionnelle (closeLabel). Présente dans tous les modes si
// fournie ; Échap réplique son comportement.
//
// Backspace → décrit le mode et l'état courant via la live region ARIA.
// L'interfaceDescription est une fonction () => string calculée dynamiquement
// pour refléter le compte de sélections en mode multiple_choice.

import { LinearMenu } from './LinearMenu.js';
import { format } from '../format.js';

// IDs réservés pour les entrées spéciales.
// Préfixe __submenu__ pour éviter les collisions avec les IDs de données utilisateur.
const CLOSE_ID    = '__submenu_close__';
const VALIDATE_ID = '__submenu_validate__';

/**
 * @param {object} options
 * @param {'informative'|'single_choice'|'multiple_choice'} [options.mode='informative']
 * @param {Array<{id, label, onSecondary?}>} [options.items=[]]
 *   Entrées de données. En mode multiple_choice, `onSecondary` est ignoré
 *   (Espace déclenche le toggle, comme Entrée).
 * @param {number}   [options.min=0]          multiple_choice : sélections minimales.
 * @param {number}   [options.max=Infinity]   multiple_choice : sélections maximales.
 * @param {string}   [options.closeLabel]     Libellé de l'entrée de fermeture.
 *   Omis → pas d'entrée de fermeture (Échap fonctionne quand même si onClose est fourni).
 * @param {Function} [options.onClose]        Appelé quand l'utilisateur ferme le sous-menu.
 * @param {string}   [options.validateLabel]  Libellé de l'entrée Valider (multiple_choice).
 * @param {object}   [options.strings]        Pack de langue (pour les libellés par défaut).
 * @param {string}   [options.interfaceName]  Nom court annoncé par Retour-arrière.
 * @param {Function} [options.onConfirm]
 *   single_choice  : appelé avec (item, index).
 *   multiple_choice : appelé avec (selectedItems: Array<{item, index}>).
 *
 * Toutes les autres options d'AbstractMenu / LinearMenu sont transmises.
 */
export class SubMenu extends LinearMenu {
  constructor(options = {}) {
    const {
      mode = 'informative',
      min = 0,
      max = Infinity,
      closeLabel,
      onClose,
      validateLabel,
      strings,
      interfaceName,
      items: rawItems = [],
      onConfirm,
      ...rest
    } = options;

    const s = strings?.submenu ?? {};

    // --- Construire la liste d'items augmentée ------------------------------------
    const dataItems = rawItems.map((item) => ({
      ...item,
      _originalLabel: item.label,
      _isData: true,
    }));

    let validateIndex = null;
    let closeIndex    = null;
    const allItems = [...dataItems];

    if (mode === 'multiple_choice') {
      validateIndex = allItems.length;
      allItems.push({
        id: VALIDATE_ID,
        label: validateLabel ?? s.validate ?? 'Valider',
        _isSpecial: true,
      });
    }

    if (closeLabel !== undefined) {
      closeIndex = allItems.length;
      allItems.push({
        id: CLOSE_ID,
        label: closeLabel,
        _isSpecial: true,
      });
    }

    // La description d'interface est patchée après super() pour accéder à `this`.
    super({
      ...rest,
      items: allItems,
      strings,
      interfaceName,
      interfaceDescription: null,
      onConfirm: null, // géré par cette classe
    });

    this._mode          = mode;
    this._min           = min;
    this._max           = max;
    this._onClose       = onClose ?? null;
    this._onDataConfirm = onConfirm ?? null;
    this._strings       = strings ?? {};
    this._selections    = new Set(); // indices des items de données sélectionnés
    this._validateIndex = validateIndex;
    this._closeIndex    = closeIndex;

    // Description dynamique pour Retour-arrière.
    if (mode === 'multiple_choice') {
      this._interfaceDescription = () => {
        const count = this._selections.size;
        const sm = this._strings?.submenu ?? {};
        if (min === max && max !== Infinity) {
          return format(sm.descriptionCount ?? '{count}/{max}', { count, max });
        }
        const maxStr = max === Infinity ? '∞' : max;
        return format(sm.descriptionCountRange ?? '{count} ({min}–{max})', { count, min, max: maxStr });
      };
    } else {
      this._interfaceDescription = rest.interfaceDescription ?? null;
    }
  }

  // --- Surcharges de navigation ------------------------------------------------

  /**
   * Annonce l'item actif. Pour les items de données sélectionnés en mode
   * multiple_choice, préfixe le libellé avec « Sélectionné - ».
   */
  describe(item, _index) {
    if (this._mode === 'multiple_choice' && item._isData && this._selections.has(_index)) {
      const prefix = this._strings?.submenu?.selected ?? 'Sélectionné';
      return `${prefix} - ${item._originalLabel}`;
    }
    return item.label;
  }

  // --- Confirmation ------------------------------------------------------------

  confirm() {
    const index = this.activeIndex;
    const item  = this.items[index];
    if (!item) return;

    if (item.id === VALIDATE_ID) { this._triggerValidate(); return; }
    if (item.id === CLOSE_ID)    { this._triggerClose();    return; }

    if (this._mode === 'informative') return;

    if (this._mode === 'single_choice') {
      this._triggerSingleChoice(item, index);
      return;
    }

    if (this._mode === 'multiple_choice') {
      this._toggleSelection(index);
      return;
    }
  }

  /**
   * En mode multiple_choice, Espace toggle comme Entrée (pas d'action secondaire
   * distincte sur les items de données ; les items spéciaux n'en ont pas non plus).
   */
  confirmSecondary() {
    if (this._mode === 'multiple_choice') {
      this.confirm();
      return;
    }
    super.confirmSecondary();
  }

  onCancel() {
    this._triggerClose();
  }

  // --- Actions internes --------------------------------------------------------

  _triggerSingleChoice(item, index) {
    if (this._onDataConfirm) this._onDataConfirm(item, index);
    this._triggerClose();
  }

  _triggerValidate() {
    const count = this._selections.size;
    const sm    = this._strings?.submenu ?? {};

    if (count < this._min) {
      const msg = format(sm.refuseMin ?? 'Sélectionnez au moins {min} option(s).', { min: this._min, count });
      this.announce?.polite(msg);
      return;
    }

    const selected = [...this._selections]
      .sort((a, b) => a - b)
      .map((i) => ({ item: this.items[i], index: i }));

    if (this._onDataConfirm) this._onDataConfirm(selected);
    this._triggerClose();
  }

  _triggerClose() {
    if (this._onClose) this._onClose();
    // Démontage laissé à l'appelant.
  }

  _toggleSelection(index) {
    const item = this.items[index];
    if (!item?._isData) return;

    const sm = this._strings?.submenu ?? {};

    if (this._selections.has(index)) {
      // Désélectionner.
      this._selections.delete(index);
      this._updateItemLabel(index, item._originalLabel);
      this.announce?.polite(`${sm.deselected ?? 'Désélectionné'} : ${item._originalLabel}`);
    } else {
      // Vérifier la limite max.
      if (this._selections.size >= this._max) {
        const msg = format(sm.refuseMax ?? 'Maximum atteint ({max}).', { max: this._max });
        this.announce?.polite(msg);
        return;
      }
      this._selections.add(index);
      const prefix       = sm.selected ?? 'Sélectionné';
      const selectedLabel = `${prefix} - ${item._originalLabel}`;
      this._updateItemLabel(index, selectedLabel);
      this.announce?.polite(selectedLabel);
    }
  }

  /** Met à jour le texte DOM de l'item à l'index donné (après montage). */
  _updateItemLabel(index, text) {
    if (this._itemEls[index]) this._itemEls[index].textContent = text;
  }
}
