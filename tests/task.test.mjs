import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = new URL('../plugins/task/scripts/task.mjs', import.meta.url).pathname;
const run = (...args) => execFileSync('node', [script, ...args], { encoding: 'utf8' });

test('chunks: plan nhỏ giữ nguyên một phần', () => {
  const dir = mkdtempSync(join(tmpdir(), 'task-'));
  writeFileSync(join(dir, 'p.md'), '# Plan\n\nngắn');
  run('chunks', join(dir, 'p.md'), join(dir, 'out'));
  const files = readdirSync(join(dir, 'out'));
  assert.equal(files.length, 1);
  assert.equal(readFileSync(join(dir, 'out', files[0]), 'utf8'), '# Plan\n\nngắn');
});

test('chunks: plan lớn chia theo heading, mỗi phần ≤ 60.000 ký tự và có số thứ tự', () => {
  const dir = mkdtempSync(join(tmpdir(), 'task-'));
  const section = (i) => `## Mục ${i}\n` + 'x'.repeat(25_000);
  writeFileSync(join(dir, 'p.md'), [1, 2, 3, 4].map(section).join('\n'));
  run('chunks', join(dir, 'p.md'), join(dir, 'out'));
  const files = readdirSync(join(dir, 'out')).sort();
  assert.ok(files.length >= 2);
  files.forEach((f, i) => {
    const body = readFileSync(join(dir, 'out', f), 'utf8');
    assert.ok(body.length <= 60_100, `${f} quá dài`);
    assert.match(body, new RegExp(`phần ${i + 1}/${files.length}`));
  });
});

test('lệnh lạ không exit ≠ 0', () => {
  assert.match(run('nope'), /Dùng:/);
});

test('linkify: tham chiếu repo có trên remote → permalink, file mới giữ nguyên', async () => {
  const { linkify } = await import('../plugins/task/scripts/task.mjs');
  const resolver = (repo, path) =>
    path.startsWith('src/new') ? null : { slug: `Org/${repo}`, sha: 'abc123', kind: path.endsWith('/') ? 'tree' : 'blob' };
  const { text, stats } = linkify(
    'Xem `hallo-api/src/a.ts:12-20`, `hallo-web/src/b.tsx` và tạo `hallo-api/src/new/x.ts`; `src/c.ts` không đổi.',
    resolver,
  );
  assert.match(text, /\[`hallo-api\/src\/a\.ts:12-20`\]\(https:\/\/github\.com\/Org\/hallo-api\/blob\/abc123\/src\/a\.ts#L12-L20\)/);
  assert.match(text, /\[`hallo-web\/src\/b\.tsx`\]\(https:\/\/github\.com\/Org\/hallo-web\/blob\/abc123\/src\/b\.tsx\)/);
  assert.match(text, /`hallo-api\/src\/new\/x\.ts`;/);
  assert.match(text, / `src\/c\.ts` không đổi/);
  assert.equal(stats.linked, 2);
  assert.deepEqual(stats.local, ['hallo-api/src/new/x.ts']);
});

test('tasks: tìm trạng thái task trong mọi repo của workspace', () => {
  const ws = mkdtempSync(join(tmpdir(), 'ws-'));
  for (const [name, issue] of [['hallo-api', 'Org/hallo-api#2'], ['hallo-web', 'Org/hallo-api#2'], ['other', 'Org/x#9']]) {
    execFileSync('git', ['init', '-q', join(ws, name)]);
    writeFileSync(join(ws, name, '.git', 'hallo-task.json'), JSON.stringify({ mainIssue: issue, issue: 2 }));
  }
  execFileSync('git', ['init', '-q', join(ws, 'kb')]);
  const out = (filter) =>
    JSON.parse(execFileSync('node', [script, 'tasks', ...(filter ? [filter] : [])], { cwd: join(ws, 'kb'), encoding: 'utf8' }));
  assert.equal(out().length, 3);
  assert.deepEqual(out('Org/hallo-api#2').map((t) => t.name).sort(), ['hallo-api', 'hallo-web']);
});

test('nhiều task mỗi repo: save theo mainIssue, task hiện tại, chuyển file cũ, dùng chung với worktree', () => {
  const ws = mkdtempSync(join(tmpdir(), 'tasks-'));
  const repo = join(ws, 'hallo-api');
  const g = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
  execFileSync('git', ['init', '-q', '-b', 'dev', repo]);
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
  // File cũ một-task (bản ≤ 0.3) được đọc như một task.
  writeFileSync(join(repo, '.git', 'hallo-task.json'), JSON.stringify({ mainIssue: 'O/r#1', issue: 1, status: 'IN_PROGRESS' }));
  const t = (...args) => execFileSync('node', [script, ...args], { cwd: repo, encoding: 'utf8', env: { ...process.env, HALLO_WORKSPACE: ws } });
  assert.equal(JSON.parse(t('state')).mainIssue, 'O/r#1');
  t('save', JSON.stringify({ mainIssue: 'O/r#2', issue: 2, branch: 'feat/2-x' }));
  assert.equal(JSON.parse(t('state')).mainIssue, 'O/r#2', 'task vừa lưu thành hiện tại');
  t('save', JSON.stringify({ status: 'IN_PROGRESS' })); // không có mainIssue → task hiện tại
  assert.equal(JSON.parse(t('state', 'O/r#1')).status, 'IN_PROGRESS', 'task cũ vẫn còn');
  assert.equal(JSON.parse(t('list')).tasks.length, 2);
  // Worktree (kể cả ngoài workspace) thấy cùng kho task.
  const wt = join(mkdtempSync(join(tmpdir(), 'wt-')), 'hallo-api-x');
  g('worktree', 'add', '-q', '-b', 'feat/2-x', wt);
  const fromWt = JSON.parse(execFileSync('node', [script, 'list'], { cwd: wt, encoding: 'utf8' }));
  assert.equal(fromWt.tasks.length, 2);
  // DONE bị lọc khỏi danh sách mặc định, vẫn thấy với --all; forget xóa hẳn.
  t('save', JSON.stringify({ mainIssue: 'O/r#1', status: 'DONE' }));
  assert.deepEqual(JSON.parse(t('tasks')).map((x) => x.mainIssue), ['O/r#2']);
  assert.equal(JSON.parse(t('tasks', '--all')).length, 2);
  t('forget', 'O/r#1');
  assert.equal(JSON.parse(t('list', '--all')).tasks.length, 1);
});
