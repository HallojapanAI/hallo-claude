#!/usr/bin/env node
// hallo-ctx — ngữ cảnh repo HalloJapan cho skill (dùng qua !`node .../hallo-ctx.mjs`).
// BẢN GỐC: hallo-claude/shared/hallo-ctx.mjs. Bản trong plugins/*/scripts/ do `npm run sync` chép ra —
// không sửa trực tiếp bản chép.
//
//   node hallo-ctx.mjs            text gọn cho prompt
//   node hallo-ctx.mjs --json     JSON cho script
//
// Không bao giờ thoát mã khác 0: lỗi ở skill injection sẽ hủy cả lệnh.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const sh = (cmd, args, cwd) => {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
  } catch {
    return '';
  }
};
const git = (...args) => sh('git', args, process.cwd());

const SYSTEMS = {
  'hallo-api': {
    kind: 'api',
    check: 'npm run check && npm test',
    extra: 'npm run test:integration (cần PostgreSQL/Redis)',
  },
  'hallo-web': { kind: 'web', check: 'npm run check && npm test', extra: 'npm run test:e2e (Playwright)' },
  'hallo-system-knowledge': { kind: 'kb', check: 'npm run kb:check', extra: 'npm run kb:gen' },
  'hallo-claude': { kind: 'plugins', check: 'npm run validate', extra: '' },
};
const PROTECTED = ['dev', 'main', 'master'];

