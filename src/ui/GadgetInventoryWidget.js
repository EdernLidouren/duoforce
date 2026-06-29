// src/ui/GadgetInventoryWidget.js — Widget d'inventaire de gadgets réutilisable.
//
// S'intègre en zone dans createZoneController via { element, focus, onKey, onEnter }.
// Conçu pour fonctionner à l'identique au hub ET en combat (le cadre courant
// est fourni en paramètre ; aucune logique hub codée en dur ici).
//
// Navigation : ArrowLeft/Right/Home/End entre emplacements (même logique de liste
// que les menus : cyclage selon preferences.menuCycling, '*' au bord).
// Entrée ouvre un SubMenu si le gadget est utilisable dans le cadre.
// Retour-arrière annonce le résumé de la zone.
//
// Isolation des événements clavier du SubMenu :
//   attachInput (utilisé par SubMenu) appelle event.preventDefault() mais PAS
//   stopPropagation(). L'événement bulle donc jusqu'au contrôleur de zones.
//   Fix : deux listeners sur `container` —
//     • capture (descente) : mémorise si un SubMenu était ouvert au moment où
//       l'événement a commencé (avant que le SubMenu le traite).
//     • bulle (remontée)  : stoppe la propagation si le SubMenu était ouvert,
//       empêchant le contrôleur de zones de re-traiter la touche.
//   Cela isole complètement le SubMenu du reste de l'arbre d'événements.
//
// Fonctions exportées partagées avec le prompt 3 (usage en combat) :
//   isGadgetUsableInContext — vérifie le cadre d'usage
//   describeGadget          — description ARIA unifiée (nav + SubMenu)
//   applyGadgetInHub        — exécuteur hub (sans combatState)
//
// Aucun innerHTML — textContent et API DOM uniquement.
// Aucun DOM direct dans engine/.

import { SubMenu }                               from './menus/SubMenu.js';
import { removeGadget }                          from '../engine/gadgets.js';
import { resolveListMove, NavCommand, EDGE_MARK } from './listNavigation.js';
import { preferences }                           from './preferences.js';
import { format }                                from './format.js';

// ---------------------------------------------------------------------------
// Fonctions partagées (réutilisées au combat, prompt 3)
// ---------------------------------------------------------------------------

/**
 * Indique si un gadget est utilisable dans le contexte courant.
 * @param {object} gadget        Instance vivante.
 * @param {'hub'|'combat'} ctx
 * @returns {boolean}
 */
export function isGadgetUsableInContext(gadget, ctx) {
  return gadget.usableIn === 'both' || gadget.usableIn === ctx;
}

/**
 * Produit la description ARIA/NVDA d'un gadget.
 * Format : « Nom : description longue[, non utilisable ici][, charge X/Y][, statut A…] »
 *
 * @param {object} gadget          Instance vivante.
 * @param {'hub'|'combat'} usageCtx
 * @param {object} strings         Pack de langue.
 * @returns {string}
 */
export function describeGadget(gadget, usageCtx, strings) {
  const g    = strings?.gadgets ?? {};
  const data = g[gadget.id] ?? {};
  const name = data.name        ?? gadget.id;
  const desc = data.description ?? '';

  const base = desc ? `${name} : ${desc}` : name;

  const extras = [];

  if (!isGadgetUsableInContext(gadget, usageCtx)) {
    extras.push(g.notUsableHere ?? 'non utilisable ici');
  }

  if (gadget.counter) {
    const { value, max } = gadget.counter;
    const tpl = g.counter ?? '{value}/{max}';
    extras.push(tpl.replace('{value}', value).replace('{max}', max));
  }

  const statuses = gadget.statuses ?? [];
  if (statuses.length > 0) {
    const names = statuses.map((s) => strings?.statuses?.[s.id]?.name ?? s.id).join(', ');
    extras.push(names);
  }

  return extras.length > 0 ? `${base}, ${extras.join(', ')}` : base;
}

