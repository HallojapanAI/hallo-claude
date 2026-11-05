#!/usr/bin/env node
// harden — áp / kiểm chuẩn bảo mật HalloJapan trong một repo. Dùng bởi /sec:harden và /setup:doctor.
// BẢN GỐC: hallo-claude/shared/security/harden.mjs (npm run sync chép vào plugins/sec/scripts/security/).
//
//   node harden.mjs check [--repo <dir>] [--json]   chỉ báo lệch, không sửa (luôn thoát 0, trừ --strict)
//   node harden.mjs apply [--repo <dir>]            ghi/cập nhật file baseline, bật hook cho máy này
//
// Ghi: khối `hallo-security` trong .gitignore, .gitleaks.toml, scripts/secret-scan.mjs,
// scripts/git-hooks/pre-commit, .github/workflows/security.yml, .github/dependabot.yml,
// "prepare" trong package.json (bật hook khi `npm install`). Không đụng phần riêng của repo.
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const START = '# >>> hallo-security';
const END = '# <<< hallo-security';
// File do baseline tạo: có marker, hoặc (bản cũ) ghi nguồn hallo-claude/shared/security.
const MARK = 'hallo-security';
const ours = (text) => text.includes(MARK) || text.includes('hallo-claude/shared/security');
const HOOKS = 'scripts/git-hooks';
// Chạy được cả sh lẫn cmd (Windows); không có git (deploy từ git archive) thì bỏ qua.
const LEGACY_PREPARE = `git config core.hooksPath ${HOOKS} || true`;
const PREPARE = `node -e "try{require('child_process').execFileSync('git',['config','core.hooksPath','${HOOKS}'],{stdio:'ignore'})}catch{}"`;

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const tpl = (name) => readFileSync(join(HERE, name), 'utf8');
const sh = (args, cwd) => {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

export function repoInfo(root) {
  const remotes = sh(['remote'], root).split('\n').filter(Boolean);
  const remote = remotes.includes('origin') ? 'origin' : (remotes[0] ?? '');
  const has = (b) =>
    remote && sh(['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${b}`], root);
  const base = has('dev') ? 'dev' : 'main';
  const branches = [...new Set([base, ...['main', 'master'].filter((b) => has(b))])];
  return { base, branches, npm: existsSync(join(root, 'package-lock.json')) };
}

// Nội dung mong muốn của mỗi file baseline (đường dẫn trong repo → nội dung).
export function desiredFiles(info) {
  const npmAudit = info.npm ? tpl('templates/npm-audit.yml').replace(/\n$/, '') : '';
  const npmUpdates = info.npm ? tpl('templates/dependabot-npm.yml') : '';
  return {
    '.gitleaks.toml': tpl('gitleaks.toml'),
    'scripts/secret-scan.mjs': tpl('secret-scan.mjs'),
    [`${HOOKS}/pre-commit`]: tpl('templates/pre-commit'),
    '.github/workflows/security.yml': tpl('templates/security.yml')
      .replace('{{BRANCHES}}', info.branches.join(', '))
      .replace('{{NPM_AUDIT}}\n', npmAudit ? npmAudit + '\n' : ''),
    '.github/dependabot.yml': tpl('templates/dependabot.yml')
      .replace('{{NPM_UPDATES}}', npmUpdates)
      .replaceAll('{{BASE}}', info.base),
  };
}

// .gitignore với khối hallo-security mới (thay khối cũ, hoặc thêm vào cuối).
export function withIgnoreBlock(current, block) {
  const text = current ?? '';
  const b = block.trim();
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  // Mất dòng mở hoặc đóng → không đoán: báo để sửa tay, tránh ghi khối thứ hai.
  if (s >= 0 !== e >= 0 || (s >= 0 && e < s)) return null;
  if (s >= 0 && e > s) return text.slice(0, s) + b + text.slice(e + END.length);
  return (text.trimEnd() ? text.trimEnd() + '\n\n' : '') + b + '\n';
}

// Thêm "prepare" vào cuối khối "scripts" mà giữ nguyên định dạng còn lại của package.json.
export function withPrepare(text) {
  const entry = `"prepare": ${JSON.stringify(PREPARE)}`;
  const m = text.match(/"scripts"\s*:\s*\{/);
  if (!m) {
    const indent = (text.match(/\n([ \t]+)"/) ?? [, '  '])[1];
    return text.replace(
      /\s*\}\s*$/,
      `,\n${indent}"scripts": {\n${indent}${indent}${entry}\n${indent}}\n}\n`,
    );
  }
  const open = m.index + m[0].length;
  let depth = 1;
  let i = open;
  for (; i < text.length && depth; i++) {
    const ch = text[i];
    if (ch === '"') {
      // Bỏ qua chuỗi (có thể chứa { } hoặc \").
      for (i++; i < text.length && text[i] !== '"'; i++) {
        if (text[i] === '\\') i++;
      }
    } else if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  const close = i - 1;
  const body = text.slice(open, close);
  const indent = (body.match(/\n([ \t]+)"/) ?? [, '    '])[1];
  const trimmed = body.replace(/\s*$/, '');
  const tail = body.slice(trimmed.length);
  if (!trimmed.trim()) {
    const outer = (text.slice(0, m.index).match(/([ \t]*)$/) ?? [, ''])[1];
    return text.slice(0, open) + `\n${outer}  ${entry}\n${outer}` + text.slice(close);
  }
  return text.slice(0, open) + trimmed + `,\n${indent}${entry}` + tail + text.slice(close);
}

export function plan(root) {
  const info = repoInfo(root);
  const changes = [];
  const gi = read(join(root, '.gitignore'));
  const giNext = withIgnoreBlock(gi, tpl('gitignore.base'));
  if (giNext === null)
    changes.push({
      path: '.gitignore',
      conflict: true,
      why: 'khối hallo-security thiếu dòng mở/đóng — sửa tay',
    });
  else if (gi !== giNext)
    changes.push({
      path: '.gitignore',
      content: giNext,
      why: gi?.includes(START) ? 'khối cũ' : 'thiếu khối',
    });
  for (const [path, content] of Object.entries(desiredFiles(info))) {
    const now = read(join(root, path));
    if (now === content) continue;
    // File có sẵn không do baseline tạo (vd dependabot.yml riêng) → không ghi đè, báo để gộp tay.
    if (now !== null && !ours(now))
      changes.push({ path, conflict: true, why: 'file riêng của repo — gộp tay' });
    else changes.push({ path, content, why: now === null ? 'thiếu' : 'lệch bản chuẩn' });
  }
  const pkgPath = join(root, 'package.json');
  const pkgText = read(pkgPath);
  if (pkgText) {
    const pkg = JSON.parse(pkgText);
    const prepare = pkg.scripts?.prepare;
    if (!prepare) {
      changes.push({
        path: 'package.json',
        content: withPrepare(pkgText),
        why: 'thiếu "prepare" bật hook',
      });
    } else if (prepare === LEGACY_PREPARE) {
      // Bản baseline cũ (`|| true` không chạy trên cmd của Windows) → nâng lên bản hiện tại.
      changes.push({
        path: 'package.json',
        content: pkgText.replace(JSON.stringify(LEGACY_PREPARE), JSON.stringify(PREPARE)),
        why: '"prepare" bản cũ',
      });
    } else if (!prepare.includes('core.hooksPath'))
      changes.push({
        path: 'package.json',
        conflict: true,
        why: `"prepare" đã có (${prepare}) — thêm "${PREPARE}" tay`,
      });
  }
  const hooksPath = sh(['config', '--get', 'core.hooksPath'], root);
  const tracked = sh(['ls-files', '-ci', '--exclude-standard'], root).split('\n').filter(Boolean);
  return { info, changes, hookEnabled: hooksPath === HOOKS, tracked };
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] === 'apply' ? 'apply' : 'check';
  const repoAt = args.indexOf('--repo');
  const root = sh(['rev-parse', '--show-toplevel'], resolve(repoAt >= 0 ? args[repoAt + 1] : '.'));
  if (!root) {
    console.log('không ở trong git repo');
    return 0;
  }
  const result = plan(root);
  if (mode === 'apply') {
    for (const c of result.changes.filter((c) => !c.conflict)) {
      const full = join(root, c.path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, c.content);
      if (c.path.startsWith(HOOKS) || c.path.endsWith('secret-scan.mjs')) chmodSync(full, 0o755);
    }
    sh(['config', 'core.hooksPath', HOOKS], root);
  }
  if (args.includes('--json')) {
    console.log(
      JSON.stringify({ ...result, changes: result.changes.map(({ content, ...c }) => c) }, null, 2),
    );
    return 0;
  }
  const lines = [
    `hallo-security ${mode} · ${root} · base ${result.info.base}${result.info.npm ? ' · npm' : ''}`,
  ];
  if (!result.changes.length) lines.push('✓ baseline khớp bản chuẩn');
  for (const c of result.changes)
    lines.push(`${c.conflict ? '⚠' : mode === 'apply' ? '→' : '✗'} ${c.path}: ${c.why}`);
  const hookOn = mode === 'apply' || result.hookEnabled;
  lines.push(
    hookOn
      ? `✓ hook pre-commit bật (core.hooksPath=${HOOKS})`
      : `✗ hook chưa bật trên máy này — npm install hoặc git config core.hooksPath ${HOOKS}`,
  );
  if (result.tracked.length)
    lines.push(
      `⚠ ${result.tracked.length} file đã track nhưng nằm trong .gitignore: ${result.tracked.slice(0, 8).join(', ')}${result.tracked.length > 8 ? ', …' : ''} → kiểm rồi git rm --cached nếu là dữ liệu nhạy cảm`,
    );
  console.log(lines.join('\n'));
  const drift = result.changes.length > 0 || !hookOn;
  return args.includes('--strict') && mode === 'check' && drift ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.log(`harden lỗi: ${error.message}`);
  }
}
