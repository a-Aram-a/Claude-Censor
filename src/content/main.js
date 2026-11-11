import { loadSettings, onSettingsChanged } from '../shared/settings.js';
import { Censor } from './censor.js';
import { DomWatcher } from './dom-watcher.js';

let watcher = null;

function configure({ enabled, rules }) {
  watcher?.stop();
  watcher = null;

  const censor = new Censor(enabled ? rules : []);
  if (censor.isIdle) return;

  watcher = new DomWatcher((dirty) => censor.censor(dirty));
  watcher.start();
}

loadSettings().then(configure);
onSettingsChanged(configure);
