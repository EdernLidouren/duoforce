// src/scenes/confirm.js — Scène de confirmation générique.
//
// Posée par-dessus la scène courante via router.go('confirm').
// Elle ne connaît pas le sens de ce qu'elle confirme : titre, question et
// callbacks lui sont fournis par l'appelant via context.pendingConfirm.
//
// API d'appel :
//   import { openConfirm } from '../scenes/confirm.js';
//   openConfirm(ctx, { title, question, onConfirm, onCancel, defaultChoice });
//
// La scène exécute le callback choisi et c'est le callback qui décide de la
// suite (navigation, etc.). La scène ne navigue jamais d'elle-même.
//
// Comportement Échap : équivaut à « Non » (Intent.CANCEL → onCancel).

import { LinearMenu } from '../ui/menus/LinearMenu.js';

// --- Scène -------------------------------------------------------------------

export function createConfirmScene() {
  let activeMenu = null;

  return {
    mount(ctx) {
      const {
        title,
        question,
        onConfirm,
        onCancel,
        defaultChoice = 'no',
      } = ctx.pendingConfirm ?? {};

      const c = ctx.strings?.confirm ?? {};
      const resolvedTitle = title ?? (c.title ?? 'Confirmation');
      const yesLabel = c.yes ?? 'Oui';
      const noLabel  = c.no  ?? 'Non';

      // Défaut : 'no' → index 1, 'yes' → index 0
      // L'ordre des items est toujours [oui, non] per spec.
      const initialIndex = defaultChoice === 'yes' ? 0 : 1;

      function handleChoice(isYes) {
        ctx.pendingConfirm = null;
        if (isYes) {
          onConfirm?.();
        } else {
          onCancel?.();
        }
      }

      activeMenu = new LinearMenu({
        container:            ctx.root,
        announce:             ctx.announce,
        orientation:          'vertical',
        initialIndex,
        title:                resolvedTitle,
        ariaLabel:            resolvedTitle,
        interfaceName:        resolvedTitle,
        // La question est accessible via Retour-arrière (describeInterface).
        interfaceDescription: question ?? '',
        items: [
          { id: 'yes', label: yesLabel },
          { id: 'no',  label: noLabel  },
        ],
        onConfirm: (item) => handleChoice(item.id === 'yes'),
        // Échap → onCancel → handleChoice(false)
        onCancel:  ()     => handleChoice(false),
      });

      activeMenu.mount();

      // Annoncer le titre + la question à l'ouverture (remplace l'annonce du
      // premier item faite par AbstractMenu.mount).
      if (question) ctx.announce.polite(`${resolvedTitle} : ${question}`);
    },

    unmount() {
      if (activeMenu) { activeMenu.unmount(); activeMenu = null; }
    },
  };
}

// --- Utilitaire d'appel ------------------------------------------------------

/**
 * Ouvre la scène de confirmation par-dessus la scène courante.
 *
 * @param {object} ctx  Contexte de scène (root, announce, strings, router, …)
 * @param {object} options
 * @param {string}   [options.title]          Titre (défaut : clé `confirm.title`).
 * @param {string}   [options.question]       Question posée + détails éventuels.
 * @param {Function} [options.onConfirm]      Appelé si l'utilisateur choisit « Oui ».
 * @param {Function} [options.onCancel]       Appelé si « Non » / Échap.
 *   Défaut : retour automatique à la scène précédente via router.
 * @param {'yes'|'no'} [options.defaultChoice='no']  Focus initial.
 */
export function openConfirm(ctx, {
  title,
  question,
  onConfirm,
  onCancel,
  defaultChoice = 'no',
} = {}) {
  const previousScene = ctx.router.current();
  ctx.pendingConfirm = {
    title,
    question,
    onConfirm,
    onCancel: onCancel ?? (() => ctx.router.go(previousScene)),
    defaultChoice,
  };
  ctx.router.go('confirm');
}
