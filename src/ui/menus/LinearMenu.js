// src/ui/menus/LinearMenu.js — Menu à navigation linéaire (1 axe).
//
// Une seule classe couvre les deux orientations (choix le plus DRY) :
//   - 'vertical'   (défaut) : ↑ précédent / ↓ suivant
//   - 'horizontal'          : ← précédent / → suivant
// Les intentions de l'axe inutilisé sont ignorées (move renvoie null).
//
// Par défaut la sélection « boucle » (wrap) : après le dernier item on revient
// au premier, et inversement. Désactivable via l'option wrap=false.

import { AbstractMenu } from './AbstractMenu.js';
import { Intent } from '../input.js';

export class LinearMenu extends AbstractMenu {
  /**
   * @param {object} options  Options d'AbstractMenu, plus :
   * @param {'vertical'|'horizontal'} [options.orientation='vertical']
   * @param {boolean} [options.wrap=true]
   */
  constructor(options = {}) {
    super(options);
    this.orientation = options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    this.wrap = options.wrap ?? true;
    this.ariaOrientation = this.orientation;
  }

  /** @param {string} intent @returns {number|null} */
  move(intent) {
    const forward = this.orientation === 'horizontal' ? Intent.MOVE_RIGHT : Intent.MOVE_DOWN;
    const backward = this.orientation === 'horizontal' ? Intent.MOVE_LEFT : Intent.MOVE_UP;

    if (intent === forward) return this._step(+1);
    if (intent === backward) return this._step(-1);
    return null; // intention hors de l'axe géré
  }

  /** @param {number} delta @returns {number} */
  _step(delta) {
    const count = this.items.length;
    if (count === 0) return this.activeIndex;
    const next = this.activeIndex + delta;
    if (this.wrap) return (next + count) % count;
    return Math.max(0, Math.min(count - 1, next));
  }
}
