import { activeRules } from '../shared/packs.js';
import { loadSettings, onSettingsChanged } from '../shared/settings.js';
import { Censor } from './censor.js';
import { DomWatcher } from './dom-watcher.js';
import { EditLedger } from './edit-ledger.js';

const ledger = new EditLedger();
let watcher = null;

function configure({ enabled, packs }) {
  const censor = new Censor(enabled ? activeRules(packs) : [], ledger);
  const wasWatching = Boolean(watcher);
  watcher?.stop();
  watcher = null;
  if (censor.isIdle && !wasWatching) return;

  ledger.invalidate();
  const next = new DomWatcher((dirty) => censor.censor(dirty));
  next.start();
  if (censor.isIdle) next.stop();
  else watcher = next;
}

loadSettings().then(configure);
onSettingsChanged(configure);
