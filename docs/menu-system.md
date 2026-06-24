# Menu System

## Architecture

Three-level hierarchy — all DOM/lifecycle code lives in `src/ui/menus/`:

```
AbstractMenu          — base: DOM rendering, keyboard routing, ARIA live
  └─ LinearMenu       — vertical or horizontal single-axis navigation
       └─ SubMenu     — three-mode overlay (informative / single_choice / multiple_choice)
```

Scenes configure instances via option objects; they don't subclass the menus.

---

## Item model

```js
{ id: string, label: string, onSecondary?: Function }
```

- `id` — stable identifier, decoupled from the displayed label.
- `label` — text rendered in the DOM and announced by the screen reader.
- `onSecondary(item, index)` — called when Space or right-click fires on this item.
  If absent, the secondary action does nothing (safe default).

---

## Input mapping

| Key / action | Intent | Effect |
|---|---|---|
| Arrow keys, Home, End | MOVE_* | Navigate between items |
| Enter | CONFIRM | Primary action (confirm, select) |
| Space | CONFIRM_SECONDARY | Secondary action (context, toggle) |
| Escape | CANCEL | Cancel / close |
| Backspace | DESCRIBE | Announce interface name + description |

**Note:** Space no longer replicates Enter. Items without `onSecondary` silently ignore Space.
This is deliberate; SubMenu overrides `confirmSecondary` in `multiple_choice` mode to treat Space as a toggle (same as Enter).

---

## Backspace — interface description

Every menu can expose a name and a description that Backspace announces
via the ARIA live region (`polite`).

```js
new LinearMenu({
  interfaceName: 'Board',
  interfaceDescription: 'Navigate with arrow keys, Enter to activate.',
  ...
});
```

`interfaceDescription` may be a `() => string` function for dynamic content
(e.g. SubMenu announces the current selection count in `multiple_choice` mode).

The announced text is: `"{interfaceName} : {interfaceDescription}"`, or just
whichever is non-empty if only one is set.

---

## SubMenu

```js
import { SubMenu } from '../ui/menus/SubMenu.js';

const sub = new SubMenu({
  container,
  announce,
  strings,           // language pack — used for default labels
  mode,              // 'informative' | 'single_choice' | 'multiple_choice'
  items,             // data items  { id, label }
  min,               // multiple_choice only — minimum selections (default 0)
  max,               // multiple_choice only — maximum selections (default Infinity)
  closeLabel,        // optional — if omitted, no close entry is added
  onClose,           // called when user closes (close entry or Escape)
  validateLabel,     // multiple_choice only — label for the Validate entry
  onConfirm,         // single_choice: (item, index); multiple_choice: (Array<{item,index}>)
  interfaceName,     // announced by Backspace
  interfaceDescription, // static string or () => string
  title, ariaLabel,  // passed through to AbstractMenu / DOM
});

sub.mount();
// ... later, from onClose or onConfirm:
sub.unmount();
```

### Modes

#### `informative`
Navigation only. Enter / Space on data items does nothing. Useful for
read-only lists (help text, status reports). A close entry or Escape exits.

#### `single_choice`
Enter / left-click on a data item calls `onConfirm(item, index)` and
immediately closes (calls `onClose`). No validate entry.

#### `multiple_choice`
Enter / Space / left-click toggles the selection of data items.
- Selected items are prefixed with `"Sélectionné - "` (or `strings.submenu.selected`)
  both in the DOM and in ARIA announcements.
- Exceeding `max`: refuses with `strings.submenu.refuseMax` (no toggle).
- A **Validate** entry is appended to the list. Confirming it:
  - If selections < `min`: refuses with `strings.submenu.refuseMin`.
  - Otherwise: calls `onConfirm(Array<{item, index}>)` then `onClose`.
- Backspace announces the selection count via `interfaceDescription` (auto-generated
  when mode is `multiple_choice`; pass your own to override).

### Close entry and Escape

Escape always calls `onClose` (if provided), regardless of mode.
The close entry (when `closeLabel` is given) does the same.
The caller is responsible for calling `sub.unmount()` inside `onClose`.

### Lifecycle

SubMenu does **not** unmount itself. The caller (scene or parent menu) must:
1. Call `sub.unmount()` inside `onClose` (and/or `onConfirm` if the flow ends).
2. Remount whatever came before.

---

## Localization keys (`strings.submenu`)

| Key | Default (fr) | Purpose |
|---|---|---|
| `close` | `'Fermer'` | Close entry label |
| `validate` | `'Valider'` | Validate entry label (multiple_choice) |
| `selected` | `'Sélectionné'` | Prefix for selected items |
| `deselected` | `'Désélectionné'` | Announced when item deselected |
| `refuseMax` | `'Maximum atteint ({max}).'` | Refuses when max exceeded |
| `refuseMin` | `'Sélectionnez au moins {min} option(s) pour valider.'` | Refuses validate below min |
| `descriptionCount` | `'{count}/{max} sélection(s)'` | Backspace description when min === max |
| `descriptionCountRange` | `'{count} sélection(s) (min {min}, max {max})'` | Backspace description otherwise |
| `testInfoTitle` | `'Sous-menu informatif'` | Debug test — informative mode |
| `testSingleTitle` | `'Sous-menu choix unique'` | Debug test — single_choice mode |
| `testMultiTitle` | `'Sous-menu choix multiples'` | Debug test — multiple_choice mode |

---

## Debug tests

When `debug.enabled` and `debug.showTestCombat` are both `true`, the main menu
exposes three additional entries that open each SubMenu mode with dummy data:

- **Test sous-menu informatif** — 5 items, navigate only, close entry.
- **Test sous-menu choix unique** — select one item and auto-close.
- **Test sous-menu choix multiples** — toggle 1–3 items out of 5, Validate or close.

Test with Backspace on each to hear the interface description. Use NVDA to
verify that selection announcements, refuse messages, and close/validate flows
are read correctly.
