// src/ui/DraftEditor.js — Éditeur générique brouillon/validation.
//
// Principe central : à la construction, une copie superficielle des données
// originales est créée (le brouillon). Toutes les modifications du joueur ne
// touchent que le brouillon. À la validation, l'appelant reçoit le brouillon
// via onCommit et décide quoi en faire ; à l'annulation, le brouillon est jeté.
//
// Structure du menu :
//   titre fixe · barre d'onglets (une page par catégorie non vide) ·
//   liste d'items (champs de la catégorie + Valider + Annuler)
//
// Navigation :
//   Flèches haut/bas  → items précédent/suivant (sans cyclage)
//   Tab / Shift-Tab   → page suivante / précédente (cyclant)
//   Flèches gauche/droite → ajustement du potentiomètre actif
//   Ctrl + flèches    → grand pas sur le potentiomètre
//   Retour-arrière    → annonce le nom + la page courante
//   Échap             → onCancel
//
// Types de contrôle :
//   toggle — Entrée bascule on/off ; annonce l'état seul.
//   list   — Entrée ouvre un SubMenu single_choice ; remontage après fermeture.
//   knob   — À l'arrivée : label + valeur. Pendant l'ajustement : valeur seule.
//
// Contraintes :
//   - Aucune référence en dur aux « options » ou « préférences ».
//   - Aucun innerHTML ; textContent et API DOM uniquement.
//   - Réutilise attachInput (input.js) et SubMenu existants.

import { attachInput, Intent } from './input.js';
import { SubMenu } from './menus/SubMenu.js';

export class DraftEditor {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {{ polite: Function, assertive: Function }} opts.announce
   * @param {object} opts.strings              Pack de langue complet.
   * @param {string} opts.title                Titre fixe du menu.
   * @param {string} [opts.ariaLabel]
   * @param {string} [opts.interfaceName]      Annoncé par Retour-arrière.
   * @param {PageDef[]} opts.pages
   *   PageDef  : { id: string, label: string, fields: FieldDef[] }
   *   FieldDef : { id: string, type: 'toggle'|'list'|'knob', label: string, ...typeOpts }
   *   toggle → (aucune option supplémentaire)
   *   list   → { options: Array<{ id: string, label: string }> }
   *   knob   → { min: number, max: number, step: number, bigStep: number,
   *              isFloat?: boolean, format?: (value: number) => string }
   * @param {object} opts.data                 Données originales (jamais modifiées).
   * @param {(draft: object) => void} opts.onCommit
   * @param {() => void} opts.onCancel
   */
  constructor(opts) {
    this.container      = opts.container;
    this.announce       = opts.announce;
    this.strings        = opts.strings;
    this.title          = opts.title;
    this.ariaLabel      = opts.ariaLabel     ?? opts.title;
    this._interfaceName = opts.interfaceName ?? opts.title;
    this._onCommit      = opts.onCommit;
    this._onCancel      = opts.onCancel;

    // Pages filtrées : on n'affiche pas les catégories sans champ modifiable.
    this._pages = (opts.pages ?? []).filter((p) => p.fields.length > 0);

    // Brouillon : copie superficielle ; l'original n'est jamais touché.
    this._draft = { ...opts.data };

    // État de navigation — persisté à travers unmount/mount (retour depuis SubMenu).
    this._pageIdx = 0;
    this._itemIdx = 0;

    // DOM
    this._root      = null;
    this._listEl    = null;
    this._tabEls    = [];
    this._itemEls   = [];
    this._pageItems = []; // items de la page courante (champs + Valider + Annuler)

    // Handlers à débrancher
    this._detachInput = null;
    this._tabHandler  = null;
  }

  // ---------------------------------------------------------------------------
  // Cycle de vie
  // ---------------------------------------------------------------------------

  mount() {
    this._buildRoot();
    this.container.append(this._root);
    this._renderPage();
    this._attachHandlers();
    this._root.focus();
    this._announcePageEntry(true);
  }

  unmount() {
    this._detachHandlers();
    this._root?.remove();
    this._root      = null;
    this._listEl    = null;
    this._tabEls    = [];
    this._itemEls   = [];
    this._pageItems = [];
  }

  // ---------------------------------------------------------------------------
  // Construction du DOM racine
  // ---------------------------------------------------------------------------

