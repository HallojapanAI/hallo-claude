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
