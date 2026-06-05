# Duoforce

Jeu de stratégie tour par tour, **JavaScript vanilla** (modules ESM), navigateur
pur — sans framework ni bundler.

## Principes

- **Accessibilité de premier ordre.** Le jeu est jouable au lecteur d'écran
  (NVDA) via une navigation clavier custom et des régions ARIA live. Ce n'est pas
  une option.
- **Séparation stricte logique / rendu.**
  - `src/engine/*` : logique de jeu **pure**, aucun accès au DOM. Testable seul.
  - `src/ui/*` : rendu et interactions DOM uniquement.
  - `src/scenes/*` : coordonnent engine + ui ; ne contiennent pas de règles.

## Arborescence

```
duoforce/
├── index.html              # lang=fr, viewport, régions ARIA live, import de main.js (module)
├── main.js                 # bootstrap + câblage du routeur de scènes
├── css/
│   └── style.css           # styles + utilitaires a11y (.visually-hidden, focus visible)
├── src/
│   ├── router.js           # routeur de scènes (table, mount/unmount, unidirectionnel)
│   ├── engine/             # logique pure — AUCUN DOM
│   │   ├── state.js        # modèle d'état + transitions pures
│   │   ├── board.js        # représentation du plateau
│   │   ├── rules.js        # règles + validation des coups
│   │   └── turn.js         # gestion du tour par tour
│   ├── ui/                 # rendu + DOM uniquement
│   │   ├── render.js       # état → DOM
│   │   ├── input.js        # inputs clavier custom → intentions
│   │   └── announce.js     # messages vers les régions ARIA live
│   └── scenes/             # un écran = une scène { mount, unmount }
│       ├── menu.js
│       ├── game.js
│       └── gameover.js
└── data/
    └── languagepacks/      # packs de langue (chargés dynamiquement)
        ├── index.js        # registre + chargeur
        ├── fr/index.js
        └── en/index.js
```

## Routeur de scènes

Table de scènes enregistrées par nom. Une scène est un objet `{ mount(context),
unmount() }`. Le routeur garde la scène active en mémoire : à chaque navigation,
il appelle `unmount()` sur la sortante puis `mount(context)` sur l'entrante.
Pas d'historique, pas d'URL — navigation **unidirectionnelle pilotée par le code**
via `router.go(name)`.

## Lancer

Le projet n'a **aucune dépendance** (ni Node, ni npm, ni bundler). Il suffit d'un
serveur statique : les modules ESM exigent `http://`, pas `file://`.

Avec Python (déjà présent sur la machine) :

```sh
python -m http.server 8000
```

puis ouvrir <http://localhost:8000/> dans le navigateur.

### En développement : `serve.py` (sans cache)

`python -m http.server` n'envoie aucun en-tête `Cache-Control`. Pendant que vous
éditez, le navigateur peut alors continuer à servir d'**anciennes versions** des
modules ES (cache heuristique) — symptôme typique : une propriété récemment
ajoutée apparaît `undefined`. Pour l'éviter, un petit serveur de dev sans cache
est fourni :

```sh
python serve.py 8000
```

Il force `Cache-Control: no-store` ; chaque rechargement repart des fichiers à
jour. Si vous avez déjà du cache, faites un rechargement forcé (Ctrl+F5) une fois.
Pour un simple essai, `python -m http.server` reste suffisant.
