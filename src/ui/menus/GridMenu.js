// src/ui/menus/GridMenu.js — Menu à navigation en grille (2 axes, x/y).
//
// Les items sont disposés en lignes de `columns` colonnes, en ordre ligne par
// ligne (row-major) : index = y * columns + x.
//   - ← / →  : déplacent sur l'axe x (colonnes)
//   - ↑ / ↓  : déplacent sur l'axe y (lignes)
//
// Par défaut la navigation « bute » aux bords (clamp). wrap=true fait boucler
// chaque axe indépendamment. Une dernière ligne incomplète est gérée : si la
// cible tombe au-delà du dernier item, on se rabat sur le dernier item.

import { AbstractMenu } from './AbstractMenu.js';
import { Intent } from '../input.js';

export class GridMenu extends AbstractMenu {
  /**
   * @param {object} options  Options d'AbstractMenu, plus :
   * @param {number} options.columns   Nombre de colonnes (>= 1).
   * @param {boolean} [options.wrap=false]
   */
  constructor(options = {}) {
    super(options);
    this.columns = Math.max(1, options.columns ?? 1);
    this.wrap = options.wrap ?? false;
  }

  /** Nombre de lignes nécessaires pour contenir tous les items. */
  get rows() {
    return Math.ceil(this.items.length / this.columns);
  }

  /** @param {string} intent @returns {number|null} */
  move(intent) {
    const cols = this.columns;
    let x = this.activeIndex % cols;
    let y = Math.floor(this.activeIndex / cols);

    switch (intent) {
      case Intent.MOVE_LEFT:  x = this._step(x, -1, cols); break;
      case Intent.MOVE_RIGHT: x = this._step(x, +1, cols); break;
      case Intent.MOVE_UP:    y = this._step(y, -1, this.rows); break;
      case Intent.MOVE_DOWN:  y = this._step(y, +1, this.rows); break;
      default: return null;
    }

    let index = y * cols + x;
    // Dernière ligne incomplète : se rabattre sur le dernier item existant.
    if (index >= this.items.length) {
      index = this.items.length - 1;
    }
    return index;
  }

  /**
   * Avance une coordonnée d'un cran dans [0, size), avec clamp ou wrap.
   * @param {number} value @param {number} delta @param {number} size
   * @returns {number}
   */
  _step(value, delta, size) {
    const next = value + delta;
    if (this.wrap) return (next + size) % size;
    return Math.max(0, Math.min(size - 1, next));
  }
}
