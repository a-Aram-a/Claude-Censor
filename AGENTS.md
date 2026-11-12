# Claude Censor

Chrome MV3 extension that replaces text on every page in real time, driven by user rules `(censored text, safe text, CSS selector)` grouped into packs. Plain JavaScript ES modules, no framework, one dev dependency (esbuild).

`README.md` holds the user-facing behaviour and the file map. Read it first; this file only adds what an agent needs to change the code safely.

## Commands

```sh
npm run build   # bundle src/content/{main,shadow-hook}.js into dist/ (git-ignored, referenced by manifest.json)
npm test        # build, then node --test: unit tests + tests/dom.test.js driving headless Chrome over tests/fixture.html
```

- Content scripts must be rebuilt after any change under `src/content` or `src/shared`. The popup loads `src/popup` directly as ES modules and needs no build.
- `tests/dom.test.js` skips itself when Chrome is missing (`CHROME_BIN` overrides the macOS default path). A skip is not a pass: say so.
- There is no automated test of the real extension. The popup, storage sync, drag reordering and the file dialog can only be checked by loading the folder unpacked at `chrome://extensions`. Report what was and was not verified.

## Product requirements that must keep holding

1. Works in every tab, every frame (`all_frames` + `match_origin_as_fallback`) and every shadow root, open, closed or declarative, with one global switch.
2. Censors both initial HTML and later JS changes, before paint where possible. Mutations are handled synchronously in the observer callback; do not debounce or defer them.
3. Minimal intervention: only `Text` node data is edited (`replaceData`). Never add, remove, move or wrap elements. The single page-world change is the `attachShadow` wrapper in `shadow-hook.js`.
4. Matching is case-insensitive and case-preserving, treats any whitespace run (NBSP included) as one space, ignores default-ignorable code points, and finds matches split across text nodes and tags.
5. Zero work on a page when censoring is off or no rule is active.
6. Never touch `script`, `style`, `noscript`, `textarea` or `contenteditable` text.

## How the engine fits together

`DomWatcher` reports changed nodes → `Censor` asks `collectWindow` for the text nodes around each one → `TextRun` joins them and maps regex matches back to per-node segments → `EditLedger` performs every write.

Invariants that are easy to break:

- **All text writes go through `EditLedger.replace`.** It stores each node's original text and which rule (by rank = index in the flattened active rule list) wrote which span. This is what makes rescans idempotent, lets safe text contain the censored text, and restores originals on disable or rule change.
- **Rule order semantics:** rules run top to bottom over enabled packs. A match is rejected if it includes any character written by a rule of the same or later rank. Empty replacements leave no span, which is what lets `fofooo` collapse fully under `foo → ""`.
- **`main.js` calls `ledger.invalidate()` on every settings change.** Stale records are restored lazily by `ledger.refresh` the next time a node is scanned, so a reconfigure is always "restore, then re-apply from the original".
- **`DomWatcher` discards its own mutations with `takeRecords()` after the handler runs**, and drains pending records before handling a shadow-attach event. Skipping either causes loops or lost page mutations.
- **Matches are applied in reverse document order within a pass**, and `TextRun` is rebuilt after each pass. Segment offsets are only valid under that order.
- **`collectWindow` context is capped** (`MAX_CONTEXT_NODES`, marked with a `ponytail:` comment). It is a deliberate ceiling, not a bug.
- `shared/matcher.js`, `shared/packs.js` and `shared/transfer.js` stay free of DOM and `chrome` APIs so they run under `node --test`.

## Data

- `chrome.storage.local`: `{ enabled, packs: [{ name, enabled, rules: [{ censored, safe, selector }] }] }`. A legacy flat `rules` key is still read as a pack named "My rules" in `shared/settings.js`.
- `chrome.storage.session`: popup-only state (`draft`, `openPack`). Keep popup state out of `local`, because every `local` write reconfigures every tab.
- Anything read from storage or an imported file passes through `normalizePacks`. Keep it the only trust boundary.
- Export format: `{ format: "claude-censor", version: 1, packs }`. Bump `version` and keep reading old files if the shape changes.

## Popup

- Vanilla DOM with `<template>` elements; state is the `packs` array of stable objects, and handlers close over those objects rather than list indices.
- Re-render only on structural change. Field edits commit on `change` and must not rebuild the list, or focus is lost.
- A rule is saved only once valid, so a half-typed rule never reaches pages.
- `?popup` in the URL (set in `manifest.json`) selects popup layout; the same page without it is the tab view. Import always happens in the tab view because a file dialog can close the popup.

## Conventions

- Conventional commits, concise, one concern each. No AI or Claude attribution in commit messages or trailers.
- No comments that restate code. Only non-obvious "why" notes.
- No new dependencies and no build step for the popup without a clear need. Prefer platform features (native validation, `<details name>`, `light-dark()`).
- Minimum Chrome is set in `manifest.json` (`minimum_chrome_version`); raise it when using a newer API.
- Every behaviour change gets a case in `tests/fixture.html` + `tests/dom.test.js` (DOM) or a unit test (pure logic). The fixture writes its results base64-encoded so the censor under test cannot rewrite them.

## Known limits and open ideas

- Attributes (`placeholder`, `alt`, `title`) and input values are not censored.
- Text that a page copies out of already-censored DOM (for example `innerHTML +=`) has no ledger history, so self-containing rules apply to it again.
- Rules cannot be dragged between packs; there is one new-rule draft shared by all packs; no per-rule enable switch.
- No homoglyph or Unicode-normalization matching.

## Keeping this file useful

Update this file in the same change whenever you alter a command, an invariant, the storage or export shape, a convention, or a known limit listed here. Remove entries that stop being true rather than leaving them. Keep it short: if something is derivable from the code or already in `README.md`, link to it instead of repeating it.
