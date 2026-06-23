// src/ui/boardText.js — Utilitaires de description des cases du plateau.
//
// Factorisé depuis combat.js pour être réutilisable par le sélecteur de zone
// et tout autre composant ayant besoin de décrire une case.
//
// Aucun DOM ; ne dépend que des données et du pack de langue passé en argument.

import { longDescription } from './powerText.js';
import { statusListShort } from './statusText.js';
import { getEntityStatuses } from '../engine/statuses.js';

/**
 * Disposition visuelle du plateau : lignes ciel / surface / terre.
 * Ligne 0 = ciel (indices hauts), ligne 2 = terre (indices bas).
 */
export const BOARD_ROWS = [
  { labelKey: 'sky',     indices: [6, 7, 8] },
  { labelKey: 'surface', indices: [3, 4, 5] },
  { labelKey: 'ground',  indices: [0, 1, 2] },
];

/**
 * Convertit un index de plateau (0–8) en coordonnées 2D (x, y).
 * x ∈ {0=gauche, 1=centre, 2=droite}, y ∈ {0=ciel, 1=surface, 2=terre}.
 * @param {number} index
 * @returns {{ x: number, y: number }}
 */
export function indexToXY(index) {
  for (let y = 0; y < BOARD_ROWS.length; y++) {
    const x = BOARD_ROWS[y].indices.indexOf(index);
    if (x >= 0) return { x, y };
  }
  return { x: 0, y: 0 };
}

/**
 * Convertit des coordonnées 2D en index de plateau (0–8).
 * @param {number} x  colonne (0=gauche, 1=centre, 2=droite)
 * @param {number} y  ligne   (0=ciel, 1=surface, 2=terre)
 * @returns {number}
 */
export function xyToIndex(x, y) {
  return BOARD_ROWS[y].indices[x];
}

/**
 * Description NVDA complète d'une case du plateau :
 * statuts de zone, description longue du pouvoir (avec ses propres statuts),
 * puis la position (ligne + colonne).
 *
 * Exemple : « Gel 1, Plaquage lourd, épuisement 1 : +4 attaque…, Ciel Droite »
 *
 * @param {number} index          position 0–8
 * @param {Array}  board          tableau des zones du plateau
 * @param {object} strings        pack de langue
 * @param {object} [combatState]  état de combat (pour les statuts d'entité)
 * @returns {string}
 */
export function describeBoardCell(index, board, strings, combatState) {
  const area = board?.[index];
  const { x, y } = indexToXY(index);
  const c = strings?.combat ?? {};
  const rowLabels = [c.sky ?? 'Sky', c.surface ?? 'Surface', c.ground ?? 'Ground'];
  const colLabels = [c.left ?? 'Left', c.center ?? 'Center', c.right ?? 'Right'];
  const position = `${rowLabels[y]} ${colLabels[x]}`;

  const power = area?.power ?? null;
  const areaPart = statusListShort(area?.statuses ?? [], strings);
  const entityStatuses = power && combatState ? getEntityStatuses(combatState, power) : [];
  const core = power
    ? longDescription(power, strings, entityStatuses)
    : (strings?.combat?.empty ?? 'empty');
  const content = areaPart ? `${areaPart}, ${core}` : core;
  const capitalized = content.charAt(0).toUpperCase() + content.slice(1);
  return `${capitalized}, ${position}`;
}
