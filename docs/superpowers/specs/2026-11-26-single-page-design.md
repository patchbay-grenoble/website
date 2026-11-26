# Single-page website - design

Date: 2026-11-26
Status: approved in conversation, pending spec review

## Goal

Replace the separate pages (projets, agenda, flux, à propos) with one page: everything on `/`, a menu of anchor links, and modals where content is long. Feedback from Ferloch (2026-11-24): "tout sur la même page, des modales là où il faut, menu avec des ancres".

## Page structure (`/`)

| Anchor | Section | Content |
|-|-|-|
| (top) | hero | two-line logo, pitch, buttons pointing to `#agenda` and `#collectif` |
| `#carte` | Cartographie du live | current map; the card's "Voir la fiche du projet" opens the project modal |
| `#agenda` | Agenda | all upcoming dates; past dates folded in a native `<details>` "Dates passées" |
| `#flux` | Flux | 5 latest publications, plus a "Voir tout le flux" button opening a modal with the full feed (40 items) |
| `#collectif` | Le collectif | short pitch and contact; "En savoir plus" opens a modal with the full text of today's `/a-propos/` page |

- Agenda data comes from `evenements()` (`src/lib/events.ts`), feed data from `fil()` (`src/lib/flux.ts`), both unchanged
- Empty states are kept: no upcoming date, empty feed

## Menu

- Links: `carte`, `agenda`, `flux`, `collectif`, as `/#carte`, `/#agenda`, `/#flux`, `/#collectif` so they also work from `/projets/<slug>/`
- `aria-current` logic in `Base.astro` and the `.haut nav a[aria-current]` rule are removed (no per-page match left)
- Smooth scrolling with `scroll-behavior: smooth`, disabled under `prefers-reduced-motion: reduce`
- `scroll-margin-top` on sections so titles do not stick to the top edge

## Modals

- Native `<dialog>`, opened by `<button command="show-modal" commandfor="...">`, closed by `<button command="close" commandfor="...">` and Escape
- No JavaScript needed to open or close them
- Invoker Commands are Baseline since 2025-12-12: Chrome and Edge 135, Firefox 144, Safari 26.2 (web-features explorer)
- `<dialog>` is used instead of popover because the content is long and needs the modal focus trap and a backdrop; the map card stays a popover
- Style follows the map card: `2.5px` border, pink offset shadow, `::backdrop`, `max-height` with internal scrolling, close button at the top right
- Modals on `/`: one per project, one for the full feed, one for the full collective text

## Project modal and URL

- New component `src/components/FicheProjet.astro` renders name, tagline, image if any, presentation text, links and latest publications (`publicationsProjet`, cached at build time)
- It is used in the project `<dialog>` on `/` and on `/projets/<slug>/`
- Dialog id: `fiche-<slug>`; the prefix avoids collisions with section ids if a project is named like a section
- `/projets/<slug>/` stays a static page, outside the menu, for sharing (link previews) and as a no-JS fallback; it gets a "Retour à la carte" link to `/#carte`
- Feed items keep linking to `/projets/<slug>/` (works without JavaScript)

## Hash sync (only JavaScript added)

Inline script on `/`, about 15 lines:

- When a project dialog opens, set `#fiche-<slug>` with `history.replaceState` (no new history entry); when it closes, remove the hash
- On load, if the hash matches a `<dialog>` id, open it with `showModal()`
- Ignore hashes that do not match a `<dialog>` element
- Without JavaScript, modals still open and close; only the hash is unused

## Old URLs

| Old URL | Becomes |
|-|-|
| `/agenda/` | redirect to `/#agenda` |
| `/flux/` | redirect to `/#flux` |
| `/a-propos/` | redirect to `/#collectif` |
| `/projets/` | redirect to `/#carte` |
| `/projets/<slug>/` | kept |

- Tested 2026-11-26: Astro `redirects` accepts `/#agenda` as destination, but its generated page starts with a lowercase `<!doctype html>`, which fails html-validate (`doctype-style`, enabled by the `recommended` preset)
- Implemented instead with one dynamic route `src/pages/[ancienne].astro` that renders a `<meta http-equiv="refresh">` page per old URL; this markup passes html-validate

## Removed

- Pages `src/pages/agenda.astro`, `src/pages/flux.astro`, `src/pages/a-propos.astro`, `src/pages/projets/index.astro` (content moves to `/`)
- CSS rules `.deux` and `.liste-projets` (only used by the projects list page) and `.haut nav a[aria-current]`

## Testing

- New `bun test` on the build output: every map point on `/` has a matching `<dialog id="fiche-<slug>">`, and every `/projets/<slug>/index.html` exists
- Existing CI: `astro check`, unit tests, build, html-validate, lychee
- Add `--include-fragments` to the lychee step in `.github/workflows/ci.yml` so menu anchors pointing to a missing id fail the build; without it lychee does not check `#` fragments (lychee README)
- Manual pass in Chromium and Firefox: menu and scrolling, each modal, Escape, opening from `/#fiche-<slug>`, old URLs redirecting
