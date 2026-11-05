#!/usr/bin/env node
// kb-review — hỗ trợ /review:publish và /review:system: kiểm điều kiện, chỉ đường dẫn kết quả, tóm tắt findings.
// Việc review thật do hallo-system-knowledge/tools/ci/review-local.mjs làm (cùng prompt/schema với CI).
// Không bao giờ in token; token chỉ do review-local.mjs tự lấy qua `gh auth token`.
//
//   node kb-review.mjs preflight [pr|system]     JSON: kb, codeRoot, gh, claude, findingsFlag, kbClean…
//   node kb-review.mjs path pr <api|web> <n>     đường dẫn findings.json của lần dry-run
//   node kb-review.mjs path system
//   node kb-review.mjs summary <findings.json>   tóm tắt để người dùng duyệt trước khi đăng
//
// Luôn thoát 0 (dùng được trong !`...`).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sh = (cmd, args, cwd) => {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim();
  } catch {
    return '';
  }
};
export const REPOS = { api: 'hallo-api', web: 'hallo-web', 'hallo-api': 'hallo-api', 'hallo-web': 'hallo-web' };

// Repo knowledge: HALLO_KB, hoặc cạnh repo gốc của thư mục hiện tại (kể cả khi đang ở worktree).
export function findKb(cwd = process.cwd()) {
  if (process.env.HALLO_KB) return resolve(process.env.HALLO_KB);
  const common = sh('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
  const root = common ? dirname(common) : cwd;
  for (const dir of [root, dirname(root), cwd, dirname(cwd)]) {
    if (existsSync(join(dir, 'tools', 'ci', 'review-local.mjs'))) return dir;
    const kb = join(dir, 'hallo-system-knowledge');
    if (existsSync(join(kb, 'tools', 'ci', 'review-local.mjs'))) return kb;
  }
  return '';
}

export function preflight(tier = 'pr') {
  const kb = findKb();
  const codeRoot = kb ? resolve(process.env.CODE_ROOT ?? join(kb, '..')) : '';
  const login = sh('gh', ['api', 'user', '--jq', '.login']);
  const claude = spawnSync('claude', ['--version'], { encoding: 'utf8' }).status === 0;
  const script = kb ? readFileSync(join(kb, 'tools', 'ci', 'review-local.mjs'), 'utf8') : '';
  const out = {
    kb,
    codeRoot,
    gh: login || null,
    claude,
    clones: Object.fromEntries(['hallo-api', 'hallo-web'].map((r) => [r, existsSync(join(codeRoot, r, '.git'))])),
    findingsFlag: script.includes("'--findings'"),
  };
  if (tier === 'system' && kb) {
    sh('git', ['fetch', '--quiet'], kb);
    out.kbBranch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], kb);
    out.kbClean = sh('git', ['status', '--porcelain', '--untracked-files=no'], kb) === '';
    out.kbBehind = Number(sh('git', ['rev-list', '--count', 'HEAD..@{u}'], kb) || 0);
  }
  const problems = [];
  if (!kb) problems.push('không thấy hallo-system-knowledge (clone cạnh repo, hoặc đặt HALLO_KB)');
  if (!out.gh) problems.push('gh chưa đăng nhập: gh auth login');
  if (!claude) problems.push('không có lệnh claude trong PATH');
  if (kb && !out.findingsFlag) problems.push('repo knowledge cũ (thiếu --findings): git -C <kb> pull');
  for (const [r, ok] of Object.entries(out.clones)) if (kb && !ok) problems.push(`không thấy clone ${r} ở ${codeRoot}`);
  if (tier === 'system' && kb) {
    if (out.kbBranch !== 'dev') problems.push(`repo knowledge đang ở ${out.kbBranch}, cần dev`);
    if (!out.kbClean) problems.push('repo knowledge có thay đổi chưa commit');
    if (out.kbBehind) problems.push(`repo knowledge behind ${out.kbBehind} commit: git -C <kb> pull --ff-only`);
  }
  return { ...out, ok: problems.length === 0, problems };
}

export function findingsPath(kb, tier, repo, n) {
  return tier === 'system'
    ? join(kb, '.review', 'system', 'findings.json')
    : join(kb, '.review', `pr-${REPOS[repo] ?? repo}-${n}`, 'out', 'findings.json');
}

const RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
// Tóm tắt ngắn cho người duyệt; cùng chuẩn chặn với pr-publish (P0–P1 hoặc vi phạm quy tắc → chặn).
export function summarize(data) {
  const lines = [];
  if (Array.isArray(data.findings)) {
    const items = [...data.findings].sort((a, b) => (RANK[a.priority] ?? 9) - (RANK[b.priority] ?? 9));
    const count = (p) => items.filter((f) => f.priority === p).length;
    const blocking = items.some((f) => ['P0', 'P1'].includes(f.priority) || f.rule);
    lines.push(`Tầng 1: ${items.length} phát hiện (P0 ${count('P0')} · P1 ${count('P1')} · P2 ${count('P2')} · P3 ${count('P3')}) → ${blocking ? '⛔ sẽ chặn merge' : '✅ không chặn'}`);
    for (const f of items.slice(0, 12))
      lines.push(`- ${f.priority} ${f.rule ? `[${f.rule}] ` : ''}${f.file ?? ''}${f.line ? `:${f.line}` : ''} — ${f.title}`);
    if (items.length > 12) lines.push(`- … và ${items.length - 12} mục khác`);
    if (data.fixed?.length) lines.push(`Đã sửa: ${data.fixed.map((x) => x.ref).join(', ')}`);
  } else {
    const n = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
    lines.push(`Tầng 2: ${n('new')} vấn đề mới · ${n('existing')} cập nhật RV cũ · ${n('rule_instances')} chỗ vi phạm quy tắc`);
    for (const f of (data.new ?? []).slice(0, 10)) lines.push(`- mới: ${f.priority ?? ''} ${f.title ?? f.issue ?? ''}`.trim());
  }
  if (data.summary) lines.push(`Tóm tắt: ${String(data.summary).slice(0, 400)}`);
  return lines.join('\n');
}

function main() {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'preflight') {
    const r = preflight(a);
    console.log(JSON.stringify(r, null, 2));
  } else if (cmd === 'path') {
    const kb = findKb();
    console.log(kb ? findingsPath(kb, a, b, c) : '(không thấy repo knowledge)');
  } else if (cmd === 'summary') {
    try {
      console.log(summarize(JSON.parse(readFileSync(resolve(a), 'utf8'))));
    } catch (error) {
      console.log(`Không đọc được ${a}: ${error.message}`);
    }
  } else console.log('Dùng: kb-review.mjs preflight [pr|system] | path pr <api|web> <n> | path system | summary <file>');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
