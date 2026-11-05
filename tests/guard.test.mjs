// Test hook guard của plugin git: node --test tests/
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const GUARD = new URL('../plugins/git/scripts/guard.mjs', import.meta.url).pathname;
const repo = (branch) => {
  const dir = mkdtempSync(join(tmpdir(), 'guard-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q', '-b', branch);
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
  return dir;
};
const decide = (command, cwd, env = {}) => {
  const out = execFileSync('node', [GUARD], {
    input: JSON.stringify({ tool_input: { command }, cwd }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : 'pass';
};

const onDev = repo('dev');
const onFeat = repo('feat/x');

const cases = [
  ['git push -u origin HEAD', onDev, 'deny'],
  ['git push', onDev, 'deny'],
  ['git push -u origin HEAD', onFeat, 'pass'],
  ['git push origin feat/x:dev', onFeat, 'deny'],
  ['git push origin HEAD:refs/heads/main', onFeat, 'deny'],
  ['git push --force', onFeat, 'deny'],
  ['git push -f origin feat/x', onFeat, 'deny'],
  ['git push origin +feat/x', onFeat, 'deny'],
  ['git push --force-with-lease', onFeat, 'pass'],
  ['git push --all', onFeat, 'deny'],
  [`cd ${onDev} && git push`, onFeat, 'deny'],
  [`git -C ${onDev} push`, onFeat, 'deny'],
  ['git commit -m "fix: x" --no-verify', onFeat, 'deny'],
  ['git commit -nm "fix: x"', onFeat, 'deny'],
  ['git commit -am "fix: x"', onFeat, 'pass'],
  ['git commit -m "docs: mention -n flag"', onFeat, 'pass'],
  ['git add .env', onFeat, 'deny'],
  ['git add .env.local', onFeat, 'deny'],
  ['git add .env.example src/a.ts', onFeat, 'pass'],
  ['git add certs/server.pem', onFeat, 'deny'],
  ['git add ~/.ssh/id_ed25519', onFeat, 'deny'],
  ['git add backup.sql', onFeat, 'deny'],
  ['git add prod.dump data.sqlite', onFeat, 'deny'],
  ['git add prisma/migrations/202611060001_jobs/migration.sql', onFeat, 'pass'],
  ['git add docs/id_ed25519.pub.md', onFeat, 'pass'],
  ['git add -f .env.production', onFeat, 'deny'],
  ['gh repo edit HallojapanAI/hallo-api --visibility public', onFeat, 'deny'],
  ['gh repo edit --visibility=public', onFeat, 'deny'],
  ['gh repo edit --visibility private', onFeat, 'pass'],
  ['gh repo create x --public', onFeat, 'ask'],
  ['git reset --hard origin/dev', onFeat, 'ask'],
  ['git clean -fd', onFeat, 'ask'],
  ['git checkout -- .', onFeat, 'ask'],
  ['git branch -D old', onFeat, 'ask'],
  ['gh pr merge 1 --squash --admin', onFeat, 'deny'],
  ['gh pr create --base dev', onFeat, 'pass'],
  ['npm run check && git status', onFeat, 'pass'],
];
for (const [cmd, cwd, want] of cases)
  test(`${want.padEnd(4)} ${cmd.replace(/\/[^ ]*guard-\w+/g, '<repo>')}`, () => assert.equal(decide(cmd, cwd), want));

test('HALLO_GUARD=off tắt guard', () => assert.equal(decide('git push', onDev, { HALLO_GUARD: 'off' }), 'pass'));
