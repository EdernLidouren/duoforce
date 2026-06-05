# Project: [Duo force]

## Overview
Turn-based strategy game in vanilla JS, browser-only.
No framework, no bundler, no npm dependencies.
ES native modules (`import`/`export`) only.

## Core constraint: accessibility
This game must work fully with screen readers (NVDA).
- All gameplay driven by keyboard inputs (keydown listener, virtual cursor)
- ARIA live regions handle all dynamic announcements
- Mouse/visual layer is secondary — never the only way to do something
- The engine must never know the UI exists

## Architecture
Strict separation between engine (no DOM) and ui (DOM only).

## Scene router convention
Registered scenes are objects with `mount()` and `unmount()`.
The router holds the active scene in memory, calls `unmount()` on the
previous one and `mount()` on the new one.
No history, no URL routing, code-driven navigation only.

## Code conventions
- Language: English (variables, functions, comments)
- Game content (hero names, power descriptions, UI strings) are string Id for easier localization.
- No classes unless clearly justified — prefer plain objects and functions
- Each module exports explicitly what it exposes, nothing else
- Stubs and empty functions are acceptable during scaffolding phases

## What never to do
- No DOM access from anything inside `engine/`
- No `innerHTML` for game state rendering — use `textContent` or DOM API
- No framework, no build step, no package.json unless explicitly asked
- Do not implement game logic speculatively — wait for explicit instructions
- No Node.js, no server-side tooling of any kind
- The game runs by opening index.html directly in a browser
  or via a simple Python local server (`python -m http.server`)
- No package.json, no node_modules, no npm/npx commands ever

## Language
- Code, comments, identifiers: English
- Conversation with the user: always match the user's language