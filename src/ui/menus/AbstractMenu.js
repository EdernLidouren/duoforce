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
// Modèle d'item : { id: string, label: string, onSecondary?: Function }.
//   onSecondary(item, index) — action secondaire (Espace / clic droit).
//   Si absent sur un item, Espace / clic droit ne fait rien sur cet item.
//
// Convention d'accessibilité du projet : le focus reste sur le conteneur du menu
// et l'item actif est annoncé via la live region (pas de focus DOM par item),
// cohérent avec l'approche « inputs clavier custom + ARIA live ».

import { attachInput, Intent } from '../input.js';
import { preferences } from '../preferences.js';
import { resolveListMove, EDGE_MARK } from '../listNavigation.js';

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
   * @param {string}   [options.interfaceName]         Nom court de l'interface (annoncé par Retour-arrière).
   * @param {string|Function} [options.interfaceDescription]
   *   Description de l'interface annoncée par Retour-arrière.
   *   Peut être une fonction () => string pour un contenu dynamique (ex. état d'un sous-menu).
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

    this._interfaceName = options.interfaceName ?? '';
    this._interfaceDescription = options.interfaceDescription ?? null;

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
   * @param {{silent?: boolean, edge?: boolean}} [opts]
   *   edge : préfixe l'annonce de « * » (bord atteint : blocage ou bouclage).
   */
  setActive(index, { silent = false, edge = false } = {}) {
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
      const text = this.describe(this.items[index], index);
      this.announce.polite(edge ? EDGE_MARK + text : text);
    }
  }

  /** Déclenche la confirmation primaire (Entrée / clic gauche) sur l'item actif. */
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

  /**
   * Déclenche l'action secondaire (Espace / clic droit) sur l'item actif.
   * Invoque item.onSecondary si défini ; ne fait rien sinon.
   */
  confirmSecondary() {
    const item = this.items[this.activeIndex];
    if (item?.onSecondary) item.onSecondary(item, this.activeIndex);
  }

  /** Réaction par défaut à l'annulation : invoque le callback fourni. */
  onCancel() {
    if (this._onCancel) this._onCancel();
  }

  /**
   * Annonce le nom et la description de cette interface via la région ARIA live.
   * Déclenché par Retour-arrière (Intent.DESCRIBE).
   * La description peut être statique (string) ou dynamique (Function → string).
   */
  describeInterface() {
    const name = this._interfaceName;
    const raw = this._interfaceDescription;
    const desc = typeof raw === 'function' ? raw() : (raw ?? '');
    const text = name && desc ? `${name} : ${desc}` : (name || desc);
    if (text && this.announce) this.announce.polite(text);
  }

  // --- Interne ---------------------------------------------------------------

  /** @param {string} intent */
  _handleIntent(intent) {
    if (intent === Intent.CONFIRM) {
      this.confirm();
      return;
    }
    if (intent === Intent.CONFIRM_SECONDARY) {
      this.confirmSecondary();
      return;
    }
    if (intent === Intent.CANCEL) {
      this.onCancel();
      return;
    }
    if (intent === Intent.DESCRIBE) {
      this.describeInterface();
      return;
    }
    // Navigation « liste » mutualisée (cyclage, Origine/Fin, bords) si la
    // sous-classe la fournit (menus linéaires) ; sinon, déplacement legacy.
    if (this._navigate(intent)) return;
    const next = this.move(intent);
    if (next !== null && next !== undefined) {
      this.setActive(next);
    }
  }

  /**
   * Tente une navigation via la logique de liste partagée. Renvoie true si
   * l'intention a été gérée. Par défaut non géré (les sous-classes linéaires
   * surchargent _navigate) ; GridMenu retombe sur move().
   * @param {string} _intent
   * @returns {boolean}
   */
  _navigate(_intent) {
    return false;
  }

  /**
   * Applique une commande de navigation (NavCommand) via resolveListMove :
   * déplace l'item actif et l'annonce (avec « * » au bord), en respectant la
   * préférence de cyclage. Utilisé par les sous-classes linéaires.
   * @param {string} command
   */
  _applyNavCommand(command) {
    const { index, edge, announce } = resolveListMove(
      this.activeIndex, this.items.length, command, preferences.menuCycling,
    );
    if (announce) this.setActive(index, { edge });
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
      // Clic gauche : sélectionne puis action primaire.
      li.addEventListener('click', () => {
        this.setActive(i, { silent: true });
        this.confirm();
      });
      // Clic droit : sélectionne puis action secondaire.
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.setActive(i, { silent: true });
        this.confirmSecondary();
      });
      list.append(li);
      return li;
    });

    root.append(list);
    this._root = root;
  }
}
