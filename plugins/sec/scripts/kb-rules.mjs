#!/usr/bin/env node
// kb-rules — in quy tắc review R-xxx áp dụng cho repo hiện tại và các việc RV đang mở chạm file đã đổi,
// đọc trực tiếp từ hallo-system-knowledge (nguồn sự thật, không chép vào plugin).
// BẢN GỐC: hallo-claude/shared/kb-rules.mjs — `npm run sync` chép vào plugins/*/scripts/.
//
//   node kb-rules.mjs                quy tắc + RV chạm diff (so với origin/dev)
//   node kb-rules.mjs --all-rv       thêm mọi RV đang mở của repo
//   node kb-rules.mjs --sec          chỉ quy tắc/RV có tiêu chí SEC
// Không bao giờ thoát mã khác 0.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const sh = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
  } catch {
    return '';
  }
};

const root = sh(['rev-parse', '--show-toplevel']);
const remote = sh(['remote', 'get-url', 'origin']);
const repo = (remote.match(/\/([^/]+?)(?:\.git)?$/) ?? [])[1] ?? (root ? basename(root) : '');
const kind = { 'hallo-api': 'api', 'hallo-web': 'web' }[repo] ?? null;
const SEC = process.argv.includes('--sec');
const ALL = process.argv.includes('--all-rv');

const kb = [process.env.HALLO_KB, root && join(dirname(root), 'hallo-system-knowledge')]
  .filter(Boolean)
  .map((p) => resolve(p))
  .find((p) => existsSync(join(p, 'roadmap', 'review-rules.md')));

if (!kb) {
  console.log(
    '(không tìm thấy hallo-system-knowledge cạnh repo này — đặt HALLO_KB hoặc chạy /setup:init. ' +
      'Review vẫn chạy nhưng không đối chiếu được quy tắc R-xxx.)',
  );
  process.exit(0);
}

// Bảng markdown → mảng hàng (mảng ô). Bảng quy định không dùng `|` trong ô.
const rows = (file) => {
  try {
    return readFileSync(join(kb, file), 'utf8')
      .split('\n')
      .filter((l) => /^\|\s*(R|RV)-\d{3}\s*\|/.test(l))
      .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  } catch {
    return [];
  }
};
const applies = (scope) => !kind || scope === `${kind}` || scope === 'api+web' || scope.includes(kind);
const head = sh(['-C', kb, 'log', '-1', '--format=%h %cs']);

// review-rules.md: ID | Quy tắc | Áp dụng | Cách phát hiện | Cách làm đúng | Guard | Trạng thái | Nguồn | Liên quan
const rules = rows('roadmap/review-rules.md').filter(
  (r) => r[6] !== 'RETIRED' && applies(r[2]) && (!SEC || /secret|quyền|auth|xác minh|rate|audit|csrf|token|phiên|R-00[1789]|R-01[0-2]/i.test(r.join(' '))),
);
console.log(`Nguồn: ${kb} @ ${head || '?'} · repo: ${repo || '?'} (${kind ?? 'không phải api/web — dùng mọi quy tắc'})`);
console.log('Chặn merge: ACTIVE, GUARDED · Chỉ cảnh báo: PROPOSED\n');
for (const r of rules) console.log(`- **${r[0]}** [${r[6]}] (${r[2]}) ${r[1]}\n  phát hiện: ${r[3]}\n  làm đúng: ${r[4]}`);
if (!rules.length) console.log('(không có quy tắc áp dụng)');

// design-review.md: ID | Tiêu chí | Mức | Hệ thống | Trạng thái | Vấn đề | Bằng chứng | Khắc phục | Nghiệm thu | Liên quan
const changed = [
  ...new Set([sh(['diff', '--name-only', 'origin/dev...HEAD']), sh(['diff', '--name-only', 'HEAD'])].join('\n').split('\n').filter(Boolean)),
];
const open = rows('roadmap/design-review.md').filter(
  (r) => !['DONE', 'WONTFIX'].includes(r[4]) && applies(r[3]) && (!SEC || r[1] === 'SEC'),
);
const touched = open.filter((r) => changed.some((f) => r[6].includes(`${repo}/${f}`) || r[6].includes(f)));
const list = ALL ? open : touched;
console.log(`\n### Việc RV đang mở ${ALL ? 'của repo' : 'chạm file đã đổi'} (${list.length}/${open.length})`);
for (const r of list.slice(0, 40))
  console.log(`- **${r[0]}** ${r[2]} ${r[1]} [${r[4]}] ${r[5]}\n  bằng chứng: ${r[6]}\n  nghiệm thu: ${r[8]}`);
if (!list.length) console.log('(không có)');
