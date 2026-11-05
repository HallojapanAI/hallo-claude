#!/usr/bin/env node
// hallo-security · merge-gate — PR chỉ được merge khi check bảo mật (workflow `Security`:
// secret-scan, npm-audit) đã chạy và xanh. Dùng bởi guard (chặn `gh pr merge`), /git:ship, /review:pr.
// BẢN GỐC: hallo-claude/shared/security/merge-gate.mjs. Repo private trên gói Free không có required
// check của GitHub → đây là lớp chặn thay thế cho mọi thao tác merge đi qua Claude.
//
//   node merge-gate.mjs [<số PR | URL | nhánh>] [-R owner/repo] [--json]
//
// Luôn thoát 0 (dùng được trong !`...`); kết quả nằm ở dòng đầu: PASS | FAIL | PENDING | MISSING | UNKNOWN.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SECURITY_CHECKS = ['secret-scan', 'npm-audit'];
const isSecurity = (c) => c.workflow === 'Security' || SECURITY_CHECKS.includes(c.name);

// checks: [{ name, workflow, bucket: pass|fail|pending|skipping|cancel }]
// expected: repo có workflow Security (khi đó thiếu check = chưa chạy, không phải "không áp dụng").
export function evaluate(checks, expected = true) {
  const sec = checks.filter(isSecurity);
  const list = sec.map((c) => `${c.name}=${c.bucket}`).join(', ');
  if (!sec.length)
    return expected
      ? {
          status: 'MISSING',
          reason:
            'chưa có check Security trên PR (workflow chưa chạy hoặc repo chưa áp /sec:harden)',
        }
      : { status: 'PASS', reason: 'repo không có workflow Security' };
  if (sec.some((c) => c.bucket === 'fail' || c.bucket === 'cancel'))
    return { status: 'FAIL', reason: `check bảo mật đỏ: ${list}` };
  if (sec.some((c) => c.bucket === 'pending'))
    return { status: 'PENDING', reason: `đang chạy: ${list}` };
  return { status: 'PASS', reason: list };
}

const gh = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 7000 });

// Lấy check của PR từ GitHub. Lỗi mạng / gh chưa đăng nhập → UNKNOWN (người gọi quyết định).
export function gate(target, repo) {
  const r = repo ? ['-R', repo] : [];
  try {
    const pr = JSON.parse(
      gh(['pr', 'view', ...(target ? [target] : []), ...r, '--json', 'number,headRefOid,url']),
    );
    let checks = [];
    try {
      checks = JSON.parse(
        gh(['pr', 'checks', String(pr.number), ...r, '--json', 'name,workflow,bucket']),
      );
    } catch (error) {
      // `gh pr checks` thoát ≠ 0 khi có check fail/pending nhưng vẫn in JSON.
      checks = JSON.parse(error.stdout || '[]');
    }
    // Repo của PR lấy từ URL (đúng cả khi chạy ngoài repo hoặc dùng -R).
    const slug = (pr.url.match(/github\.com\/([^/]+\/[^/]+)\/pull\//) ?? [])[1];
    let expected = true;
    try {
      gh([
        'api',
        `repos/${slug}/contents/.github/workflows/security.yml?ref=${pr.headRefOid}`,
        '--silent',
      ]);
    } catch {
      expected = false;
    }
    return { pr: pr.number, url: pr.url, ...evaluate(checks, expected) };
  } catch {
    return {
      status: 'UNKNOWN',
      reason: 'không đọc được PR/check (gh chưa đăng nhập, mạng, hoặc PR không tồn tại)',
    };
  }
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf('-R');
  const repo = at >= 0 ? args[at + 1] : undefined;
  const target = args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '-R');
  const result = gate(target, repo);
  if (args.includes('--json')) console.log(JSON.stringify(result));
  else console.log(`${result.status}${result.pr ? ` PR #${result.pr}` : ''} — ${result.reason}`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  process.exitCode = main();