function context() {
  const root = git('rev-parse', '--show-toplevel');
  if (!root) return { inGit: false, cwd: process.cwd() };

  const remote = git('remote', 'get-url', 'origin');
  const slug = (remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/) ?? [])[1] ?? '';
  const repo = slug ? slug.split('/')[1] : basename(root);
  const sys = SYSTEMS[repo] ?? { kind: 'other', check: '', extra: '' };

  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const defaultBranch = git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '') || 'main';
  const base = git('rev-parse', '--verify', '--quiet', 'refs/remotes/origin/dev') ? 'dev' : defaultBranch;
  const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  const [behind, ahead] = (git('rev-list', '--left-right', '--count', `origin/${base}...HEAD`) || '0\t0')
    .split(/\s+/)
    .map(Number);

  const porcelain = git('status', '--porcelain');
  const lines = porcelain ? porcelain.split('\n') : [];
  const staged = lines.filter((l) => /^[MADRC]/.test(l)).length;
  const unstaged = lines.filter((l) => /^.[MD]/.test(l)).length;
  const untracked = lines.filter((l) => l.startsWith('??')).length;

  // File đổi so với base (đã commit + đang sửa) để gợi ý việc bắt buộc đi kèm.
  const changed = [
    ...new Set(
      [git('diff', '--name-only', `origin/${base}...HEAD`), git('diff', '--name-only', 'HEAD')]
        .join('\n')
        .split('\n')
        .filter(Boolean),
    ),
  ];
  const any = (re) => changed.some((f) => re.test(f));
  const hints = [];
  if (sys.kind === 'api' && any(/\.dto\.ts$|\.controller\.ts$/))
    hints.push('R-013: đổi DTO/controller → xuất lại openapi/openapi.json và báo hallo-web chạy `npm run api:generate`');
  if (sys.kind === 'api' && any(/^prisma\/schema\.prisma$/))
    hints.push('schema.prisma đổi → cần migration trong prisma/migrations + `npm run db:generate`');
  if (sys.kind === 'web' && any(/^api-schema\//)) hints.push('api-schema đổi → `npm run api:generate` và commit schema.d.ts');
  if (sys.kind === 'web' && any(/^src\/i18n\/locales\//)) hints.push('i18n: cập nhật đủ en/vi/ja');
  if (any(/(^|\/)\.env(\.|$)/) && !changed.every((f) => f.endsWith('.env.example')))
    hints.push('CẢNH BÁO: có file .env trong thay đổi — không commit secret (R-008)');
  if (any(/\.env\.example$/)) hints.push('.env.example đổi → chỉ placeholder `xxxxxxxx` (R-008)');

  const kb = [process.env.HALLO_KB, join(dirname(root), 'hallo-system-knowledge'), repo === 'hallo-system-knowledge' ? root : '']
    .filter(Boolean)
    .map((p) => resolve(p))
    .find((p) => existsSync(join(p, 'AGENTS.md')));

  const refMatch = branch.match(/\b(HJ-\d{3}|RV-\d{3})\b/i);
  let nodeWant = '';
  try {
    nodeWant = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
  } catch {}

  return {
    inGit: true,
    repo,
    slug,
    kind: sys.kind,
    root,
    branch,
    onProtected: PROTECTED.includes(branch),
    base,
    defaultBranch,
    upstream: upstream || null,
    ahead,
    behind,
    staged,
    unstaged,
    untracked,
    changed: changed.slice(0, 60),
    changedCount: changed.length,
    ref: refMatch ? refMatch[1].toUpperCase() : null,
    check: sys.check,
    extraCheck: sys.extra,
    hints,
    kb: kb ?? null,
    node: { have: process.version.slice(1), want: nodeWant || null },
    gh: Boolean(sh('gh', ['--version'])),
  };
}

// Section phụ cho skill: gói mọi lệnh git/gh vào node để skill chỉ cần quyền `Bash(node *)`
// (lệnh ghép có pipe/&& trong !`…` bị kiểm quyền từng phần).
const SECTIONS = {
  commit: () => [
    ['status', git('status', '--short') || '(sạch)'],
    ['staged', git('diff', '--cached', '--stat') || '(không có)'],
    ['unstaged', git('diff', '--stat') || '(không có)'],
    ['recent', git('log', '--oneline', '-8')],
  ],
  status: () => {
    const pr = sh('gh', ['pr', 'view', '--json', 'number,url,state,isDraft,reviewDecision,mergeable,statusCheckRollup'], process.cwd());
    return [
      ['commit chưa vào dev', git('log', '--oneline', 'origin/dev..HEAD').split('\n').slice(0, 15).join('\n') || '(không có)'],
      ['PR', pr || '(chưa có PR, hoặc gh chưa cài/đăng nhập)'],
    ];
  },
  diffstat: () => [
    ['so với origin/dev (đã commit)', git('diff', '--stat', 'origin/dev...HEAD').split('\n').slice(-30).join('\n') || '(không có)'],
    ['chưa commit', git('diff', '--stat', 'HEAD').split('\n').slice(-20).join('\n') || '(không có)'],
  ],
  clean: () => {
    git('fetch', 'origin', '--prune', '--quiet');
    const keep = (b) => b && !PROTECTED.includes(b) && b !== git('rev-parse', '--abbrev-ref', 'HEAD');
    const merged = git('branch', '--merged', 'origin/dev', '--format=%(refname:short)').split('\n').filter(keep);
    const gone = git('branch', '--format=%(refname:short) %(upstream:track)')
      .split('\n')
      .filter((l) => l.endsWith('[gone]'))
      .map((l) => l.split(' ')[0])
      .filter(keep);
    return [
      ['merged vào origin/dev', merged.join('\n') || '(không có)'],
      ['upstream đã xóa (thường là PR đã squash merge)', gone.join('\n') || '(không có)'],
    ];
  },
  secrets: () => [
    ['staged', git('diff', '--cached', '--name-only').split('\n').slice(0, 50).join('\n') || '(không có)'],
    ['branch (chưa có trên origin/dev)', git('diff', '--name-only', 'origin/dev...HEAD').split('\n').slice(0, 50).join('\n') || '(không có)'],
    ['gitleaks', sh('gitleaks', ['version']) ? 'có' : 'không có (dùng regex)'],
  ],
};
const section = process.argv.slice(2).find((a) => SECTIONS[a]);
if (section) {
  try {
    for (const [title, body] of SECTIONS[section]()) console.log(`--- ${title}\n${body}`);
  } catch (e) {
    console.log(`(không lấy được ${section}: ${e.message})`);
  }
  process.exit(0);
}

const c = context();
if (process.argv.includes('--kb')) {
  console.log(`repo: ${c.repo ?? '?'}\nknowledge repo: ${c.kb ?? 'không tìm thấy (đặt HALLO_KB hoặc chạy /setup:init)'}`);
  process.exit(0);
}
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(c, null, 2) + '\n');
} else if (!c.inGit) {
  console.log(`(không ở trong git repo: ${c.cwd})`);
} else {
  const out = [
    `repo: ${c.repo}${c.slug ? ` (${c.slug})` : ''} · loại: ${c.kind}`,
    `branch: ${c.branch}${c.onProtected ? ' ⚠ nhánh bảo vệ' : ''} · base PR: ${c.base} · release: ${c.defaultBranch}`,
    `upstream: ${c.upstream ?? '(chưa push)'} · ahead ${c.ahead} / behind ${c.behind} so với origin/${c.base}`,
    `working tree: ${c.staged} staged, ${c.unstaged} unstaged, ${c.untracked} untracked`,
    `ref từ tên nhánh: ${c.ref ?? '—'}`,
    `check: ${c.check || '—'}${c.extraCheck ? ` · thêm: ${c.extraCheck}` : ''}`,
    `knowledge repo: ${c.kb ?? 'không tìm thấy (đặt HALLO_KB)'}`,
    `gh CLI: ${c.gh ? 'có' : 'CHƯA CÀI'} · node ${c.node.have}${c.node.want ? ` (repo cần ${c.node.want})` : ''}`,
    `file đổi so với origin/${c.base}: ${c.changedCount}${c.changedCount ? `\n  - ${c.changed.slice(0, 25).join('\n  - ')}` : ''}${c.changedCount > 25 ? '\n  - …' : ''}`,
  ];
  if (c.hints.length) out.push(`việc kèm theo:\n  - ${c.hints.join('\n  - ')}`);
  console.log(out.join('\n'));
}
