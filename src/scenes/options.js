// src/scenes/options.js — Scène du menu Options.
//
// Premier client du DraftEditor : édition de profile.preferences sur copie.
// À la validation : remplace profile.preferences par le brouillon, sauvegarde,
// applique les préférences aux systèmes concernés, retourne au menu principal.
// À l'annulation : brouillon jeté, retour au menu sans rien changer.
//
// Le schéma des pages/champs est déclaré ici. Le composant DraftEditor ne
// contient aucune référence en dur aux « options » ou aux « préférences ».
//
// Valeurs de test (premier jet) :
//   Page « Accessibilité » : cyclage des menus (toggle) + choix test (liste)
//   Page « Audio »         : volume sonore (potentiomètre 0-100, pas 5/20)
// Ces champs exercent les trois types de contrôle sans effet réel pour l'instant.

import { DraftEditor }        from '../ui/DraftEditor.js';
import { applyPreferences }   from '../ui/applyPreferences.js';
import { saveProfileToLocal } from '../engine/persistence.js';

export function createOptionsScene() {
  let _editor = null;

  return {
    mount(ctx) {
      const o = ctx.strings?.options ?? {};

      // Schéma déclaratif des catégories et de leurs champs.
      // Ajouter un réglage = ajouter une entrée dans le tableau fields de la bonne page.
      const schema = [
        {
          id:    'accessibility',
          label: o.catAccessibility ?? 'Accessibilité',
          fields: [
            {
              id:    'menuCycling',
              type:  'toggle',
              label: o.menuCycling ?? 'Cyclage des menus',
            },
            {
              id:      'testListChoice',
              type:    'list',
              label:   o.testListChoice ?? 'Choix test',
              options: [
                { id: 'optA', label: o.testOptA ?? 'Option Alpha' },
                { id: 'optB', label: o.testOptB ?? 'Option Bêta' },
                { id: 'optC', label: o.testOptC ?? 'Option Gamma' },
              ],
            },
          ],
        },
        {
          id:    'audio',
          label: o.catAudio ?? 'Audio',
          fields: [
            {
              id:      'testVolume',
              type:    'knob',
              label:   o.testVolume ?? 'Volume sonore',
              min:     0,
              max:     100,
              step:    5,
              bigStep: 20,
              isFloat: false,
              format:  (v) => (o.volumeFormat ?? '{v} %').replace('{v}', v),
            },
          ],
        },
      ];

      _editor = new DraftEditor({
        container:     ctx.root,
        announce:      ctx.announce,
        strings:       ctx.strings,
        title:         o.title ?? 'Options',
        ariaLabel:     o.title ?? 'Options',
        interfaceName: o.title ?? 'Options',
        pages:         schema,
        data:          ctx.profile.preferences,
        onCommit: (draft) => {
          ctx.profile.preferences = draft;
          saveProfileToLocal(ctx.profile);
          applyPreferences(draft);
          ctx.router.go('menu');
        },
        onCancel: () => ctx.router.go('menu'),
      });

      _editor.mount();
    },

    unmount() {
      _editor?.unmount();
      _editor = null;
    },
  };
}
