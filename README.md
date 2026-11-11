# Claude Censor

A Chrome extension that replaces unwanted text on every page, in every frame and shadow root, as the page renders.

## Install

```sh
npm install
npm run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked** and select this folder.

## Rules

Each rule is `(CSS selector, censored text, safe text)`. Every occurrence of the censored text inside elements matching the selector is replaced with the safe text. An empty selector means everywhere; an empty safe text removes the match.

Matching is:

- **Case-insensitive, case-preserving** — `bad → good` turns `BAD` into `GOOD` and `Bad` into `Good`. An exact match gets the safe text as typed.
- **Whitespace-tolerant** — a space matches any run of spaces, NBSPs, tabs and line breaks.
- **Markup-tolerant** — `b<b>a</b>d` and `b&ZeroWidthSpace;ad` both match `bad`.

Scripts, styles, text areas and editable content are never touched. Only text nodes are edited; elements are left as they are.

## Architecture

```
src/
  shared/
    matcher.js       rule → pattern and case-preserving replacement (pure)
    settings.js      chrome.storage access
    selector.js      selector validation
  content/
    main.js          wires settings to the watcher and the censor
    dom-watcher.js   reports changed nodes in the document and every shadow root
    text-window.js   gathers the text nodes around a changed node
    text-run.js      maps a match in joined text back onto its text nodes
    censor.js        applies the rules to changed nodes
    shadow-hook.js   page-world hook announcing new shadow roots
  popup/             settings UI
```

## Development

```sh
npm run watch   # rebuild content scripts on change
npm test        # unit tests + a headless Chrome run of tests/fixture.html
```

Set `CHROME_BIN` if Chrome is not in the default macOS location.
