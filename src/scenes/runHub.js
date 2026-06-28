// src/scenes/runHub.js — Hub de run : Base secrète.
//
// Scène d'arrivée après création ou chargement d'une partie.
// Affiche l'état du duo, les options inter-combats et la prochaine mission.
// C'est le point de sauvegarde légitime : la run est sérialisée à chaque montage.
//
// Structure zones (Tab/Shift+Tab) :
//   Zone 0 — menu principal (LinearMenu) : items du hub
//   Zone 1 — inventaire gadgets (GadgetInventoryWidget) : navigation horizontale
//
// Quand un SubMenu est ouvert (Duo, Deck, Détail de pouvoir), les zones sont
// démontées et le SubMenu remplace directement ctx.root. mountHub() recrée les
// zones à chaque retour.
//
// Aucun DOM hors de ce module et src/ui/.
// Aucun accès au mécanisme de seed : l'ennemi courant est obtenu via getNextEnemy.

import { LinearMenu }  from '../ui/menus/LinearMenu.js';
import { SubMenu }     from '../ui/menus/SubMenu.js';
import { createZoneController } from '../ui/zones.js';
import { createGadgetInventoryWidget } from '../ui/GadgetInventoryWidget.js';
import { getNextEnemy } from '../engine/run.js';
import { saveProfileToLocal } from '../engine/persistence.js';
import { getPowerById } from '../data/powers/index.js';
import { matchKeybinding, KEYBINDINGS } from '../ui/keybindings.js';
import { format } from '../ui/format.js';
import { addGadget } from '../engine/gadgets.js';
import { getGadgetById } from '../data/gadgets/index.js';

