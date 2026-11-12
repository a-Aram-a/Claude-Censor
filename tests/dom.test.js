import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const CHROME =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FIXTURE = new URL('./fixture.html', import.meta.url).href;

const EXPECTED = {
  title: 'A nice thing title',
  static: 'A nice thing here, kept',
  case: 'NICE THING, Nice thing, nice thing',
  spaces: 'nice thing',
  tags: 'nice thing',
  tagsStructure: '<b></b><i></i><span></span>',
  invisible: 'nice thing',
  blocks: 'nice thing',
  nested: 'a  b',
  unscoped: 'secret',
  scoped: '[redacted] [REDACTED]',
  alsoScoped: '[redacted]',
  editable: 'bad word',
  textarea: 'bad word',
  script: "const untouched = 'bad word';",
  declarative: 'nice thing',
  openShadow: 'nice thing and a [redacted]',
  closedShadow: 'nice thing',
  dynamic: 'nice thing',
  split: 'nice thing',
  data: 'now a nice thing',
  joined: 'nice thing',
  raw: 'escaped escaped raw',
  tagged: 'tagged [x] or tagged [x]',
  chain: 'gamma gamma ',
  order: 'omega final ',
  shrink: 'ab ',
  orphaned: 'a bad word after reload',
  restored:
    'A bad word here, kept|bad word|tagged or tagged|a fofooo b|bad word and a secret|bad word',
};

test('censors a live page', { skip: !existsSync(CHROME) && 'Chrome not found' }, () => {
  const dom = execFileSync(
    CHROME,
    ['--headless', '--disable-gpu', '--virtual-time-budget=2000', '--dump-dom', FIXTURE],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const [, results] = dom.match(/<pre id="results">(.*?)<\/pre>/s);
  const actual = JSON.parse(decodeURIComponent(atob(results)));
  assert.deepEqual(actual, EXPECTED);
});
