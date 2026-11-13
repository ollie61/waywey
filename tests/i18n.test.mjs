import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {I18N, PLAYBACK_UI, QR_UI, OUTDOOR_UI} from '../js/i18n.js';

test('every selectable visitor language has all required route and control labels', async () => {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  const select = html.match(/<select id="visitorLang"[\s\S]*?<\/select>/)[0];
  const languages = [...select.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(languages.sort(), Object.keys(I18N).sort());
  for (const [name, table] of Object.entries({I18N, PLAYBACK_UI, QR_UI, OUTDOOR_UI})) {
    for (const lang of languages) {
      for (const key of Object.keys(table.en)) {
        assert.equal(typeof table[lang]?.[key], 'string', `${name}.${lang}.${key}`);
        assert.ok(table[lang][key].trim(), `${name}.${lang}.${key} is empty`);
      }
    }
  }
});
