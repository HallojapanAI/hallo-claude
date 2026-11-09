// Test cấu hình công ty dùng chung (shared/company.json + company.mjs): node --test tests/
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { INTEGRATION, PROTECTED, RELEASE, company, refIdRegex, repoByAlias, repoInfo, repoKind, repoNames, requiredRepos } from '../shared/company.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

test('company.json: đủ trường bắt buộc, repo có kind/check', () => {
  for (const k of ['org', 'marketplace', 'pluginsRepo', 'kb', 'kbMarker', 'branches', 'refIds', 'repos']) assert.ok(k in company, k);
  assert.ok(company.repos[company.kb], 'kb phải là một repo');
  assert.ok(company.repos[company.pluginsRepo], 'pluginsRepo phải là một repo');
  for (const [name, r] of Object.entries(company.repos)) {
    assert.ok(r.kind, `${name}.kind`);
    assert.equal(typeof r.check, 'string', `${name}.check`);
  }
  assert.ok(PROTECTED.has(INTEGRATION) && PROTECTED.has(RELEASE));
});

test('repoByAlias / repoKind / repoInfo', () => {
  assert.equal(repoByAlias('api'), 'hallo-api');
  assert.equal(repoByAlias('hallo-web'), 'hallo-web');
  assert.equal(repoByAlias('unknown'), 'unknown');
  assert.equal(repoKind('hallo-api'), 'api');
  assert.equal(repoKind('nope'), null);
  assert.equal(repoInfo('nope').kind, 'other');
  assert.ok(requiredRepos.length < repoNames.length, 'hallo-claude là optional');
});

test('refIdRegex bắt HJ-/RV- trong tên nhánh', () => {
  assert.equal('feat/HJ-022-qr-revoke'.match(refIdRegex())[1], 'HJ-022');
  assert.equal('fix/rv-002-x'.match(refIdRegex())[1].toUpperCase(), 'RV-002');
  assert.equal('chore/bump'.match(refIdRegex()), null);
});

test('mọi plugin khai báo company.json + company.mjs trong metadata.shared và bản chép khớp', () => {
  for (const name of readdirSync(join(ROOT, 'plugins'))) {
    const manifest = join(ROOT, 'plugins', name, '.claude-plugin', 'plugin.json');
    if (!existsSync(manifest)) continue;
    const shared = JSON.parse(readFileSync(manifest, 'utf8')).metadata?.shared ?? [];
    for (const f of ['company.json', 'company.mjs']) {
      assert.ok(shared.includes(f), `${name}: thiếu ${f} trong metadata.shared`);
      assert.equal(readFileSync(join(ROOT, 'plugins', name, 'scripts', f), 'utf8'), readFileSync(join(ROOT, 'shared', f), 'utf8'), `${name}/scripts/${f} lệch shared/`);
    }
  }
});
