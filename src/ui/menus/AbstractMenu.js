// src/ui/menus/AbstractMenu.js — Base abstraite des menus interactifs.
//
// Responsabilités (communes à tous les menus, quelle que soit la navigation) :
//   - Construire le DOM accessible du menu (titre optionnel + liste d'items).
//   - Gérer le cycle de vie : mount() / unmount() (rendu + écouteurs clavier).
//   - Maintenir l'item actif, refléter cet état dans le DOM (classe + aria-current)
//     et l'ANNONCER via la région ARIA live à chaque déplacement.
//   - Router les intentions clavier (de ui/input.js) : confirmer, annuler, ou
//     déléguer le déplacement à la sous-classe.
//
// Cette classe ne décide PAS comment on se déplace entre les items : c'est le
// rôle de move(intent), implémentée par les sous-classes (LinearMenu, GridMenu).
//
// Modèle d'item : { id: string, label: string }.
// Convention d'accessibilité du projet : le focus reste sur le conteneur du menu
// et l'item actif est annoncé via la live region (pas de focus DOM par item),
// cohérent avec l'approche « inputs clavier custom + ARIA live ».

import { attachInput, Intent } from '../input.js';

export class AbstractMenu {
  /**
   * @param {object} options
   * @param {HTMLElement} options.container   Élément parent où monter le menu.
   * @param {Array<{id:string,label:string}>} [options.items]
   * @param {{polite:Function, assertive:Function}} [options.announce]  Annonceur ARIA.
   * @param {string} [options.title]          Titre affiché (h1) au-dessus de la liste.
   * @param {string} [options.ariaLabel]      Libellé accessible du conteneur.
   * @param {Function} [options.onConfirm]    Callback (item, index) sur confirmation.
   * @param {Function} [options.onCancel]     Callback () sur annulation (Échap).
   */
  constructor(options = {}) {
    if (new.target === AbstractMenu) {
      throw new Error('AbstractMenu est abstraite : sous-classez-la (LinearMenu, GridMenu).');
    }
    this.container = options.container ?? null;
    this.items = options.items ?? [];
    this.announce = options.announce ?? null;
    this.title = options.title ?? '';
    this.ariaLabel = options.ariaLabel ?? this.title;
    this.ariaOrientation = null; // surchargé par les sous-classes si pertinent

    this._onConfirm = options.onConfirm ?? null;
    this._onCancel = options.onCancel ?? null;

    this.activeIndex = 0;
    this._root = null;       // élément racine du menu
    this._itemEls = [];      // éléments DOM des items, indexés comme this.items
    this._detachInput = null;
  }

  // --- À implémenter / surcharger par les sous-classes -----------------------

  /**
   * Calcule le nouvel index actif selon une intention de déplacement.
   * @param {string} _intent  Une valeur de Intent (MOVE_*).
   * @returns {number|null}    Nouvel index, ou null si l'intention n'est pas gérée.
   * @abstract
   */
  move(_intent) {
    throw new Error('move(intent) doit être implémentée par la sous-classe.');
  }

  /**
   * Texte annoncé pour l'item actif. Surchargeable (ex. ajouter la position).
   * @param {{id:string,label:string}} item
   * @param {number} _index
   * @returns {string}
   */
  describe(item, _index) {
    return item.label;
  }

  // --- Cycle de vie ----------------------------------------------------------

  /** Construit le DOM, branche le clavier, place le focus, annonce l'item actif. */
  mount() {
    this._render();
    this.container.append(this._root);
    this._detachInput = attachInput(this._root, (intent) => this._handleIntent(intent));
    this._root.focus();
    this.setActive(this.activeIndex);
  }

  /** Débranche le clavier et retire le DOM du menu. */
  unmount() {
    if (this._detachInput) {
      this._detachInput();
      this._detachInput = null;
    }
    if (this._root && this._root.parentNode) {
      this._root.remove();
    }
    this._root = null;
    this._itemEls = [];
  }

  // --- État ------------------------------------------------------------------

  /**
   * Définit l'item actif, met à jour le DOM et (sauf silencieux) l'annonce.
   * @param {number} index
   * @param {{silent?: boolean}} [opts]
   */
  setActive(index, { silent = false } = {}) {
    if (index < 0 || index >= this.items.length) return;
    this.activeIndex = index;

    this._itemEls.forEach((el, i) => {
      const isActive = i === index;
      el.classList.toggle('is-active', isActive);
      if (isActive) {
        el.setAttribute('aria-current', 'true');
      } else {
        el.removeAttribute('aria-current');
      }
    });

    if (!silent && this.announce) {
      this.announce.polite(this.describe(this.items[index], index));
    }
  }

  /** Déclenche la confirmation sur l'item actif. */
  confirm() {
    const item = this.items[this.activeIndex];
    if (item) this.onConfirm(item, this.activeIndex);
  }

  /**
   * Réaction par défaut à la confirmation : invoque le callback fourni.
   * Surchargeable par une sous-classe (ex. MainMenu) pour brancher la logique.
   * @param {{id:string,label:string}} item
   * @param {number} index
   */
  onConfirm(item, index) {
    if (this._onConfirm) this._onConfirm(item, index);
  }

  /** Réaction par défaut à l'annulation : invoque le callback fourni. */
  onCancel() {
    if (this._onCancel) this._onCancel();
  }

  // --- Interne ---------------------------------------------------------------

  /** @param {string} intent */
  _handleIntent(intent) {
    if (intent === Intent.CONFIRM) {
      this.confirm();
      return;
    }
    if (intent === Intent.CANCEL) {
      this.onCancel();
      return;
    }
    const next = this.move(intent);
    if (next !== null && next !== undefined) {
      this.setActive(next);
    }
  }

  /** Construit l'arbre DOM du menu dans this._root. */
  _render() {
    const root = document.createElement('div');
    root.className = 'menu';
    root.tabIndex = -1;
    root.setAttribute('role', 'menu');
    if (this.ariaLabel) root.setAttribute('aria-label', this.ariaLabel);
    if (this.ariaOrientation) root.setAttribute('aria-orientation', this.ariaOrientation);

    if (this.title) {
      const heading = document.createElement('h1');
      heading.className = 'menu__title';
      heading.textContent = this.title;
      root.append(heading);
    }

    const list = document.createElement('ul');
    list.className = 'menu__list';

    this._itemEls = this.items.map((item, i) => {
      const li = document.createElement('li');
      li.className = 'menu__item';
      li.setAttribute('role', 'menuitem');
      li.dataset.id = item.id;
      li.textContent = item.label;
      // Bonus souris : cliquer sélectionne puis confirme l'item.
      li.addEventListener('click', () => {
        this.setActive(i, { silent: true });
        this.confirm();
      });
      list.append(li);
      return li;
    });

    root.append(list);
    this._root = root;
  }
}
