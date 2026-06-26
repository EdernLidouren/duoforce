// src/scenes/saveManager.js — Scène de gestion de sauvegarde.
//
// Permet d'exporter et d'importer le profil courant via un champ base64.
// L'import passe obligatoirement par la scène de confirmation générique.
//
// Flux d'import (importante subtilité d'architecture) :
//   openConfirm() appelle router.go('confirm'), ce qui DÉMONTE cette scène
//   (ctx = null, textarea = null). Les valeurs nécessaires à l'import doivent
//   donc être capturées AVANT l'appel à openConfirm, dans des variables locales
//   à la closure. _pendingAnnounce permet de transmettre une annonce de succès
//   à travers le cycle démontage / remontage de la scène.

import { openConfirm }                                    from './confirm.js';
import { serializeProfile, deserializeProfile, createProfile } from '../engine/profile.js';
import { saveProfileToLocal }                               from '../engine/persistence.js';
import { SAVE_FORMAT_VERSION }                              from '../config/version.js';

export function createSaveManagerScene() {
  let _ctx        = null;
  let _root       = null;
  let _dateEl     = null;
  let _textarea   = null;
  let _escHandler = null;

  // Annonce à émettre au prochain mount() (import réussi).
  // Utiliser une variable de fermeture plutôt que context pour ne pas polluer
  // l'objet partagé avec un état transitoire de scène.
  let _pendingAnnounce = null;

  // --- Helpers -----------------------------------------------------------------

  function s() { return _ctx.strings?.saveManager ?? {}; }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  }

  function profileToB64(profile) {
    return btoa(JSON.stringify(serializeProfile(profile)));
  }

  // --- Actions -----------------------------------------------------------------

  function doExport() {
    _textarea.value = profileToB64(_ctx.profile);
    _ctx.announce.polite(s().exported ?? 'Sauvegarde exportée dans la zone de contenu.');
  }

  function doImport() {
    const sm = s();
    // Capturer ce qui est nécessaire AVANT que openConfirm ne démonte la scène.
    const savedCtx   = _ctx;
    const savedValue = _textarea.value;

    openConfirm(savedCtx, {
      title:         savedCtx.strings?.confirm?.title ?? 'Confirmation',
      question:      sm.importQuestion ?? "L'import remplacera la sauvegarde actuelle (run en cours, déblocages et statistiques). Confirmez-vous ?",
      defaultChoice: 'no',

      onConfirm: () => {
        let newProfile;
        try {
          newProfile = deserializeProfile(JSON.parse(atob(savedValue.trim())));
        } catch {
          // Contenu invalide (base64 malformé, JSON corrompu, structure inattendue).
          savedCtx.announce.assertive(sm.importError ?? 'Erreur : contenu invalide ou corrompu. Sauvegarde inchangée.');
          savedCtx.router.go('save-manager');
          return;
        }

        // Version incompatible : refus explicite, pas de migration.
        const savedVersion = newProfile.meta?.saveFormatVersion ?? 0;
        if (savedVersion !== SAVE_FORMAT_VERSION) {
          savedCtx.announce.assertive(
            (sm.importVersionMismatch ?? 'Format incompatible (version {v}). Sauvegarde inchangée.')
              .replace('{v}', savedVersion),
          );
          savedCtx.router.go('save-manager');
          return;
        }

        // Succès : remplace le profil courant.
        savedCtx.profile = newProfile;
        saveProfileToLocal(savedCtx.profile);
        _pendingAnnounce = sm.importSuccess ?? 'Sauvegarde importée avec succès.';
        savedCtx.router.go('save-manager');
      },

      onCancel: () => savedCtx.router.go('save-manager'),
    });
  }

  function doReset() {
    const sm = s();
    const savedCtx = _ctx;
    openConfirm(savedCtx, {
      title:         savedCtx.strings?.confirm?.title ?? 'Confirmation',
      question:      sm.resetQuestion ?? 'Toutes les données (run, statistiques, déblocages) seront définitivement effacées. Réinitialiser ?',
      defaultChoice: 'no',
      onConfirm: () => {
        const fresh = createProfile();
        savedCtx.profile = fresh;
        saveProfileToLocal(savedCtx.profile);
        _pendingAnnounce = sm.resetSuccess ?? 'Profil réinitialisé.';
        savedCtx.router.go('save-manager');
      },
      onCancel: () => savedCtx.router.go('save-manager'),
    });
  }

  function doBack() {
    _ctx.router.go('menu');
  }

  // --- Construction du DOM -----------------------------------------------------

  function buildDOM(ctx) {
    const sm = ctx.strings?.saveManager ?? {};

    const root = document.createElement('div');
    root.className = 'menu save-manager';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', sm.title ?? 'Gestion de la sauvegarde');
    root.tabIndex = -1;

    // Titre
    const heading = document.createElement('h1');
    heading.className = 'menu__title';
    heading.textContent = sm.title ?? 'Gestion de la sauvegarde';
    root.append(heading);

    // Date de création (item informatif)
    const dateWrapper = document.createElement('p');
    dateWrapper.className = 'save-manager__date';
    const dateLabel = document.createElement('span');
    dateLabel.textContent = sm.dateLabel ?? 'Date de création de la sauvegarde : ';
    _dateEl = document.createElement('span');
    _dateEl.textContent = formatDate(ctx.profile.meta?.createdAt);
    dateWrapper.append(dateLabel, _dateEl);
    root.append(dateWrapper);

    // Label + textarea (zone d'édition, élément natif voulu par la spec)
    const textareaId = 'save-manager-textarea';
    const label = document.createElement('label');
    label.className = 'save-manager__label';
    label.htmlFor = textareaId;
    label.textContent = sm.textareaLabel ?? 'Contenu de la sauvegarde';
    root.append(label);

    _textarea = document.createElement('textarea');
    _textarea.id = textareaId;
    _textarea.className = 'save-manager__textarea';
    _textarea.rows = 6;
    _textarea.cols = 60;
    _textarea.spellcheck = false;
    _textarea.autocomplete = 'off';
    root.append(_textarea);

    // Boutons d'action (éléments natifs <button> : Tab-navigables, NVDA-natifs)
    const actions = document.createElement('div');
    actions.className = 'save-manager__actions';

    function addButton(labelText, onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'save-manager__btn';
      btn.textContent = labelText;
      btn.addEventListener('click', onClick);
      actions.append(btn);
    }

    addButton(sm.exportBtn  ?? 'Exporter',      () => doExport());
    addButton(sm.importBtn  ?? 'Importer',      () => doImport());
    addButton(sm.resetBtn   ?? 'Réinitialiser', () => doReset());
    addButton(sm.back       ?? 'Retour',        () => doBack());

    root.append(actions);
    return root;
  }

  // --- Scène (interface publique) -----------------------------------------------

  return {
    mount(ctx) {
      _ctx  = ctx;
      _root = buildDOM(ctx);
      ctx.root.append(_root);

      // Peupler la zone dès l'ouverture (copier sa sauvegarde est l'action courante).
      _textarea.value = profileToB64(ctx.profile);

      // Annonce : résultat d'import en attente, ou orientation générale.
      const sm = ctx.strings?.saveManager ?? {};
      if (_pendingAnnounce) {
        ctx.announce.polite(_pendingAnnounce);
        _pendingAnnounce = null;
      } else {
        const dateStr = formatDate(ctx.profile.meta?.createdAt);
        ctx.announce.polite(
          `${sm.title ?? 'Gestion de la sauvegarde'} : ${sm.dateLabel ?? 'Date de création : '}${dateStr}`,
        );
      }

      // Échap = retour au menu (capture sur le conteneur, bubbling depuis textarea/boutons).
      _escHandler = (e) => { if (e.key === 'Escape') doBack(); };
      _root.addEventListener('keydown', _escHandler);

      // Focus la zone de texte : l'utilisateur peut immédiatement copier.
      _textarea.focus();
    },

    unmount() {
      if (_root) {
        if (_escHandler) _root.removeEventListener('keydown', _escHandler);
        _root.remove();
      }
      _root       = null;
      _dateEl     = null;
      _textarea   = null;
      _escHandler = null;
      _ctx        = null;
    },
  };
}