  _buildRoot() {
    const root = document.createElement('div');
    root.className = 'menu draft-editor';
    root.setAttribute('role', 'menu');
    root.setAttribute('aria-label', this.ariaLabel);
    root.tabIndex = -1;

    const h1 = document.createElement('h1');
    h1.className = 'menu__title';
    h1.textContent = this.title;
    root.append(h1);

    // Barre d'onglets (affichée seulement si plusieurs pages)
    if (this._pages.length > 1) {
      const de  = this._de();
      const bar = document.createElement('div');
      bar.className = 'draft-editor__tabs';
      bar.setAttribute('role', 'tablist');
      bar.setAttribute('aria-label', de.pagesLabel ?? 'Pages');

      this._tabEls = this._pages.map((page, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'draft-editor__tab';
        btn.setAttribute('role', 'tab');
        btn.tabIndex = -1; // exclus de l'ordre Tab du navigateur
        btn.textContent = page.label;
        btn.addEventListener('click', () => this._goToPage(i));
        bar.append(btn);
        return btn;
      });

      root.append(bar);
    }

    // Conteneur de liste (rempli par _renderPage)
    const list = document.createElement('ul');
    list.className = 'menu__list';
    root.append(list);

    this._root   = root;
    this._listEl = list;
  }

  // ---------------------------------------------------------------------------
  // Rendu de la page courante
  // ---------------------------------------------------------------------------

  _renderPage() {
    const page = this._pages[this._pageIdx];
    const de   = this._de();

    // Onglets : refléter la page active
    this._tabEls.forEach((tab, i) => {
      const active = i === this._pageIdx;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.classList.toggle('is-active', active);
    });

    // Construire la liste d'items : champs de la page + Valider + Annuler
    const items = [
      ...page.fields.map((field) => ({
        _field: field,
        id:     field.id,
        label:  this._fieldLabel(field),
      })),
      { id: '__validate__', label: de.validate ?? 'Valider : enregistre les modifications apportées.' },
      { id: '__cancel__',   label: de.cancel   ?? 'Annuler : ferme le menu en ignorant les modifications.' },
    ];

    // Borner l'index courant
    this._itemIdx = Math.max(0, Math.min(this._itemIdx, items.length - 1));

    // Rendu DOM
    this._listEl.replaceChildren();
    this._itemEls = items.map((item, i) => {
      const li = document.createElement('li');
      li.className = 'menu__item';
      li.setAttribute('role', 'menuitem');
      li.dataset.id = item.id;
      li.textContent = item.label;
      li.addEventListener('click', () => {
        this._itemIdx = i;
        this._setActive(i, { silent: true });
        this._confirm();
      });
      this._listEl.append(li);
      return li;
    });

    this._pageItems = items;
    this._setActive(this._itemIdx, { silent: true }); // visuel uniquement
  }

  // ---------------------------------------------------------------------------
  // Libellés des champs (reflètent la valeur du brouillon)
  // ---------------------------------------------------------------------------

  _fieldLabel(field) {
    const val = this._draft[field.id];
    switch (field.type) {
      case 'toggle': {
        const de = this._de();
        return `${field.label} : ${val ? (de.on ?? 'On') : (de.off ?? 'Off')}`;
      }
      case 'list': {
        const opt = (field.options ?? []).find((o) => o.id === val);
        return `${field.label} : ${opt?.label ?? val}`;
      }
      case 'knob': {
        const fmt = field.format ? field.format(val) : String(val);
        return `${field.label} : ${fmt}`;
      }
      default:
        return field.label;
    }
  }

  _formattedValue(field) {
    const val = this._draft[field.id];
    switch (field.type) {
      case 'knob':
        return field.format ? field.format(val) : String(val);
      case 'toggle': {
        const de = this._de();
        return val ? (de.on ?? 'On') : (de.off ?? 'Off');
      }
      default:
        return String(val);
    }
  }

  // ---------------------------------------------------------------------------
  // Branchement / débranchement des entrées
  // ---------------------------------------------------------------------------

  _attachHandlers() {
    // Intentions standard (+ accès à l'événement brut pour ctrlKey sur knob)
    this._detachInput = attachInput(
      this._root,
      (intent, event) => this._handleIntent(intent, event),
    );

    // Tab / Shift-Tab : navigation entre pages (intercepté avant le navigateur)
    this._tabHandler = (e) => {
      if (e.key !== 'Tab') return;
      if (this._pages.length <= 1) return;
      e.preventDefault();
      this._goToPage(this._pageIdx + (e.shiftKey ? -1 : 1));
    };
    this._root.addEventListener('keydown', this._tabHandler);
  }

  _detachHandlers() {
    if (this._detachInput) {
      this._detachInput();
      this._detachInput = null;
    }
    if (this._tabHandler) {
      this._root?.removeEventListener('keydown', this._tabHandler);
      this._tabHandler = null;
    }
  }

