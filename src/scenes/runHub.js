// src/scenes/runHub.js — Hub de run : Base secrète.
//
// Scène d'arrivée après création ou chargement d'une partie.
// Affiche l'état du duo, les options inter-combats et la prochaine mission.
// C'est le point de sauvegarde légitime : la run est sérialisée à chaque montage.
//
// Aucun DOM hors de ce module et src/ui/.
// Aucun accès au mécanisme de seed : l'ennemi courant est obtenu via getNextEnemy.

import { LinearMenu }  from '../ui/menus/LinearMenu.js';
import { getNextEnemy, serialize } from '../engine/run.js';
import { matchKeybinding, KEYBINDINGS } from '../ui/keybindings.js';
import { format } from '../ui/format.js';

const SAVE_KEY = 'duoforce_save';

export function createRunHubScene() {
  let ctx        = null;
  let menu       = null;
  let keyHandler = null;

  // --- Helpers -------------------------------------------------------------------

  function s() {
    return ctx.strings?.runHub ?? {};
  }

  function phaseType(phase) {
    const hub = s();
    if (phase === 1) return hub.missionRecon        ?? 'reconnaissance';
    if (phase === 2) return hub.missionIntervention ?? 'intervention';
    return              hub.missionElimination      ?? 'élimination';
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

  function totalPowers(run) {
    return run.heroes.reduce((sum, h) => sum + (h.starting_powers?.length ?? 0), 0);
  }

  // --- Construction des items ----------------------------------------------------

  function buildItems() {
    const hub = s();
    const run = ctx.run;
    const { round, phase } = run.progression;
    const type   = phaseType(phase);
    const h1     = heroName(run.heroes[0]);
    const h2     = heroName(run.heroes[1]);
    const enemy  = getNextEnemy(run);
    const eName  = enemyName(enemy);
    const eDesc  = enemyDescription(enemy);

    const launchLabel = eDesc
      ? format(hub.launchEntryFull ?? 'Lancer la mission {type} contre {enemy} : {description}', { type, enemy: eName, description: eDesc })
      : format(hub.launchEntry     ?? 'Lancer la mission {type} contre {enemy}.', { type, enemy: eName });

    return [
      {
        id: 'status',
        label: format(hub.statusDuo ?? '{hero1} et {hero2} : {hp} sur {maxHp} PV, {powers} pouvoirs.', {
          hero1: h1, hero2: h2, hp: run.hp, maxHp: run.maxHp, powers: totalPowers(run),
        }),
      },
      {
        id: 'shop',
        label: format(hub.shopEntry ?? 'Améliorations ({credit} crédit) : Acheter des gadgets, recruter des side-kicks et débloquer des atouts.', {
          credit: run.credit,
        }),
      },
      {
        id: 'launch',
        label: launchLabel,
      },
      {
        id: 'quit',
        label: hub.quit ?? 'Retour au menu principal',
      },
    ];
  }

  function buildInterfaceDescription() {
    const hub = s();
    const { round, phase } = ctx.run.progression;
    return format(hub.interfaceDescription ?? 'Préparation pour le jour {round}, mission {type}', {
      round,
      type: phaseType(phase),
    });
  }

  // --- Montage du menu -----------------------------------------------------------

  function mountMenu() {
    const { root, announce } = ctx;
    const hub = s();

    if (menu) { menu.unmount(); menu = null; }

    menu = new LinearMenu({
      container:   root,
      announce,
      orientation: 'vertical',
      title:         hub.title ?? 'Base secrète',
      ariaLabel:     hub.label ?? 'Base secrète',
      interfaceName: hub.name  ?? 'Base secrète',
      interfaceDescription: buildInterfaceDescription,
      items:     buildItems(),
      onConfirm: (item) => handleConfirm(item.id),
      onCancel:  () => { /* pas d'annulation depuis le hub */ },
    });
    menu.mount();
  }

  function handleConfirm(id) {
    if (id === 'quit') {
      ctx.run = null;
      ctx.router.go('menu');
    }
    // 'status' et 'shop' : informatifs pour l'instant.
    // 'launch' : sera branché dans un prompt ultérieur.
  }

  // --- Raccourcis clavier --------------------------------------------------------

  function attachKeybindings() {
    const { announce } = ctx;

    keyHandler = (event) => {
      const binding = matchKeybinding(event);
      if (!binding) return;
      const run = ctx.run;
      if (!run) return;

      const hub = s();

      if (binding === KEYBINDINGS.ANNOUNCE_DUO_HP) {
        event.preventDefault();
        announce.polite(format(hub.announceHp ?? '{hp} sur {maxHp} PV', {
          hp: run.hp, maxHp: run.maxHp,
        }));
        return;
      }

      if (binding === KEYBINDINGS.ANNOUNCE_CREDIT) {
        event.preventDefault();
        announce.polite(format(hub.announceCredit ?? '{credit} crédit', {
          credit: run.credit,
        }));
        return;
      }

      if (binding === KEYBINDINGS.ANNOUNCE_TURN) {
        event.preventDefault();
        const { round, phase } = run.progression;
        const enemy = getNextEnemy(run);
        announce.polite(format(hub.announceThreat ?? '{enemy} : {type}, jour {round}', {
          enemy: enemyName(enemy),
          type:  phaseType(phase),
          round,
        }));
        return;
      }
    };

    document.addEventListener('keydown', keyHandler);
  }

  function detachKeybindings() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
  }

  // --- Sauvegarde ----------------------------------------------------------------

  function saveRun() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(ctx.run)));
    } catch {
      // Ignore les erreurs de stockage (navigation privée, quota atteint…).
    }
  }

  // --- Interface publique --------------------------------------------------------

  return {
    mount(context) {
      ctx = context;
      saveRun();
      mountMenu();
      attachKeybindings();
    },

    unmount() {
      detachKeybindings();
      if (menu) { menu.unmount(); menu = null; }
      ctx = null;
    },
  };
}