/**
 * Applique les effets d'un gadget dans le contexte hub (sans combatState).
 * Supporte les types d'action compatibles hub : 'heal'.
 *
 * @param {object} gadget  Instance vivante.
 * @param {object} run     Run vivante (mutée en place).
 * @param {object} strings Pack de langue.
 * @returns {string[]}     Descriptions des effets appliqués (pour l'annonce NVDA).
 */
export function applyGadgetInHub(gadget, run, strings) {
  const effects = [];
  for (const action of (gadget.actions ?? [])) {
    if (!action) continue;
    if (action.type === 'heal' && action.target === 'duo') {
      const before = run.hp;
      run.hp       = Math.min(run.maxHp, run.hp + (action.value ?? 0));
      const healed = run.hp - before;
      if (healed > 0) {
        const hpLabel = strings?.effectLabels?.hp ?? 'PV';
        effects.push(`+${healed} ${hpLabel}`);
      }
    }
  }
  return effects;
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

/**
 * Crée le widget d'inventaire de gadgets.
 *
 * @param {object} options
 * @param {HTMLElement} options.container    Élément hôte (zone gadgets du hub ou du combat).
 * @param {object}   options.run            Run vivante.
 * @param {'hub'|'combat'} options.usageContext
 * @param {object}   options.strings        Pack de langue.
 * @param {object}   options.announce       { polite, enqueue, assertive }
 * @param {Function} [options.onAfterUse]   Callback après utilisation (ex. saveProfileToLocal).
 *
 * @returns {{
 *   mount(): void,
 *   unmount(): void,
 *   focus(): void,
 *   handleKey(event: KeyboardEvent): boolean,
 *   getSummary(): string,
 *   getCurrentSlotDescription(): string,
 *   refresh(): void,
 *   get element(): HTMLElement,
 * }}
 */
export function createGadgetInventoryWidget({
  container,
  run,
  usageContext,
  strings,
  announce,
  /**
   * Surcharge optionnelle du test d'utilisabilité.
   * Si absent, utilise isGadgetUsableInContext(gadget, usageContext).
   * En combat : (gadget) => isGadgetUsableInContext(gadget, 'combat') && canPlayerAct(state)
   * @type {((gadget: object) => boolean) | undefined}
   */
  isGadgetUsable,
  /**
   * Surcharge optionnelle du gestionnaire d'utilisation.
   * Si absent, utilise applyGadgetInHub (comportement hub).
   * Signature : (gadget, index, done) => void
   *   done() — callback fourni par le widget ; à appeler quand l'usage est terminé
   *             (succès OU annulation). Le widget rafraîchit son rendu et se refocus.
   * @type {((gadget: object, index: number, done: () => void) => void) | undefined}
   */
  onUse,
  onAfterUse,
}) {
  let cursorIndex = 0;
  let rootEl      = null;
  let listEl      = null;
  let activeSubMenu = null;

  // Listeners de protection contre la bulle d'événements hors SubMenu.
  let keyCapture = null; // phase capture : mémorise l'état SubMenu au début de l'événement
  let keyBubble  = null; // phase bulle  : stoppe la propagation si SubMenu était ouvert
  let subMenuWasOpenOnKeydown = false;

  function g() { return strings?.gadgets ?? {}; }

  // --- Données ---------------------------------------------------------------

  function capacity()  { return run.gadgetSlots ?? 3; }
  function gadgetAt(i) { return run.gadgets[i] ?? null; }

  function slotDescription(i) {
    const gadget = gadgetAt(i);
    if (!gadget) {
      const tpl = g().emptySlot ?? 'emplacement {n} vide';
      return tpl.replace('{n}', i + 1);
    }
    return describeGadget(gadget, usageContext, strings);
  }

  // --- DOM -------------------------------------------------------------------

  function buildDOM() {
    rootEl = document.createElement('div');
    rootEl.className = 'gadget-inventory';
    rootEl.tabIndex  = -1;
    rootEl.setAttribute('aria-label', getSummary());

    listEl = document.createElement('ul');
    listEl.setAttribute('role', 'list');
    rootEl.appendChild(listEl);

    renderSlots();
    container.appendChild(rootEl);
  }

  function renderSlots() {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    const cap = capacity();
    for (let i = 0; i < cap; i++) {
      const li    = document.createElement('li');
      li.className = 'gadget-slot';
      if (i === cursorIndex) li.classList.add('gadget-slot--active');
      const label = slotDescription(i);
      li.textContent = label;
      li.setAttribute('aria-label', label);
      listEl.appendChild(li);
    }
    if (rootEl) rootEl.setAttribute('aria-label', getSummary());
  }

  function updateSlotEl(i) {
    const li = listEl?.children[i];
    if (!li) return;
    const label = slotDescription(i);
    li.textContent = label;
    li.setAttribute('aria-label', label);
    li.classList.toggle('gadget-slot--active', i === cursorIndex);
  }

  // --- Navigation curseur ----------------------------------------------------

  function moveTo(command) {
    const { index, edge, announce: doAnnounce } = resolveListMove(
      cursorIndex, capacity(), command, preferences.menuCycling,
    );
    const prev = cursorIndex;
    cursorIndex = index;
    if (prev !== cursorIndex) {
      updateSlotEl(prev);
      updateSlotEl(cursorIndex);
    }
    if (doAnnounce) {
      const text = slotDescription(cursorIndex);
      announce.polite(edge ? EDGE_MARK + text : text);
    }
  }

  // --- SubMenu gadget --------------------------------------------------------

  function openSubMenu() {
    const gadget = gadgetAt(cursorIndex);
    // Utilise la surcharge isGadgetUsable si fournie (ex. combat : vérifie aussi canPlayerAct).
    const usable = gadget && (
      isGadgetUsable ? isGadgetUsable(gadget) : isGadgetUsableInContext(gadget, usageContext)
    );

    if (!gadget || !usable) {
      announce.polite(g().noAction ?? 'Aucune action disponible.');
      return;
    }

    const gadgetLabel = describeGadget(gadget, usageContext, strings);
    const gStr = g();
    const idx = cursorIndex;

    if (rootEl) rootEl.setAttribute('aria-hidden', 'true');

    activeSubMenu = new SubMenu({
      container,
      announce,
      strings,
      mode:          'informative',
      title:         gadgetLabel,
      ariaLabel:     gadgetLabel,
      interfaceName: gadgetLabel,
      items: [
        {
          id:    'use',
          label: gStr.use ?? 'Utiliser',
          onConfirm: () => {
            if (onUse) {
              // Mode combat (ou surcharge externe) : le caller gère l'effet et
              // appelle done() quand l'usage est terminé (succès ou annulation).
              closeSubMenu(() => {
                const done = () => {
                  cursorIndex = Math.min(cursorIndex, Math.max(0, capacity() - 1));
                  renderSlots();
                  if (rootEl) rootEl.focus();
                  announce.polite(slotDescription(cursorIndex));
                };
                onUse(gadget, idx, done);
              });
            } else {
              closeSubMenu(() => useGadget(idx));
            }
          },
        },
      ],
      closeLabel: gStr.back ?? 'Retour',
      onClose: () => closeSubMenu(),
    });
    activeSubMenu.mount();
  }

  function closeSubMenu(callback) {
    if (activeSubMenu) { activeSubMenu.unmount(); activeSubMenu = null; }
    if (rootEl) rootEl.removeAttribute('aria-hidden');
    if (typeof callback === 'function') {
      callback();
    } else {
      if (rootEl) rootEl.focus();
      announce.polite(slotDescription(cursorIndex));
    }
  }

  // --- Utilisation hors combat -----------------------------------------------

  function useGadget(index) {
    const gadget = gadgetAt(index);
    if (!gadget) return;

    const effects = applyGadgetInHub(gadget, run, strings);

    if (gadget.consumable) {
      removeGadget(run, index, 'used');
      cursorIndex = Math.min(cursorIndex, Math.max(0, capacity() - 1));
    }

    const gStr    = g();
    const name    = (strings?.gadgets?.[gadget.id]?.name) ?? gadget.id;
    const usedMsg = format(gStr.usedNamed ?? '{name} utilisé.', { name });

    renderSlots();
    if (rootEl) rootEl.focus();

    // Annonces séquentielles : NVDA lit chaque message séparément et dans l'ordre.
    announce.enqueue(usedMsg);
    effects.forEach((effect) => announce.enqueue(effect + '.'));

    if (typeof onAfterUse === 'function') onAfterUse();
  }

  // --- API zone (pour createZoneController) ----------------------------------

  /** Résumé annoncé à l'entrée dans la zone (zone.onEnter) et sur aria-label. */
  function getSummary() {
    const gStr = g();
    const count = run.gadgets.length;
    const cap   = capacity();
    const tpl   = gStr.summary ?? '{count}/{capacity}';
    return tpl.replace('{count}', count).replace('{capacity}', cap);
  }

  /** Description de l'emplacement courant (inclus dans zone.onEnter). */
  function getCurrentSlotDescription() {
    return slotDescription(cursorIndex);
  }

  /**
   * Gère une touche. Retourne true si consommée.
   * Destiné à zone.onKey dans createZoneController.
   */
  function handleKey(event) {
    if (activeSubMenu) return false;

    switch (event.key) {
      case 'ArrowLeft':  moveTo(NavCommand.PREVIOUS); return true;
      case 'ArrowRight': moveTo(NavCommand.NEXT);     return true;
      case 'Home':       moveTo(NavCommand.FIRST);    return true;
      case 'End':        moveTo(NavCommand.LAST);     return true;
      case 'Enter':      openSubMenu();               return true;
      case 'Backspace':  announce.polite(getSummary()); return true;
      default:           return false;
    }
  }

  /** Déplace le focus sur l'élément racine du widget. Zone.focus. */
  function focus() {
    if (rootEl) rootEl.focus();
  }

  // --- Montage / démontage ---------------------------------------------------

  function mount() {
    buildDOM();

    // Phase capture : enregistre si le SubMenu était ouvert au DÉBUT de l'événement,
    // avant que le SubMenu (sur _root, un enfant) ne le traite.
    keyCapture = () => {
      subMenuWasOpenOnKeydown = !!activeSubMenu;
    };

    // Phase bulle : si le SubMenu était ouvert quand l'événement a commencé,
    // le stoppe ici pour qu'il n'atteigne pas le contrôleur de zones.
    keyBubble = (event) => {
      if (subMenuWasOpenOnKeydown) event.stopPropagation();
      subMenuWasOpenOnKeydown = false;
    };

    container.addEventListener('keydown', keyCapture, true);  // capture
    container.addEventListener('keydown', keyBubble,  false); // bulle
  }

  function unmount() {
    if (activeSubMenu) { activeSubMenu.unmount(); activeSubMenu = null; }
    if (keyCapture) { container.removeEventListener('keydown', keyCapture, true);  keyCapture = null; }
    if (keyBubble)  { container.removeEventListener('keydown', keyBubble,  false); keyBubble  = null; }
    if (rootEl)     { rootEl.remove(); rootEl = null; listEl = null; }
    cursorIndex              = 0;
    subMenuWasOpenOnKeydown  = false;
  }

  /** Rafraîchit le rendu (à appeler si run.gadgets change de l'extérieur). */
  function refresh() {
    if (listEl) renderSlots();
  }

  return {
    mount,
    unmount,
    focus,
    handleKey,
    getSummary,
    getCurrentSlotDescription,
    refresh,
    get element() { return rootEl; },
  };
}