  _handleIntent(intent, event) {
    const item  = this._pageItems[this._itemIdx];
    const field = item?._field;

    // Flèches gauche/droite → potentiomètre (Ctrl = grand pas)
    if (intent === Intent.MOVE_LEFT || intent === Intent.MOVE_RIGHT) {
      if (field?.type === 'knob') {
        const dir = intent === Intent.MOVE_LEFT ? -1 : 1;
        this._adjustKnob(field, dir, event?.ctrlKey ?? false);
      }
      return; // consommé même hors potentiomètre
    }

    switch (intent) {
      case Intent.MOVE_UP:    this._setActive(this._itemIdx - 1); break;
      case Intent.MOVE_DOWN:  this._setActive(this._itemIdx + 1); break;
      case Intent.MOVE_FIRST: this._setActive(0); break;
      case Intent.MOVE_LAST:  this._setActive(this._pageItems.length - 1); break;
      case Intent.CONFIRM:    this._confirm(); break;
      case Intent.CANCEL:     this._onCancel?.(); break;
      case Intent.DESCRIBE:   this._describeInterface(); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation dans la liste d'items
  // ---------------------------------------------------------------------------

  _setActive(idx, { silent = false } = {}) {
    const len = this._pageItems.length;
    if (len === 0) return;
    idx = Math.max(0, Math.min(idx, len - 1)); // bornage sans cyclage
    this._itemIdx = idx;

    this._itemEls.forEach((el, i) => {
      const active = i === idx;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'true');
      else        el.removeAttribute('aria-current');
    });

    if (!silent && this.announce) {
      this.announce.polite(this._pageItems[idx].label);
    }
  }

  // ---------------------------------------------------------------------------
  // Confirmation d'item
  // ---------------------------------------------------------------------------

  _confirm() {
    const item = this._pageItems[this._itemIdx];
    if (!item) return;

    if (item.id === '__validate__') { this._onCommit?.({ ...this._draft }); return; }
    if (item.id === '__cancel__')   { this._onCancel?.(); return; }

    const field = item._field;
    switch (field?.type) {
      case 'toggle': this._toggleField(field, this._itemIdx); break;
      case 'list':   this._openListChoice(field, this._itemIdx); break;
      case 'knob':   break; // Entrée sur un potentiomètre : aucune action (utiliser les flèches)
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  // Actions sur les contrôles
  // ---------------------------------------------------------------------------

  _toggleField(field, idx) {
    this._draft[field.id] = !this._draft[field.id];
    const newLabel = this._fieldLabel(field);
    this._pageItems[idx].label     = newLabel;
    this._itemEls[idx].textContent = newLabel;
    // Annoncer l'état seul (pas le label complet)
    this.announce?.polite(this._formattedValue(field));
  }

  _adjustKnob(field, dir, big) {
    const step    = big ? (field.bigStep ?? field.step) : field.step;
    const raw     = (this._draft[field.id] ?? field.min) + dir * step;
    const clamped = Math.max(field.min, Math.min(field.max, raw));
    const val     = field.isFloat ? clamped : Math.round(clamped);
    this._draft[field.id] = val;

    const idx = this._itemIdx;
    const newLabel = this._fieldLabel(field);
    this._pageItems[idx].label     = newLabel;
    this._itemEls[idx].textContent = newLabel;
    // Annoncer la valeur seule — ne pas répéter le label à chaque cran
    this.announce?.polite(this._formattedValue(field));
  }

  _openListChoice(field, idx) {
    // Mémoriser la position avant de se démonter (SubMenu prend la place)
    this._itemIdx = idx;
    this.unmount();

    const subMenu = new SubMenu({
      container:     this.container,
      announce:      this.announce,
      strings:       this.strings,
      mode:          'single_choice',
      title:         field.label,
      ariaLabel:     field.label,
      interfaceName: field.label,
      items:         (field.options ?? []).map((o) => ({ id: o.id, label: o.label })),
      closeLabel:    this.strings?.submenu?.close ?? 'Fermer',
      onConfirm: (item) => {
        this._draft[field.id] = item.id;
      },
      onClose: () => {
        // SubMenu ne se démonte pas lui-même : c'est à nous de le faire.
        subMenu.unmount();
        // Remontage avec _pageIdx et _itemIdx préservés dans la fermeture.
        this.mount();
      },
    });
    subMenu.mount();
  }

  // ---------------------------------------------------------------------------
  // Navigation entre pages
  // ---------------------------------------------------------------------------

  _goToPage(idx) {
    const len = this._pages.length;
    if (len === 0) return;
    this._pageIdx = ((idx % len) + len) % len; // cyclage
    this._itemIdx = 0;
    this._renderPage();
    this._root.focus();
    this._announcePageEntry(false);
  }

  // ---------------------------------------------------------------------------
  // Annonces
  // ---------------------------------------------------------------------------

  _announcePageEntry(firstMount) {
    const item = this._pageItems[this._itemIdx];
    if (!item) return;
    if (firstMount) {
      // Cohérent avec AbstractMenu.mount() : titre + item actif
      this.announce?.polite(`${this.title} : ${item.label}`);
    } else {
      // Changement de page : nom de la page + item actif
      const page = this._pages[this._pageIdx];
      this.announce?.polite(`${page.label} : ${item.label}`);
    }
  }

  _describeInterface() {
    const page = this._pages[this._pageIdx];
    const text = this._interfaceName
      ? `${this._interfaceName} : ${page.label}`
      : page.label;
    this.announce?.polite(text);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _de() { return this.strings?.draftEditor ?? {}; }
}
