// Test bộ bảo mật dùng chung: shared/security (secret-scan, harden).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addedLines, parseRules, scanLines } from '../shared/security/secret-scan.mjs';
import { withIgnoreBlock } from '../shared/security/harden.mjs';

const SEC = new URL('../shared/security/', import.meta.url).pathname;
const config = parseRules(readFileSync(join(SEC, 'gitleaks.toml'), 'utf8'));
const scan = (file, text) => scanLines(file, text.split('\n').map((t, i) => ({ n: i + 1, text: t })), config);
// Secret giả dựng lúc chạy để chính file test không bị gitleaks bắt.
const fake = (...parts) => parts.join('');

test('gitleaks.toml đọc được: đủ rule riêng và allowlist', () => {
  const ids = config.rules.map((r) => r.id);
  for (const id of ['hallo-url-password', 'hallo-env-secret', 'hallo-openai-key', 'hallo-personal-path', 'hallo-personal-email'])
    assert.ok(ids.includes(id), id);
  assert.ok(config.allow.regexes.length >= 3);
  // Mọi regex chạy được trong JS (cùng file dùng cho gitleaks/Go).
  for (const r of config.rules) assert.ok(r.regex instanceof RegExp);
});

test('bắt secret thật, cho qua placeholder', () => {
  const hits = (f, t) => scan(f, t).map((x) => x.rule);
  assert.deepEqual(hits('.env.example', fake('DATABASE_URL=postgres://app:', 'Sup3rS3cret', '@127.0.0.1/db')), ['hallo-url-password']);
  assert.deepEqual(hits('.env.example', 'DATABASE_URL=postgres://app:xxxxxxxx@127.0.0.1/db'), []);
  assert.deepEqual(hits('.env.example', fake('SMTP_PASSWORD=', 'hunter2hunter2')), ['hallo-env-secret']);
  assert.deepEqual(hits('.env.example', 'SMTP_PASSWORD=xxxxxxxxxxxx'), []);
  assert.deepEqual(hits('.env.example', 'AUTH_SECRET=${AUTH_SECRET}'), []);
  // Rule .env chỉ áp cho file .env*: code đặt tên biến PASSWORD không bị bắt.
  assert.deepEqual(hits('src/a.ts', fake('const PASSWORD_MIN = ', '"minimum8"')), []);
  assert.deepEqual(hits('src/a.ts', fake('key: "sk-proj-', 'A'.repeat(30), '"')), ['hallo-openai-key']);
  assert.deepEqual(hits('docs/x.md', fake('/ho', 'me/vunguyen/app/.env')), ['hallo-personal-path']);
  assert.deepEqual(hits('docs/x.md', '/home/<user>/app và /Users/user/x/'), []);
  assert.deepEqual(hits('docs/x.md', fake('liên hệ abc', '@gmail.com')), ['hallo-personal-email']);
  assert.deepEqual(hits('docs/x.md', 'noreply@gmail.com'), []);
  assert.deepEqual(hits('test/a.ts', fake('postgres://u:', 'realpass', '@h/db // gitleaks:allow')), []);
});

test('kết quả không chứa giá trị secret', () => {
  const [hit] = scan('.env', fake('REDIS_URL=redis://:', 'VeryRealPassw0rd', '@127.0.0.1:6379'));
  assert.ok(hit);
  assert.doesNotMatch(JSON.stringify(hit), /VeryRealPassw0rd/);
  assert.match(hit.hint, /^Very…\(16\)$/);
});

test('addedLines lấy đúng số dòng của dòng thêm', () => {
  const diff = ['diff --git a/x b/x', '--- a/x', '+++ b/x', '@@ -1,0 +5,2 @@', '+a', '+b', '@@ -9 +12 @@', '-old', '+c'].join('\n');
  assert.deepEqual(addedLines(diff).get('x'), [{ n: 5, text: 'a' }, { n: 6, text: 'b' }, { n: 12, text: 'c' }]);
});

