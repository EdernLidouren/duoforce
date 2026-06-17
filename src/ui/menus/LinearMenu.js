// src/ui/menus/LinearMenu.js — Menu à navigation linéaire (1 axe).
//
// Une seule classe couvre les deux orientations (choix le plus DRY) :
//   - 'vertical'   (défaut) : ↑ précédent / ↓ suivant
//   - 'horizontal'          : ← précédent / → suivant
// Les intentions de l'axe inutilisé sont ignorées.
//
// La navigation (déplacement, bords, Origine/Fin, annonces avec « * ») est
// mutualisée via la logique de liste partagée (src/ui/listNavigation.js). Le
// CYCLAGE aux bords suit la préférence utilisateur preferences.menuCycling
// (désactivé par défaut), comme les zones de combat.

import { AbstractMenu } from './AbstractMenu.js';
import { Intent } from '../input.js';
import { NavCommand } from '../listNavigation.js';

export class LinearMenu extends AbstractMenu {
  /**
   * @param {object} options  Options d'AbstractMenu, plus :
   * @param {'vertical'|'horizontal'} [options.orientation='vertical']
   */
  constructor(options = {}) {
    super(options);
    this.orientation = options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    this.ariaOrientation = this.orientation;
  }

  /**
   * Navigation linéaire mutualisée : mappe l'intention vers une commande de liste
   * puis délègue à _applyNavCommand. Renvoie true si l'intention est sur l'axe géré
   * (ou Origine/Fin), false sinon (intention hors axe → ignorée par AbstractMenu).
   * @param {string} intent
   * @returns {boolean}
   */
  _navigate(intent) {
    const forward = this.orientation === 'horizontal' ? Intent.MOVE_RIGHT : Intent.MOVE_DOWN;
    const backward = this.orientation === 'horizontal' ? Intent.MOVE_LEFT : Intent.MOVE_UP;

    let command = null;
    if (intent === forward) command = NavCommand.NEXT;
    else if (intent === backward) command = NavCommand.PREVIOUS;
    else if (intent === Intent.MOVE_FIRST) command = NavCommand.FIRST;
    else if (intent === Intent.MOVE_LAST) command = NavCommand.LAST;
    if (command === null) return false;

    this._applyNavCommand(command);
    return true;
  }

  /** Axe inutilisé : aucune intention de déplacement résiduelle à traiter. */
  move() {
    return null;
  }
}
