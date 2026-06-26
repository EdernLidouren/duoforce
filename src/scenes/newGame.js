// src/scenes/newGame.js — Scène de configuration d'une nouvelle partie.
//
// Collecte les paramètres de la partie (graine, héros) et appelle createRun.
// Toute la logique de calcul est déléguée à l'engine ; la scène ne fait
// qu'assembler les choix et présenter l'interface.
//
// Navigation (du plus imbriqué au plus haut) :
//   Scène config (LinearMenu)
//     └─ Sélecteur de graine   (SubMenu single_choice)
//     └─ Sélecteur de héros    (LinearMenu)
//          └─ Détail du héros  (SubMenu informative + onConfirm par item)
//               └─ Liste des pouvoirs (SubMenu informative)
//
// Placeholder de lancement : branché sur 'combat' (scène de test existante)
// jusqu'à l'implémentation de la scène de run complète.

import { LinearMenu } from '../ui/menus/LinearMenu.js';
import { SubMenu }     from '../ui/menus/SubMenu.js';
import { HEROES }      from '../data/heroes/index.js';
import { getPowerById } from '../data/powers/index.js';
import { getPerkById }  from '../data/perks/index.js';
import { createRun }   from '../engine/run.js';
import { format }      from '../ui/format.js';

/**
 * Retourne true si `hero` est sélectionnable pour `targetSlot` (1 ou 2).
 * Extensible : ajouter d'autres critères (déblocage, etc.) ici.
 *
 * @param {object} hero
 * @param {object} config   État courant { hero1, hero2 }
 * @param {1|2}   targetSlot
 * @returns {boolean}
 */
function isHeroEligible(hero, config, targetSlot) {
  const other = targetSlot === 1 ? config.hero2 : config.hero1;
  if (other && other.id === hero.id) return false;
  return true;
}

/**
 * Compte les occurrences de chaque id de pouvoir dans un tableau.
 * @param {string[]} ids
 * @returns {Map<string, number>}
 */
function countById(ids) {
  const map = new Map();
  for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
  return map;
}

