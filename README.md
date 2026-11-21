# Claude Censor

A Chrome extension that replaces unwanted text on every page, in every frame and shadow root, as the page renders.

## Install

Download the **claude-censor-vVERSION.zip** asset from the [latest release](https://github.com/a-Aram-a/Claude-Censor/releases/latest), then extract it into a permanent folder. Do not download GitHub's automatic “Source code” archives: those require a build.

Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the extracted folder containing `manifest.json`. Keep this folder after installation. No development tools are needed.

Updates are manual: extract a newer release over the same folder, click **Reload** on the extension card, and reload open tabs. Use the same folder to preserve the extension's identity and settings.

### Build from source

```sh
npm install
npm run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked** and select this folder.

## Rules

Each rule is `(censored text, safe text, CSS selector)`. Every occurrence of the censored text inside elements matching the selector is replaced with the safe text. An empty selector means everywhere; an empty safe text removes the match.

Matching is:

- **Case-insensitive, case-preserving** — `bad → good` turns `BAD` into `GOOD` and `Bad` into `Good`. An exact match gets the safe text as typed.
- **Whitespace-tolerant** — a space matches any run of spaces, NBSPs, tabs and line breaks.
- **Markup-tolerant** — `b<b>a</b>d` and `b&ZeroWidthSpace;ad` both match `bad`.

### Patterns

Switch `.*` on next to the censored text to make it a regular expression (JavaScript syntax).

- Case is ignored unless the pattern is written as a literal: `/Name/` is exact, `/a.b/s` sets the flags yourself.
- The safe text takes `$1`, `$<name>`, `$&` and `$$`, and is used as typed.
- Invisible characters are skipped as in plain rules. Whitespace is matched as written, so use `\s+` between words.
- With a selector, each matching element is searched on its own: `^` and `$` are its start and end, and `.+` replaces its whole text. Without one, the pattern sees the page text joined as it is in the DOM, so elements with no space between them read as one word.
- A match is looked for within about 1000 characters around a change. A pattern with runaway backtracking will slow every page down; nothing can interrupt it.

Selectors may use raw ids and classes such as `#:r1:`; they are escaped when needed.

Scripts, styles, text areas and editable content are never touched. Only text nodes are edited; elements are left as they are. Turning censoring off, or changing the rules, restores the original text first.

## Packs and order

Rules are grouped into packs. Packs and the rules inside them can be enabled, disabled and reordered by dragging the handle or pressing ↑ ↓ on it. A rule dropped on another pack moves to the end of that pack. Both can be duplicated: a rule copy appears right below the original, and a pack copy starts switched off so it changes nothing until it has been edited.

Rules run top to bottom across the enabled packs:

- A later rule sees what earlier rules wrote, so `alpha → beta` followed by `beta → gamma` turns `alpha` into `gamma`.
- A rule never rewrites its own output or the output of a later rule, so `Acme → Acme [client]` is applied exactly once.

Packs can be exported to a JSON file, one at a time or all together, and imported back. Importing adds packs and never replaces existing ones; it opens in a tab because a file dialog closes the popup. Files carry a format version, so a file from a newer, incompatible release is refused with a message instead of being misread.

## Architecture

```
src/
  shared/
    matcher.js       rule → pattern and replacement, plain or regular expression (pure)
    packs.js         pack model, normalization of untrusted data
    schema.js        data version and upgrades for storage and export files
    transfer.js      JSON export format
    settings.js      chrome.storage access
    selector.js      selector validation and escaping
  content/
    main.js          wires settings to the watcher and the censor
    dom-watcher.js   reports changed nodes in the document and every shadow root
    text-window.js   gathers the text nodes around a changed node
    text-run.js      maps a match in joined text back onto its text nodes
    edit-ledger.js   remembers what each rule wrote and the original text
    censor.js        applies the rules to changed nodes
    shadow-hook.js   page-world hook announcing new shadow roots
  popup/
    popup.js         packs and rules UI
    rule-form.js     rule fields: fill, read, validate
    sortable.js      drag and keyboard reordering, drop zones
    session.js       draft and open pack, kept while the browser runs
    download.js      file download
```

## Development

```sh
npm run watch   # rebuild content scripts on change
npm test        # unit tests + a headless Chrome run of tests/fixture.html
```

Set `CHROME_BIN` if Chrome is not in the default macOS location.

## Releases

GitHub Actions runs the unit and headless Chrome tests on pushes to `main`, pull requests, and version tags. Missing Chrome fails CI rather than skipping the DOM test. A passing tag build publishes a runtime-only ZIP and SHA-256 checksum to GitHub Releases. No repository secrets or manual GitHub settings are required.

To publish, set the same version in `manifest.json`, `package.json`, and `package-lock.json`, commit and push, then push the matching tag:

```sh
git tag v1.0.0
git push origin v1.0.0
```

Use a new version and tag for each release. Tags must exactly match `v` plus the manifest version. Releases do not publish to the Chrome Web Store.

To package a tested build locally (Python 3 required):

```sh
npm ci
npm test
python3 scripts/package.py
```

Artifacts are written to `release/`. Packaging preserves the popup's ES modules and includes compiled content scripts, shared modules, and PNG icons. Development dependencies, tests, and engine source files are excluded. The browser test exercises the DOM engine, not the installed extension; manually check the popup, storage, drag reordering, and import dialog before tagging.