test('khối hallo-security: thêm mới, thay khối cũ, giữ phần riêng của repo', () => {
  const block = '# >>> hallo-security\n.env\n# <<< hallo-security\n';
  assert.equal(withIgnoreBlock('node_modules/\n', block), 'node_modules/\n\n' + block);
  const old = 'node_modules/\n\n# >>> hallo-security\nold\n# <<< hallo-security\ndist/\n';
  assert.equal(withIgnoreBlock(old, block), 'node_modules/\n\n# >>> hallo-security\n.env\n# <<< hallo-security\ndist/\n');
  assert.equal(withIgnoreBlock(null, block), block);
});

// Repo git tạm có baseline áp bằng harden.mjs, để thử hook thật.
function hardenedRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'sec-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  g('init', '-q', '-b', 'dev');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 't', scripts: { test: 'x' } }, null, 2) + '\n');
  writeFileSync(join(dir, 'package-lock.json'), '{}\n');
  execFileSync('node', [join(SEC, 'harden.mjs'), 'apply'], { cwd: dir });
  g('add', '-A');
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'baseline');
  const commit = () =>
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'x'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HALLO_SECRET_SCAN_NO_GITLEAKS: '1' },
    });
  return { dir, g, commit };
}

test('harden apply ghi đủ baseline; check sau đó không còn lệch', () => {
  const { dir } = hardenedRepo();
  for (const f of ['.gitignore', '.gitleaks.toml', 'scripts/secret-scan.mjs', 'scripts/git-hooks/pre-commit', '.github/workflows/security.yml', '.github/dependabot.yml'])
    assert.ok(existsSync(join(dir, f)), f);
  assert.ok(statSync(join(dir, 'scripts/git-hooks/pre-commit')).mode & 0o100);
  assert.match(readFileSync(join(dir, 'package.json'), 'utf8'), /core\.hooksPath scripts\/git-hooks/);
  assert.match(readFileSync(join(dir, '.github/workflows/security.yml'), 'utf8'), /npm audit --omit=dev/);
  assert.match(readFileSync(join(dir, '.github/dependabot.yml'), 'utf8'), /package-ecosystem: npm/);
  const out = execFileSync('node', [join(SEC, 'harden.mjs'), 'check', '--strict'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /✓ baseline khớp/);
});

test('hook pre-commit chặn secret, file bị ignore; cho qua placeholder và migration', () => {
  const { dir, g, commit } = hardenedRepo();
  writeFileSync(join(dir, '.env.example'), fake('DATABASE_URL=postgres://app:', 'R3alPassw0rd', '@db/app\n'));
  g('add', '.env.example');
  const blocked = commit();
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /hallo-url-password/);
  assert.doesNotMatch(blocked.stderr, /R3alPassw0rd/);

  writeFileSync(join(dir, '.env.example'), 'DATABASE_URL=postgres://app:xxxxxxxx@db/app\n');
  g('add', '.env.example');
  assert.equal(commit().status, 0);

  writeFileSync(join(dir, 'server.pem'), 'not really a key\n');
  g('add', '-f', 'server.pem');
  const forced = commit();
  assert.notEqual(forced.status, 0);
  assert.match(forced.stderr, /server\.pem: file bị \.gitignore/);
  g('rm', '-q', '--cached', 'server.pem');

  mkdirSync(join(dir, 'prisma/migrations/1_init'), { recursive: true });
  writeFileSync(join(dir, 'prisma/migrations/1_init/migration.sql'), 'CREATE TABLE t (id int);\n');
  g('add', 'prisma/migrations');
  assert.equal(commit().status, 0);
});

test('thêm "prepare" mà giữ nguyên định dạng package.json', async () => {
  const { withPrepare } = await import('../shared/security/harden.mjs');
  const src = '{\n  "name": "x",\n  "engines": { "node": ">=24" },\n  "scripts": {\n    "test": "node --test \\"a}\\""\n  }\n}\n';
  const out = withPrepare(src);
  assert.equal(JSON.parse(out).scripts.prepare, 'git config core.hooksPath scripts/git-hooks || true');
  assert.match(out, /"engines": \{ "node": ">=24" \},/);
  for (const other of ['{\n  "name": "y"\n}\n', '{\n  "scripts": {}\n}\n']) assert.ok(JSON.parse(withPrepare(other)).scripts.prepare);
});
