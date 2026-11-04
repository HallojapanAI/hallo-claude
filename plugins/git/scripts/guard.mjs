#!/usr/bin/env node
// Guard PreToolUse(Bash) của plugin git — chặn thao tác git nguy hiểm trước khi chạy.
//   deny: push vào dev/main/master, force push (trừ --force-with-lease trên nhánh riêng), --no-verify,
//         git add file .env, gh pr merge --admin, gh repo delete
//   ask : reset --hard, clean -f, checkout/restore toàn bộ, branch -D
// Tắt tạm: khởi động Claude với HALLO_GUARD=off. Lệnh gõ với tiền tố `!` không đi qua hook.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const PROTECTED = new Set(['dev', 'main', 'master']);

if (process.env.HALLO_GUARD === 'off') process.exit(0);

let input = '';
for await (const chunk of process.stdin) input += chunk;
let data;
try {
  data = JSON.parse(input);
} catch {
  process.exit(0);
}
const command = data?.tool_input?.command;
if (typeof command !== 'string') process.exit(0);

const decide = (decision, reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: `[hallo git guard] ${reason}`,
      },
    }),
  );
  process.exit(0);
};

const currentBranch = (cwd) => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    }).trim();
  } catch {
    return '';
  }
};

// Tách lệnh ghép (&&, ||, ;, |, xuống dòng) và tách token đơn giản có xử lý nháy.
const tokenize = (s) => (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) => t.replace(/^["']|["']$/g, ''));
const segments = command.split(/&&|\|\||;|\||\n/).map((s) => tokenize(s.trim())).filter((t) => t.length);

let cwd = data.cwd || process.cwd();
const findings = { deny: [], ask: [] };

for (const raw of segments) {
  // Bỏ tiền tố kiểu `VAR=x`, `env`, `command`.
  let t = raw;
  while (t.length && (/^[A-Z_][A-Z0-9_]*=/.test(t[0]) || t[0] === 'env' || t[0] === 'command')) t = t.slice(1);
  if (!t.length) continue;

  if (t[0] === 'cd' && t[1]) {
    cwd = resolve(cwd, t[1].replace(/^~(?=\/|$)/, process.env.HOME ?? '~'));
    continue;
  }

  if (t[0] === 'git') {
    // Bỏ tùy chọn toàn cục: git -C dir, -c k=v, --no-pager…
    let i = 1;
    let gitCwd = cwd;
    while (i < t.length && t[i].startsWith('-')) {
      if (t[i] === '-C' && t[i + 1]) {
        gitCwd = resolve(cwd, t[i + 1]);
        i += 2;
      } else if (t[i] === '-c') i += 2;
      else i += 1;
    }
    const sub = t[i];
    const args = t.slice(i + 1);
    const has = (...flags) => args.some((a) => flags.includes(a));

    if (sub === 'push') {
      const force = args.some((a) => a === '--force' || a === '-f' || (/^-[a-zA-Z]+$/.test(a) && a.includes('f')));
      const lease = args.some((a) => a.startsWith('--force-with-lease') || a === '--force-if-includes');
      if (has('--all', '--mirror')) findings.deny.push('push --all/--mirror bị cấm');
      if (has('--no-verify')) findings.deny.push('không dùng --no-verify');
      const positional = args.filter((a) => !a.startsWith('-'));
      const refspecs = positional.slice(1); // bỏ remote
      const plusForce = refspecs.some((r) => r.startsWith('+'));
      const targets = refspecs.length
        ? refspecs.map((r) => {
            const dst = r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '');
            return dst === 'HEAD' || dst === '' ? currentBranch(gitCwd) : dst;
          })
        : [currentBranch(gitCwd)];
      const hit = targets.filter((b) => PROTECTED.has(b));
      if (hit.length)
        findings.deny.push(
          `không push thẳng vào ${hit.join(', ')} (push dev = deploy + review hệ thống). Tạo nhánh bằng /git:new rồi mở PR bằng /git:ship`,
        );
      if ((force || plusForce) && !lease)
        findings.deny.push('force push bị cấm; trên nhánh riêng dùng `git push --force-with-lease`');
      if (has('--delete', '-d') && hit.length) findings.deny.push('không xóa nhánh bảo vệ');
    }

    if (sub === 'commit' && (has('--no-verify') || args.some((a) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(a))))
      findings.deny.push('không dùng --no-verify / -n khi commit; sửa lỗi hook thay vì bỏ qua');

    if (sub === 'add') {
      const envFile = args.find((a) => /(^|\/)\.env($|\.(?!example$)[\w.-]+$)/.test(a));
      if (envFile) findings.deny.push(`không stage ${envFile} — secret chỉ nằm trên server (R-008)`);
      if (has('-f', '--force')) findings.ask.push('git add --force có thể đưa file bị .gitignore (vd .env) vào commit');
    }

    if (sub === 'reset' && has('--hard')) findings.ask.push('git reset --hard xóa thay đổi chưa commit');
    if (sub === 'clean' && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === '--force'))
      findings.ask.push('git clean -f xóa file chưa track');
    if ((sub === 'checkout' || sub === 'restore') && (args.includes('.') || (args.includes('--') && args.at(-1) === '.')))
      findings.ask.push(`git ${sub} . bỏ toàn bộ thay đổi đang sửa`);
    if (sub === 'branch' && has('-D')) findings.ask.push('git branch -D xóa nhánh chưa merge');
  }

  if (t[0] === 'gh') {
    if (t[1] === 'pr' && t[2] === 'merge' && t.includes('--admin'))
      findings.deny.push('gh pr merge --admin bỏ qua required check `pr-review`');
    if (t[1] === 'repo' && t[2] === 'delete') findings.deny.push('gh repo delete bị cấm');
  }
}

if (findings.deny.length) decide('deny', findings.deny.join('; '));
if (findings.ask.length) decide('ask', findings.ask.join('; '));
process.exit(0);
