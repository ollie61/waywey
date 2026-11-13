// Read-only deployment check: compare every shell asset, redirect and hospital
// package with an immutable Git commit. This does not certify device caches/audio.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const [site, ref = 'HEAD'] = process.argv.slice(2);
if (!site) throw Error('Usage: node scripts/verify_deployment.mjs HTTPS_URL [git-ref]');
const base = new URL(site.endsWith('/') ? site : site + '/');
if (!['http:', 'https:'].includes(base.protocol)) throw Error('HTTP(S) URL required');
const sha = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {encoding: 'utf8'}).trim();
const read = file => execFileSync('git', ['show', `${sha}:${file}`]);
const sw = read('service-worker.js').toString('utf8');
const shell = sw.match(/const SHELL_ASSETS=\[([\s\S]*?)\];/);
if (!shell) throw Error('Cannot find shell asset inventory');
const paths = new Set(['service-worker.js', 'index.html']);
for (const [, asset] of shell[1].matchAll(/"\.\/([^"]+)"/g)) paths.add(asset);
const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', sha], {encoding: 'utf8'}).split('\n');
for (const file of tracked) {
  if (/^hospitals\/[^/]+\/(config|destinations|routes|guide)\.json$/.test(file)
      || /^[^/]+\/index\.html$/.test(file)) paths.add(file);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const results = await Promise.all([...paths].sort().map(async file => {
  try {
    const response = await fetch(new URL(file, base), {cache: 'no-store', signal: AbortSignal.timeout(20000)});
    const actual = Buffer.from(await response.arrayBuffer());
    const expected = read(file);
    return {file, status: response.status, matches: response.ok && actual.equals(expected), sha256: hash(actual)};
  } catch (error) { return {file, matches: false, error: error.message}; }
}));
const failures = results.filter(r => !r.matches);
console.log(JSON.stringify({checkedAt: new Date().toISOString(), site: base.href, commit: sha,
  checked: results.length, passed: results.length - failures.length, failures, results}, null, 2));
if (failures.length) process.exitCode = 1;
