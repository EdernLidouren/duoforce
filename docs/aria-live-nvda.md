# ARIA live & NVDA — comportements documentés

## Problème rencontré : double lecture + relecture intégrale du journal

### Symptôme
À partir du tour 2, après la lecture des effets des pouvoirs, NVDA relisait
l'intégralité du journal de combat (17+ entrées alors que la limite visible
est 15). Le problème s'aggravait à chaque tour.

### Cause identifiée
`#live-log` (`role="log"`, `aria-live="polite"`) **accumule** tous les `<div>`
ajoutés par `announce.enqueue` sans jamais être vidé. À chaque tour, de
nouveaux éléments sont ajoutés aux anciens. Quand NVDA commence à lire une
région `role="log"` qui grossit en cours de lecture (plusieurs ajouts rapides
en boucle synchrone), il relit le contenu accumulé depuis le début — ou du
moins depuis sa dernière position de lecture dans la région.

Au tour 2, `#live-log` contient les messages du tour 1 + ceux du tour 2,
d'où les 17+ entrées entendues.

### Solution
Vider `#live-log` via `announce.clearLog()` **en début de chaque résolution
de tour** (avant les appels à `enqueue`). NVDA ne voit alors que les messages
du tour courant et les lit une seule fois, dans l'ordre.

```js
// src/scenes/combat.js — endTurn()
context.announce.clearLog();
const report = resolveTurn(state);
// … pushMessage() pour chaque message du tour …
```

```js
// src/ui/announce.js
function clearLog() {
  const log = document.getElementById('live-log');
  if (log) log.replaceChildren(); // replaceChildren() sans argument = vide le nœud
}
```

`replaceChildren()` sans argument vide le conteneur sans déclencher
d'annonce NVDA (seules les *additions* sont pertinentes pour `role="log"`).

---

## Pièges documentés

### `role="log"` + `aria-live="polite"` explicite
L'élément `#live-log` porte les deux. En théorie, `role="log"` implique déjà
`aria-live="polite"`. L'attribut explicite est redondant mais inoffensif.
À surveiller si un lecteur d'écran se comportait différemment.

### Mutations DOM dans `role="application"`
Les zones de l'interface ont `role="group"` (posé par `createZoneController`).
En mode application (`role="application"`), NVDA ne lit **pas** automatiquement
les mutations DOM sur les `role="group"` — les changements de `textContent`
dans les zones duo/ennemi/plateau ne déclenchent pas d'annonce.
Exception : `role="status"` (zone `refs.actions.outcome`) est une région live
implicite (`aria-live="polite"`, `aria-atomic="true"`) : toute modification
de son contenu est lue.

### Zone historique sans ARIA
`historyZoneEl` (la `<section>` englobant le `<ul>` de l'historique) ne reçoit
**aucun** `role` ni `aria-label` (option `noAria: true` du contrôleur de zones).
Cette neutralité évite que NVDA traite des mutations dans cette zone comme des
événements live. La navigation dans l'historique est assurée par
`historyNav` + annonces via `announce.polite`, pas via une région live.

### `announce.polite` vs `announce.enqueue`
- `polite` (régions `#live-a` / `#live-b` alternées, `aria-atomic="true"`) :
  lecture immédiate du **dernier** message ; les précédents non encore lus
  sont écrasés. Idéal pour les annonces de navigation (zone active, curseur…).
- `enqueue` (`#live-log`, `role="log"`) : mise en file, chaque ajout est lu
  dans l'ordre. Idéal pour les messages séquentiels (effets de pouvoirs).
  **Vider la région entre deux séquences avec `clearLog()`.**
