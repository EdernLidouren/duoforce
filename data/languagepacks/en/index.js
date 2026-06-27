// data/languagepacks/en/index.js — Language pack: English.
//
// Same structure as ../fr/index.js. Localization conventions:
//   - Each resource keeps three distinct strings: `name` (short label),
//     `display` (template announcing the current value) and `help` (hint).
//   - Templates contain `{key}` markers interpolated at runtime (see
//     src/ui/format.js): dynamic text.
// Keep keys in sync across all packs.

export default {
  menu: {
    title: 'Duoforce',
    label: 'Main menu',
    welcome: 'Main menu. Press Enter to start a game.',
    start:    'New game',
    continue: 'Continue game',
    abandon:  'Abandon game',
    testRun:  'Test run',
    options:  'Options',
    quit:     'Quit',
    saveManager:      'Save management',
    abandonQuestion:  'Your current run will be permanently lost. Abandon?',
    combatTest:       'Test combat',
    confirmTest:      'Confirmation test',
  },

  combat: {
    title: 'Test combat',
    turn: 'Turn',
    enemy: 'Enemy',
    duo: 'Duo',
    board: 'Board',
    actions: 'Actions',
    history: 'History',
    noMessages: 'No messages.',
    noSignature: 'No signature.',
    and: 'and',
    instructions: 'Tab to switch zone, arrow keys to navigate.',
    attack: 'Attack',
    defense: 'Defense',
    deck: 'Deck',
    discard: 'Discard',
    exile: 'Exile',
    empty: 'empty',
    endTurn: 'End turn',
    backToMenu: 'Back to menu',
    victory: 'Victory!',
    defeat: 'Defeat.',
    sky: 'Sky',
    surface: 'Surface',
    ground: 'Ground',
    left: 'Left',
    center: 'Center',
    right: 'Right',
    combatType: {
      normal: 'combat',
      boss: 'boss combat',
    },
    turnAnnounce: 'Turn {turn}, {combatType} against {enemy}.',
  },

  resources: {
    hp: {
      name: 'Hit points',
      display: '{value} of {max} hit points.',
      help: 'If your duo’s hit points reach 0, you lose the game.',
    },
    enemyHp: {
      name: 'Hit points',
      display: '{value} of {max} enemy hit points.',
      help: 'Bring the enemy’s hit points down to win this combat.',
    },
    attack: {
      name: 'Attack',
      display: '{value} attack',
      help: 'At the end of the turn, after powers activate, reduces the enemy’s hit points by this value.',
    },
    enemyAttack: {
      name: 'Attack',
      display: '{value} enemy attack',
      help: 'At the end of the turn, after your duo attacks, reduces your hit points by this value.',
    },
    defense: {
      name: 'Defense',
      display: '{value} defense',
      help: 'When your duo takes damage, this value is reduced first.',
    },
    enemyDefense: {
      name: 'Defense',
      display: '{value} enemy defense',
      help: 'When the enemy takes damage, this value is reduced first.',
    },
    maneuver: {
      name: 'Maneuvers',
      display: '{value} maneuvers.',
      help: 'Spend a maneuver to swap the position of two adjacent powers.',
    },
    strategy: {
      name: 'Strategies',
      display: '{value} strategies.',
      help: 'Spend a strategy to discard a power and replace it by choosing among the top {strategy_pick} powers of the deck.',
    },
    credit: {
      name: 'Credit',
      display: '{value} credit.',
      help: 'Credit is the game’s currency.',
    },
  },

  power: {
    short: '{name}, {type}, {rarity}',
    // On-board long description: no type/rarity (design decision).
    long: '{name}: {description}',
  },

  // Short-description template for a status: name + counter.
  status: {
    short: '{name} {stacks}',
  },

  // Long-description template for a signature (perk).
  perk: {
    long: '{name}: {description}',
  },

  // User preferences (name + description), indexed by the option name.
  preferences: {
    menuCycling: {
      name: 'Menu cycling',
      description: 'At a menu edge, pressing the direction wraps the cursor to the other end instead of staying blocked.',
    },
  },

  // Combat messages (end of turn). Template + per-stat labels.
  // {change} is e.g. "+2" or "-1"; {label} is one of the labels below.
  effectMessageFormat: '{change} {label}',
  effectLabels: {
    attack: 'attack',
    defense: 'defense',
    enemy_attack: 'enemy attack',
    enemy_defense: 'enemy defense',
    hp: 'hit points',
    enemy_hp: 'enemy hit points',
    credit: 'credit',
    maneuver: 'maneuvers',
    strategy: 'strategy',
  },

  // Combat log messages (end of turn), sent one by one to the announcer.
  log: {
    inactive: '{name} is inactive.',
    effects: '{name}: {effects}.',
    discardOne: '{actor} discards {target}{direction}.',
    exileOne: '{actor} exiles {target}{direction}.',
    draw: '{actor} draws {value}.',
    enemyHit: '{enemy} takes {damage} damage.',
    enemyDefeated: '{enemy} is defeated.',
    duoHit: 'Your duo takes {damage} damage.',
    turnStart: 'Start of turn {turn}.',
    perkActivation: '{name} activates: {effects}.',
    listSeparator: ', ',
    listLast: ' and ',
    directions: {
      above: 'above',
      below: 'below',
      left: 'to the left',
      right: 'to the right',
      self: 'itself',
      none: '',
    },
  },

  powerTypes: {
    offensive: 'offensive',
    support: 'support',
    special: 'special',
  },

  rarities: {
    0: 'common',
    1: 'uncommon',
    2: 'rare',
    3: 'epic',
    4: 'legendary',
  },

  powers: {
    helmbutt_power: {
      name: 'helmbutt',
      description: 'Attack +2',
    },
    iron_grip_power: {
      name: 'iron grip',
      description: 'Adjacent offensive powers deal +2 damage.',
    },
    shield_charge_power: {
      name: 'shield charge',
      description: '+1 attack and +1 defense.',
    },
    metalloy_power: {
      name: 'metalloy',
      description: '+2 defense',
    },
    heavy_slam_power: {
      name: 'heavy slam',
      description: '+4 attack and +1 exhaustion status to the first power below.',
    },
    force_palm_power: {
      name: 'force palm',
      description: '+3 attack if an adjacent offensive power is on the same row, +1 attack otherwise.',
    },
    close_protection_power: {
      name: 'close protection',
      description: '+1 defense, and +1 credit per adjacent support power on the same row.',
    },
    impregnable_power: {
      name: 'impregnable',
      description: '+3 defense if your defense is 0, or +1 defense otherwise.',
    },
    lead_boots_power: {
      name: 'lead boots',
      description: '+2 defense and +1 attack if on the ground.',
    },
    iron_will_power: {
      name: 'iron will',
      description: '+1 defense. This power and this area cannot be affected by a negative status.',
    },
    arctic_veil_power: {
      name: 'arctic veil',
      description: '+1 defense, +1 maneuver and +1 freeze status on this area.',
    },
    blizzard_power: {
      name: 'blizzard',
      description: 'If on the surface or sky and you have at least 1 maneuver, +5 attack and -1 maneuver. Otherwise +2 attack.',
    },
    'cool-headed_power': {
      name: 'cool-headed',
      description: '+1 defense if an adjacent power is offensive. Otherwise +1 strategy.',
    },
    frozen_lace_power: {
      name: 'frozen lace',
      description: 'If this area has the freeze status, +3 credit. Otherwise +1 credit.',
    },
    icy_step_power: {
      name: 'icy step',
      description: 'If on the ground, +1 defense and +1 maneuver, and +1 freeze status on this area. Otherwise +1 defense.',
    },
    winter_dress_power: {
      name: 'winter dress',
      description: 'For this area and each adjacent area with the freeze status, +1 credit and +1 defense.',
    },
    gravity_beam_power: {
      name: 'gravity beam',
      description: 'For each power above in the column, +3 attack and +1 anchor status on each area.',
    },
    weightlessness_power: {
      name: 'weightlessness',
      description: 'If on the ground or surface, +1 maneuver. Otherwise +1 strategy. No effect if this area has the anchor status.',
    },
    snow_dance_power: {
      name: 'snow dance',
      description: '+1 credit for each maneuver you have, up to 3.',
    },
    icycle_power: {
      name: 'icycle',
      description: 'If an adjacent area has the freeze status, +3 attack. Otherwise +1 attack. In all cases, +1 freeze status on this area.',
    },
  },

  // Name + description of each status (indexed by id). {compteur} = current
  // stacks, interpolated at display time (see src/ui/format.js).
  statuses: {
    power_exhaustion_status: {
      name: 'exhaustion',
      description: 'Prevents any effect from activating.',
    },
    hero_poison_status: {
      name: 'poison',
      description: 'At the end of the turn, deals {compteur} unblockable damage, then decreases by 1.',
    },
    area_freeze_status: {
      name: 'freeze',
      description: 'Cancels the power in this area if its type is offensive or support.',
    },
    area_anchor_status: {
      name: 'anchor',
      description: 'The power in this area cannot be moved on the board.',
    },
  },

  // Hero names (indexed by nameId).
  heroes: {
    hero_paladium: 'Paladium',
    hero_mindel: 'Mindel',
  },

  // Name + description of each signature (perk), indexed by id.
  perks: {
    rusted_armor_perk: {
      name: 'rusted armor',
      description: '+2 defense at the end of the turn.',
    },
    blue_comet_mark_perk: {
      name: 'blue comet mark',
      description: 'For every 2 of {counter} powers cancelled by an area status, +1 attack.',
    },
  },

  enemies: {
    enemy_dummy:     'Practice Dummy',
    enemy_gros_bras: 'Bruiser',
    enemy_caid:      'Enforcer',
    enemy_nemesis:   'Nemesis',
  },

  game: {
    start: 'The game begins.',
    yourTurn: 'Your turn.',
  },

  gameover: {
    title: 'Game over.',
    win: 'You win.',
    lose: 'You lose.',
    draw: 'Draw.',
    backToMenu: 'Back to menu',
  },

  power: {
    blocked: {
      discard: 'This power cannot be discarded.',
      remove:  'This power cannot be removed from the board.',
      place:   'This power cannot be placed here.',
      draw:    'This power cannot be offered.',
    },
  },

  action: {
    blocked: {
      anchored: 'This power is anchored and cannot be moved.',
      immune: 'This power is immune and cannot receive this status.',
      no_source_power: 'There is no power in this area.',
      out_of_range: 'This area is out of range.',
      no_maneuver: 'You have no maneuvers left.',
    },
  },

  maneuver: {
    no_points:     'You have no maneuvers left.',
    selectTarget:  'Choose a zone to swap with {name}. Arrow keys to navigate, Enter to confirm, Escape to cancel.',
    swapForbidden: 'Swap forbidden',
    swapDone:      'Swap done.',
    cancelled:     'Maneuver cancelled.',
    immovable:     'Immovable',
    selectedSource: 'Selected',
  },

  submenu: {
    close:                'Close',
    validate:             'Confirm',
    selected:             'Selected',
    deselected:           'Deselected',
    refuseMax:            'Maximum reached ({max}).',
    refuseMin:            'Select at least {min} option(s) to confirm.',
    descriptionCount:     '{count}/{max} selection(s)',
    descriptionCountRange: '{count} selection(s) (min {min}, max {max})',
    // Debug test labels.
    testInfoTitle:    'Informative submenu',
    testInfoDesc:     'Three items, navigation only.',
    testSingleTitle:  'Single-choice submenu',
    testSingleDesc:   'Select one and close.',
    testMultiTitle:   'Multiple-choice submenu',
    testMultiDesc:    'Check between 1 and 3 options.',
    testItemA: 'Option Alpha',
    testItemB: 'Option Beta',
    testItemC: 'Option Gamma',
    testItemD: 'Option Delta',
    testItemE: 'Option Epsilon',
    testDone:  'Confirmed:',
  },

  strategy: {
    no_points:     'You have no strategies left.',
    empty:         'No power in this area.',
    no_candidates: 'No replacement available.',
    done:          'Strategy applied.',
    cancelled:     'Strategy cancelled.',
    pickTitle:     'Choose a replacement. Arrow keys to navigate, Enter to confirm, Escape to cancel.',
  },

  zoneSelector: {
    outOfRange:    'Out of range',
    forbidden:     'Forbidden',
    confirmed:     'Zone confirmed',
    cancelled:     'Selection cancelled.',
    testOpen:      'Zone selection test. Arrow keys to navigate, Enter to confirm, Escape to cancel.',
    testForbidden: 'Central zone forbidden',
  },

  // New-game configuration scene.
  newGame: {
    title:              'New game',
    label:              'Game configuration',
    interfaceName:      'Configuration',
    seed:               'Seed: {seed}',
    hero1:              'First hero: {name}',
    hero2:              'Second hero: {name}',
    noneHero:           'None',
    preview:            'Preview: {hp} max HP, {powers} powers',
    launch:             'Start game',
    back:               'Back to menu',
    describeReady:      'Configuration complete. Start the game.',
    describeNeedHeroes: 'Choose {count} more hero(es).',
    seedPickerTitle:    'Choose seed',
    seedRandom:         'Random',
    heroSelectTitle:    'Choose a hero',
    heroSelectClose:    'Cancel',
    heroDetail: {
      name:           'Name: {name}',
      hp:             'Hit points: {hp}',
      startingPowers: 'Starting powers ({count})',
      perk:           'Signature: {name}',
      perkFull:       'Signature: {name} — {description}',
      choose:         'Choose this hero',
      close:          'Close',
    },
    powersTitle: 'Starting powers',
    powerEntry:  '{name} × {count}: {description}',
    powersClose: 'Close',
  },

  // Run hub — Secret base.
  runHub: {
    title:                'Secret base',
    label:                'Secret base',
    name:                 'Secret base',
    interfaceDescription: 'Preparing for day {round}, {type} mission',
    missionRecon:         'reconnaissance',
    missionIntervention:  'intervention',
    missionElimination:   'elimination',
    statusDuo:            '{hero1} and {hero2}: {hp} out of {maxHp} HP, {powers} powers.',
    shopEntry:            'Upgrades ({credit} credit): Buy gadgets, recruit sidekicks, and unlock perks.',
    launchEntry:          'Launch {type} mission against {enemy}.',
    launchEntryFull:      'Launch {type} mission against {enemy}: {description}',
    quit:                 'Back to main menu',
    announceHp:           '{hp} out of {maxHp} HP',
    announceCredit:       '{credit} credit',
    announceThreat:       '{enemy}: {type}, day {round}',
    // Duo menu
    duoMenuTitle:         'Duo {hero1} and {hero2}',
    duoMenuDescription:   'Day {round}.',
    duoHp:                '{hp} out of {maxHp} HP.',
    duoPowers:            '{count} powers in the deck.',
    duoBack:              'Back.',
    // Deck menu
    deckTitle:            '{count} powers',
    deckDescription:      'Displays all powers currently mastered by your duo.',
    deckEntry:            '{name}: {description}',
    // Power detail
    powerType:            'Type: {type}',
    powerRarity:          'Rarity: {rarity}',
  },

  // Combat victory scene.
  victory: {
    title:         'Mission complete',
    message:       'Mission complete.',
    hpRemaining:   '{hp} out of {maxHp} HP remaining.',
    creditsEarned: '{credits} credit(s) earned.',
    continue:      'Continue.',
  },

  // Save management scene.
  saveManager: {
    title:                'Save management',
    label:                'Save management',
    dateLabel:            'Save creation date: ',
    textareaLabel:        'Save content',
    exportBtn:            'Export',
    importBtn:            'Import',
    back:                 'Back',
    exported:             'Save exported to the content field.',
    importQuestion:       'Importing will replace the current save (active run, unlocks and statistics). Do you confirm?',
    importSuccess:        'Save imported successfully.',
    importError:          'Error: invalid or corrupted content. Save unchanged.',
    importVersionMismatch: 'Incompatible format (version {v}). Save unchanged.',
    resetBtn:      'Reset',
    resetQuestion: 'All data (active run, statistics, unlocks) will be permanently erased. Reset?',
    resetSuccess:  'Profile reset.',
  },

  // Generic confirmation scene.
  confirm: {
    title:        'Confirmation',
    yes:          'Yes',
    no:           'No',
    // Labels for debug test (main menu).
    testTitle:    'Confirmation test',
    testQuestion: 'This is a fake test question. Do you confirm?',
  },

  // Run-won placeholder.
  runWon: {
    title:      'Run complete',
    message:    'Congratulations! You defeated the final boss.',
    backToMenu: 'Back to main menu.',
  },

  // Short enemy descriptions (id → description).
  enemyDescriptions: {
    enemy_gros_bras: 'A tough henchman. High endurance, moderate attack.',
    enemy_caid:      'A seasoned lieutenant. Combat-tested with solid resistance.',
    enemy_nemesis:   'The boss. Exceptional endurance and attack power.',
  },

  // Short hero descriptions (id → description).
  heroDescriptions: {
    hero_paladium: 'Defensive hero. High resistance and close-range damage.',
    hero_mindel:   'Control hero. Harnesses cold and gravity to weaken the enemy.',
  },

  // Generic draft/commit editor (DraftEditor.js).
  // These strings are domain-agnostic — not tied to 'options' or 'preferences'.
  draftEditor: {
    validate:   'Confirm: saves the changes made.',
    cancel:     'Cancel: closes the menu, discarding changes.',
    on:         'On',
    off:        'Off',
    pagesLabel: 'Pages',
  },

  // Options menu (first client of DraftEditor).
  options: {
    title:            'Options',
    catAccessibility: 'Accessibility',
    catAudio:         'Audio',
    menuCycling:      'Menu cycling',
    testListChoice:   'Test choice',
    testOptA:         'Option Alpha',
    testOptB:         'Option Beta',
    testOptC:         'Option Gamma',
    testVolume:       'Sound volume',
    volumeFormat:     '{v} %',
  },

  a11y: {
    invalidMove: 'Invalid move.',
  },
};