export function createRunHubScene() {
  let ctx         = null;
  let activeMenu  = null;
  let keyHandler  = null;

  // Zone controller + gadget widget (null hors hub principal).
  let activeZone   = null;
  let activeWidget = null;
  let menuZoneEl   = null;
  let gadgetZoneEl = null;

  // --- Helpers -------------------------------------------------------------------

  function hub() { return ctx.strings?.runHub ?? {}; }

  /**
   * Démonte tout ce qui est lié au hub multi-zones (zone controller, widget,
   * conteneurs de zone, menu principal). Appelé avant chaque swap() ou avant
   * de remonter le hub.
   */
  function disposeAll() {
    if (activeZone)   { activeZone.dispose();  activeZone   = null; }
    if (activeWidget) { activeWidget.unmount(); activeWidget = null; }
    if (menuZoneEl)   { menuZoneEl.remove();   menuZoneEl   = null; }
    if (gadgetZoneEl) { gadgetZoneEl.remove(); gadgetZoneEl = null; }
    if (activeMenu)   { activeMenu.unmount();  activeMenu   = null; }
    // Retirer role="application" posé par le zone controller sur ctx.root.
    if (ctx?.root) ctx.root.removeAttribute('role');
  }

  /**
   * Remplace l'interface courante par un nouveau menu (SubMenu).
   * Démonte le hub multi-zones avant de monter le menu.
   */
  function swap(newMenu) {
    disposeAll();
    activeMenu = newMenu;
    newMenu.mount();
  }

  function phaseType(phase) {
    const h = hub();
    if (phase === 1) return h.missionRecon        ?? 'reconnaissance';
    if (phase === 2) return h.missionIntervention ?? 'intervention';
    return              h.missionElimination      ?? 'élimination';
  }

  function heroName(hero) {
    return ctx.strings?.heroes?.[hero.nameId] ?? hero.nameId;
  }

  function enemyName(enemy) {
    return ctx.strings?.enemies?.[enemy.nameId] ?? enemy.nameId;
  }

  function enemyDescription(enemy) {
    return ctx.strings?.enemyDescriptions?.[enemy.id] ?? '';
  }

  function powerName(id) {
    return ctx.strings?.powers?.[id]?.name ?? id;
  }

  function powerDescription(id) {
    return ctx.strings?.powers?.[id]?.description ?? '';
  }

  function powerType(power) {
    return ctx.strings?.powerTypes?.[power.type] ?? power.type;
  }

  function powerRarity(power) {
    return ctx.strings?.rarities?.[power.rarity] ?? String(power.rarity);
  }

  function deckPowerIds(run) {
    return run.heroes.flatMap((h) => h.starting_powers ?? []);
  }

  // --- Hub principal -------------------------------------------------------------

  function mountHub(initialIndex = 0) {
    disposeAll();

    const h   = hub();
    const run = ctx.run;
    const { round, phase } = run.progression;
    const type  = phaseType(phase);
    const h1    = heroName(run.heroes[0]);
    const h2    = heroName(run.heroes[1]);
    const enemy = getNextEnemy(run);
    const eDesc = enemyDescription(enemy);
    const count = deckPowerIds(run).length;

    // Pré-remplissage debug : gadgets de test si l'inventaire est vide.
    if (ctx.debug?.enabled && run.gadgets.length === 0) {
      const bandage   = getGadgetById('gadget_bandage');
      const medkit    = getGadgetById('gadget_medkit');
      const energizer = getGadgetById('gadget_energizer');
      if (bandage)   addGadget(run, bandage);
      if (medkit)    addGadget(run, medkit);
      if (energizer) addGadget(run, energizer);
    }

    const launchLabel = eDesc
      ? format(h.launchEntryFull ?? 'Lancer la mission {type} contre {enemy} : {description}', { type, enemy: enemyName(enemy), description: eDesc })
      : format(h.launchEntry     ?? 'Lancer la mission {type} contre {enemy}.', { type, enemy: enemyName(enemy) });

    // Créer les conteneurs de zone.
    menuZoneEl   = document.createElement('div');
    gadgetZoneEl = document.createElement('div');
    ctx.root.appendChild(menuZoneEl);
    ctx.root.appendChild(gadgetZoneEl);

    // Zone 0 — menu principal.
    activeMenu = new LinearMenu({
      container:    menuZoneEl,
      announce:     ctx.announce,
      orientation:  'vertical',
      initialIndex,
      title:         h.title ?? 'Base secrète',
      ariaLabel:     h.label ?? 'Base secrète',
      interfaceName: h.name  ?? 'Base secrète',
      interfaceDescription: () => format(h.interfaceDescription ?? 'Préparation pour le jour {round}, mission {type}', { round, type }),
      items: [
        {
          id: 'status',
          label: format(h.statusDuo ?? '{hero1} et {hero2} : {hp} sur {maxHp} PV, {count} pouvoirs.', {
            hero1: h1, hero2: h2, hp: run.hp, maxHp: run.maxHp, count, powers: count,
          }),
        },
        {
          id: 'shop',
          label: format(h.shopEntry ?? 'Améliorations ({credit} crédit) : Acheter des gadgets, recruter des side-kicks et débloquer des atouts.', {
            credit: run.credit,
          }),
        },
        { id: 'launch', label: launchLabel },
        { id: 'quit',   label: h.quit ?? 'Retour au menu principal' },
      ],
      onConfirm: (item, idx) => {
        if (item.id === 'status') { openDuoMenu(() => mountHub(idx)); return; }
        if (item.id === 'launch') { ctx.router.go('combat'); return; }
        if (item.id === 'quit') {
          ctx.router.go('menu');
        }
        // 'shop' : informatif pour l'instant.
      },
      onCancel: () => { /* pas d'annulation depuis le hub */ },
    });
    activeMenu.mount();

    // Zone 1 — inventaire de gadgets.
    const gStr = ctx.strings?.gadgets ?? {};
    activeWidget = createGadgetInventoryWidget({
      container:    gadgetZoneEl,
      run,
      usageContext: 'hub',
      strings:      ctx.strings,
      announce:     ctx.announce,
      onAfterUse:   () => saveProfileToLocal(ctx.profile),
    });
    activeWidget.mount();

    // Contrôleur de zones (Tab/Shift+Tab sur ctx.root).
    activeZone = createZoneController({
      container: ctx.root,
      announce:  ctx.announce,
      label:     h.label ?? 'Base secrète',
      zones: [
        {
          id:      'menu',
          element: menuZoneEl,
          label:   h.title ?? 'Base secrète',
          noAria:  true,
          focus:   () => {
            const el = menuZoneEl.querySelector('[role="menu"]');
            if (el) el.focus(); else menuZoneEl.focus();
          },
        },
        {
          id:      'gadgets',
          element: gadgetZoneEl,
          label:   gStr.zoneName ?? 'Zone gadgets',
          noAria:  true,
          focus:   () => activeWidget.focus(),
          onKey:   (event) => activeWidget.handleKey(event),
          onEnter: () => {
            const summary  = activeWidget.getSummary();
            const slotDesc = activeWidget.getCurrentSlotDescription();
            return slotDesc ? `${summary}. ${slotDesc}` : summary;
          },
        },
      ],
      defaultZone: 0,
    });
    activeZone.mount();
  }

  // --- Menu duo ------------------------------------------------------------------

  function openDuoMenu(onBack, initialIndex = 0) {
    const h   = hub();
    const run = ctx.run;
    const { round } = run.progression;
    const h1    = heroName(run.heroes[0]);
    const h2    = heroName(run.heroes[1]);
    const count = deckPowerIds(run).length;
    const title = format(h.duoMenuTitle ?? 'Duo {hero1} et {hero2}', { hero1: h1, hero2: h2 });

    swap(new SubMenu({
      container:   ctx.root,
      announce:    ctx.announce,
      strings:     ctx.strings,
      mode:        'informative',
      initialIndex,
      title,
      ariaLabel:     title,
      interfaceName: title,
      interfaceDescription: format(h.duoMenuDescription ?? 'Jour {round}.', { round }),
      items: [
        {
          id: 'hp',
          label: format(h.duoHp ?? '{hp} sur {maxHp} PV.', { hp: run.hp, maxHp: run.maxHp }),
        },
        {
          id: 'powers',
          label: format(h.duoPowers ?? '{count} pouvoirs dans le deck.', { count }),
          onConfirm: () => {
            const duoIdx = activeMenu.activeIndex;
            openDeckMenu(() => openDuoMenu(onBack, duoIdx));
          },
        },
      ],
      closeLabel: h.duoBack ?? 'Retour.',
      onClose: onBack,
    }));
  }

  // --- Menu deck -----------------------------------------------------------------

  function openDeckMenu(onBack, initialIndex = 0) {
    const h     = hub();
    const run   = ctx.run;
    const ids   = deckPowerIds(run);
    const count = ids.length;
    const title = format(h.deckTitle ?? '{count} pouvoirs', { count });

    const powerItems = ids.map((id, i) => ({
      id: `power_${i}`,
      label: format(h.deckEntry ?? '{name} : {description}', {
        name:        powerName(id),
        description: powerDescription(id),
      }),
      onConfirm: () => {
        const deckIdx = activeMenu.activeIndex;
        openPowerDetail(id, () => openDeckMenu(onBack, deckIdx));
      },
    }));

    swap(new SubMenu({
      container:   ctx.root,
      announce:    ctx.announce,
      strings:     ctx.strings,
      mode:        'informative',
      initialIndex,
      title,
      ariaLabel:     title,
      interfaceName: title,
      interfaceDescription: h.deckDescription ?? "Affiche l'ensemble des pouvoirs actuellement maîtrisés par votre duo.",
      items: powerItems,
      closeLabel: ctx.strings?.submenu?.close ?? 'Fermer',
      onClose: onBack,
    }));
  }

  // --- Sous-menu de détail d'un pouvoir ------------------------------------------

  function openPowerDetail(id, onBack) {
    const h     = hub();
    const power = getPowerById(id);
    const name  = powerName(id);
    const desc  = powerDescription(id);

    const items = [
      { id: 'name',        label: name },
      { id: 'description', label: desc },
    ];

    if (power) {
      items.push({ id: 'type',   label: format(h.powerType   ?? 'Type : {type}',     { type:   powerType(power)   }) });
      items.push({ id: 'rarity', label: format(h.powerRarity ?? 'Rareté : {rarity}', { rarity: powerRarity(power) }) });
    }

    swap(new SubMenu({
      container:   ctx.root,
      announce:    ctx.announce,
      strings:     ctx.strings,
      mode:        'informative',
      title:         name,
      ariaLabel:     name,
      interfaceName: name,
      items,
      closeLabel: ctx.strings?.submenu?.close ?? 'Fermer',
      onClose: onBack,
    }));
  }

  // --- Raccourcis clavier --------------------------------------------------------

  function attachKeybindings() {
    keyHandler = (event) => {
      const binding = matchKeybinding(event);
      if (!binding) return;
      const run = ctx.run;
      if (!run) return;
      const h = hub();

      if (binding === KEYBINDINGS.ANNOUNCE_DUO_HP) {
        event.preventDefault();
        ctx.announce.polite(format(h.announceHp ?? '{hp} sur {maxHp} PV', { hp: run.hp, maxHp: run.maxHp }));
        return;
      }
      if (binding === KEYBINDINGS.ANNOUNCE_CREDIT) {
        event.preventDefault();
        ctx.announce.polite(format(h.announceCredit ?? '{credit} crédit', { credit: run.credit }));
        return;
      }
      if (binding === KEYBINDINGS.ANNOUNCE_TURN) {
        event.preventDefault();
        const { round, phase } = run.progression;
        const enemy = getNextEnemy(run);
        ctx.announce.polite(format(h.announceThreat ?? '{enemy} : {type}, jour {round}', {
          enemy: enemyName(enemy), type: phaseType(phase), round,
        }));
        return;
      }

      // G : bascule entre la zone gadgets et la zone par défaut (menu).
      // Inopérant si les zones ne sont pas montées (SubMenu ouvert, etc.).
      if (binding === KEYBINDINGS.GADGET_ZONE) {
        if (!activeZone) return;
        event.preventDefault();
        const GADGET_IDX = 1;
        if (activeZone.activeIndex === GADGET_IDX) {
          activeZone.activate(0);         // retour au menu
        } else {
          activeZone.activate(GADGET_IDX); // aller aux gadgets
        }
        return;
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  function detachKeybindings() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  }

  // --- Interface publique --------------------------------------------------------

  return {
    mount(context) {
      ctx = context;
      saveProfileToLocal(ctx.profile);
      mountHub(0);
      attachKeybindings();
    },
    unmount() {
      detachKeybindings();
      disposeAll();
      ctx = null;
    },
  };
}