export function createNewGameScene() {
  let activeMenu = null;
  let ctx        = null;

  // Position du curseur dans le menu de configuration, restaurée à chaque retour.
  // Mise à jour systématiquement avant toute navigation hors du menu (onConfirm).
  // Survit à un démontage/remontage via router.go (fermeture de fabrique).
  // Pattern : _xReturnIdx = idx avant swap/router.go ; mountX() lit _xReturnIdx.
  let _configReturnIdx = 0;

  // État courant de la configuration.
  const config = { seedMode: null, hero1: null, hero2: null };

  // --- Helpers -------------------------------------------------------------------

  function swap(menu) {
    if (activeMenu) { activeMenu.unmount(); activeMenu = null; }
    activeMenu = menu;
    menu.mount();
  }

  function heroName(hero) {
    return ctx.strings?.heroes?.[hero.nameId] ?? hero.nameId;
  }

  function heroDescription(hero) {
    return ctx.strings?.heroDescriptions?.[hero.id] ?? '';
  }

  function buildConfigDescription(s) {
    const missing = (config.hero1 ? 0 : 1) + (config.hero2 ? 0 : 1);
    if (missing === 0) return s.describeReady ?? 'Prêt.';
    return format(s.describeNeedHeroes ?? 'Choisissez encore {count} héros.', { count: missing });
  }

  function buildConfigItems(s) {
    const items = [
      {
        id: 'seed',
        label: format(s.seed ?? 'Graine : {seed}', { seed: config.seedMode?.label ?? '' }),
      },
      {
        id: 'hero1',
        label: format(s.hero1 ?? 'Premier héros : {name}', {
          name: config.hero1 ? heroName(config.hero1) : (s.noneHero ?? 'Aucun'),
        }),
      },
      {
        id: 'hero2',
        label: format(s.hero2 ?? 'Second héros : {name}', {
          name: config.hero2 ? heroName(config.hero2) : (s.noneHero ?? 'Aucun'),
        }),
      },
    ];

    if (config.hero1 && config.hero2) {
      const maxHp  = (config.hero1.hp ?? 0) + (config.hero2.hp ?? 0);
      const powers = config.hero1.starting_powers.length + config.hero2.starting_powers.length;
      items.push({
        id: 'preview',
        label: format(s.preview ?? 'Aperçu : {hp} PV, {powers} pouvoirs', { hp: maxHp, powers }),
      });
      items.push({ id: 'launch', label: s.launch ?? 'Lancer la partie' });
    }

    items.push({ id: 'back', label: s.back ?? 'Retour' });
    return items;
  }

  // --- Montage de la config menu -------------------------------------------------

  function mountConfigMenu() {
    const { root, announce, strings } = ctx;
    const s = strings?.newGame ?? {};

    swap(new LinearMenu({
      container: root,
      announce,
      orientation: 'vertical',
      title:         s.title         ?? 'Nouvelle partie',
      ariaLabel:     s.label         ?? 'Configuration',
      interfaceName: s.interfaceName ?? 'Configuration',
      interfaceDescription: () => buildConfigDescription(s),
      items:     buildConfigItems(s),
      initialIndex: _configReturnIdx,
      onConfirm: (item, idx) => { _configReturnIdx = idx; handleConfigChoice(item.id); },
      onCancel:  () => ctx.router.go('menu'),
    }));
  }

  function handleConfigChoice(id) {
    if (id === 'seed')   { openSeedPicker();    return; }
    if (id === 'hero1')  { openHeroSelector(1); return; }
    if (id === 'hero2')  { openHeroSelector(2); return; }
    if (id === 'launch') { launchGame();         return; }
    if (id === 'back')   { ctx.router.go('menu'); return; }
    // 'preview' est informatif — aucune action.
  }

  // --- Sélecteur de graine -------------------------------------------------------

  function openSeedPicker() {
    const { root, announce, strings } = ctx;
    const s = strings?.newGame ?? {};

    // Liste des options de graine. Extensible : ajouter d'autres entrées ici.
    const seedOptions = [
      { id: 'random', label: s.seedRandom ?? 'Aléatoire' },
      // Futur : { id: 'manual', label: '...' }
    ];

    swap(new SubMenu({
      container: root,
      announce,
      strings,
      mode:          'single_choice',
      title:         s.seedPickerTitle ?? 'Choisir la graine',
      ariaLabel:     s.seedPickerTitle ?? 'Choisir la graine',
      interfaceName: s.seedPickerTitle ?? 'Choisir la graine',
      items:      seedOptions,
      closeLabel: strings?.submenu?.close ?? 'Fermer',
      onConfirm:  (item) => { config.seedMode = { id: item.id, label: item.label }; },
      onClose:    () => mountConfigMenu(),
    }));
  }

  // --- Sélecteur de héros --------------------------------------------------------

  function openHeroSelector(slot) {
    const { root, announce, strings } = ctx;
    const s = strings?.newGame ?? {};

    const eligible = HEROES.filter((h) => isHeroEligible(h, config, slot));
    const items = [
      ...eligible.map((hero) => ({ id: hero.id, label: heroName(hero), _hero: hero })),
      { id: '__close__', label: s.heroSelectClose ?? 'Annuler' },
    ];

    swap(new LinearMenu({
      container: root,
      announce,
      orientation: 'vertical',
      title:         s.heroSelectTitle ?? 'Choisir un héros',
      ariaLabel:     s.heroSelectTitle ?? 'Choisir un héros',
      interfaceName: s.heroSelectTitle ?? 'Choisir un héros',
      items,
      onConfirm: (item) => {
        if (item.id === '__close__') { mountConfigMenu(); return; }
        openHeroDetail(item._hero, slot);
      },
      onCancel: () => mountConfigMenu(),
    }));
  }

  // --- Détail d'un héros ---------------------------------------------------------

  function openHeroDetail(hero, slot) {
    const { root, announce, strings } = ctx;
    const s  = strings?.newGame ?? {};
    const sd = s.heroDetail ?? {};

    const name     = heroName(hero);
    const desc     = heroDescription(hero);
    const perkName = strings?.perks?.[hero.signature]?.name ?? hero.signature;
    const perkDesc = strings?.perks?.[hero.signature]?.description ?? '';

    const items = [
      { id: 'name', label: format(sd.name ?? 'Nom : {name}', { name }) },
      ...(desc ? [{ id: 'description', label: desc }] : []),
      { id: 'hp', label: format(sd.hp ?? 'Points de vie : {hp}', { hp: hero.hp ?? '?' }) },
      {
        id: 'starting_powers',
        label: format(sd.startingPowers ?? 'Pouvoirs de départ ({count})', {
          count: hero.starting_powers.length,
        }),
        onConfirm: () => openPowersList(hero, () => openHeroDetail(hero, slot)),
      },
      {
        id: 'perk',
        label: perkDesc
          ? format(sd.perkFull ?? 'Signature : {name} — {description}', { name: perkName, description: perkDesc })
          : format(sd.perk    ?? 'Signature : {name}',                  { name: perkName }),
      },
      {
        id: 'choose',
        label: sd.choose ?? 'Choisir ce héros',
        onConfirm: () => {
          config[`hero${slot}`] = hero;
          mountConfigMenu();
        },
      },
    ];

    swap(new SubMenu({
      container: root,
      announce,
      strings,
      mode:          'informative',
      title:         name,
      ariaLabel:     name,
      interfaceName: name,
      items,
      closeLabel: sd.close ?? strings?.submenu?.close ?? 'Fermer',
      onClose:    () => openHeroSelector(slot),
    }));
  }

  // --- Liste des pouvoirs de départ ----------------------------------------------

  function openPowersList(hero, onBack) {
    const { root, announce, strings } = ctx;
    const s = strings?.newGame ?? {};

    const counts = countById(hero.starting_powers);
    const powerItems = [...counts.entries()].map(([id, count]) => {
      const name = strings?.powers?.[id]?.name ?? id;
      const desc = strings?.powers?.[id]?.description ?? '';
      return {
        id,
        label: format(s.powerEntry ?? '{name} × {count} : {description}', { name, count, description: desc }),
      };
    });

    swap(new SubMenu({
      container: root,
      announce,
      strings,
      mode:          'informative',
      title:         s.powersTitle ?? 'Pouvoirs de départ',
      ariaLabel:     s.powersTitle ?? 'Pouvoirs de départ',
      interfaceName: s.powersTitle ?? 'Pouvoirs de départ',
      items:      powerItems,
      closeLabel: s.powersClose ?? strings?.submenu?.close ?? 'Fermer',
      onClose:    onBack,
    }));
  }

  // --- Lancement -----------------------------------------------------------------

  function launchGame() {
    // Seed : undefined → createRun génère un seed aléatoire (comportement par défaut).
    // Futur : si config.seedMode.id === 'manual', passer config.seedMode.value.
    const seed = config.seedMode?.id === 'random' ? undefined : undefined;

    const run = createRun({ heroes: [config.hero1, config.hero2], seed });

    ctx.run = run;
    ctx.profile.stats.runsStarted++;

    ctx.router.go('run-hub');
  }

  // --- Scène (interface publique) ------------------------------------------------

  return {
    mount(context) {
      ctx = context;
      _configReturnIdx = 0; // entrée fraîche : repartir du début
      const s = ctx.strings?.newGame ?? {};
      config.seedMode = { id: 'random', label: s.seedRandom ?? 'Aléatoire' };
      config.hero1    = null;
      config.hero2    = null;
      mountConfigMenu();
    },

    unmount() {
      if (activeMenu) { activeMenu.unmount(); activeMenu = null; }
      ctx = null;
    },
  };
}
