"""Create a reproducible, dependency-free extension ZIP from a tested build."""
import hashlib
import json
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / 'manifest.json').read_text())
version = manifest['version']
if len(sys.argv) > 1 and sys.argv[1] != f'v{version}':
    sys.exit(f'Tag must be v{version} to match manifest.json')
for filename in ('package.json', 'package-lock.json'):
    if json.loads((ROOT / filename).read_text())['version'] != version:
        sys.exit(f'{filename} version must match manifest.json')

files = [ROOT / 'manifest.json']
for directory in ('dist', 'src/popup', 'src/shared', 'icons'):
    files.extend(path for path in (ROOT / directory).rglob('*')
                 if path.is_file() and path.suffix in ('.js', '.html', '.css', '.png'))
required = [path for script in manifest['content_scripts'] for path in script['js']]
required.extend(manifest['icons'].values())
required.append(manifest['action']['default_popup'].split('?')[0])
for filename in required:
    if ROOT / filename not in files:
        sys.exit(f'Missing runtime file: {filename}; run npm run build first')

output = ROOT / 'release'
output.mkdir(exist_ok=True)
archive = output / f'claude-censor-v{version}.zip'
with ZipFile(archive, 'w') as bundle:
    for path in sorted(files):
        entry = ZipInfo(path.relative_to(ROOT).as_posix(), (2020, 1, 1, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, path.read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(archive)
