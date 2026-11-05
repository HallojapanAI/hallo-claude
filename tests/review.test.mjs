// Test plugin review: kb-review.mjs (điều kiện, đường dẫn kết quả, tóm tắt findings).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findKb, findingsPath, summarize } from '../plugins/review/scripts/kb-review.mjs';

test('tìm repo knowledge theo HALLO_KB hoặc cạnh thư mục hiện tại', () => {
  const ws = mkdtempSync(join(tmpdir(), 'ws-'));
  mkdirSync(join(ws, 'hallo-system-knowledge', 'tools', 'ci'), { recursive: true });
  writeFileSync(join(ws, 'hallo-system-knowledge', 'tools', 'ci', 'review-local.mjs'), "'--findings'");
  mkdirSync(join(ws, 'hallo-api'));
  assert.equal(findKb(join(ws, 'hallo-api')), join(ws, 'hallo-system-knowledge'));
  process.env.HALLO_KB = '/x/kb';
  assert.equal(findKb(join(ws, 'hallo-api')), '/x/kb');
  delete process.env.HALLO_KB;
});

test('đường dẫn findings trùng với nơi review-local.mjs ghi', () => {
  assert.equal(findingsPath('/kb', 'pr', 'api', 12), '/kb/.review/pr-hallo-api-12/out/findings.json');
  assert.equal(findingsPath('/kb', 'pr', 'hallo-web', 3), '/kb/.review/pr-hallo-web-3/out/findings.json');
  assert.equal(findingsPath('/kb', 'system'), '/kb/.review/system/findings.json');
});

test('tóm tắt tầng 1: sắp theo mức, báo chặn giống pr-publish', () => {
  const out = summarize({
    summary: 'ok',
    findings: [
      { priority: 'P3', title: 'nhỏ', file: 'a.ts', line: 3 },
      { priority: 'P1', title: 'lỗi', file: 'b.ts', line: 9 },
    ],
    fixed: [{ ref: 'RV-014' }],
  });
  assert.match(out, /2 phát hiện \(P0 0 · P1 1 · P2 0 · P3 1\) → ⛔ sẽ chặn merge/);
  assert.ok(out.indexOf('b.ts:9') < out.indexOf('a.ts:3'));
  assert.match(out, /Đã sửa: RV-014/);
  assert.match(summarize({ findings: [{ priority: 'P3', title: 'x' }] }), /✅ không chặn/);
  // Vi phạm quy tắc luôn chặn, kể cả mức thấp.
  assert.match(summarize({ findings: [{ priority: 'P3', title: 'x', rule: 'R-008' }] }), /⛔/);
});

test('tóm tắt tầng 2', () => {
  assert.match(summarize({ new: [{ priority: 'P2', title: 'mới' }], existing: [1, 2], rule_instances: [] }), /1 vấn đề mới · 2 cập nhật RV cũ · 0 chỗ/);
});
