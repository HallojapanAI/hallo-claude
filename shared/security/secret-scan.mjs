#!/usr/bin/env node
// secret-scan — chặn secret / dữ liệu nhạy cảm trước khi commit. Không dependency, Node ≥ 20.
// BẢN GỐC: hallo-claude/shared/security/secret-scan.mjs (do /sec:harden chép vào scripts/ của repo).
//
//   node scripts/secret-scan.mjs --staged         hook pre-commit: phần đang stage
//   node scripts/secret-scan.mjs --range A..B     các commit trong khoảng (vd origin/dev..HEAD)
//
// Kiểm: file bị .gitignore nhưng vẫn bị stage (git add -f), file > 5 MB, nội dung khớp rule trong
// .gitleaks.toml. Có gitleaks thì để gitleaks quét nội dung (đủ rule mặc định); không thì dùng rule
// riêng của repo. Không bao giờ in giá trị secret. Thoát 1 khi có phát hiện.
// Bỏ qua một dòng là fixture có chủ đích: thêm comment `gitleaks:allow` trên chính dòng đó.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 5 * 1024 * 1024;
const git = (args, opts = {}) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });

// --- đọc rule từ .gitleaks.toml (chỉ phần cú pháp file này dùng) ---------------------------------
export function parseRules(toml) {
  const rules = [];
  const allow = { regexes: [], paths: [] };
  let cur = null;
  let section = '';
  const re = (src) => {
    const i = src.startsWith('(?i)');
    return new RegExp(i ? src.slice(4) : src, i ? 'i' : '');
  };
  const lines = toml.split('\n');
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].trim();
    if (line.startsWith('[[rules]]')) {
      cur = {};
      rules.push(cur);
      section = 'rule';
      continue;
    }
    if (line.startsWith('[allowlist]')) {
      section = 'allow';
      cur = null;
      continue;
    }
    if (line.startsWith('[')) {
      section = '';
      cur = null;
      continue;
    }
    const kv = line.match(/^(\w+)\s*=\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const str = (raw.match(/^'''(.*)'''$/) ?? raw.match(/^"(.*)"$/) ?? [])[1];
    if (section === 'rule' && cur) {
      if (key === 'id' || key === 'description') cur[key] = str;
      if (key === 'regex') cur.regex = re(str);
      if (key === 'path') cur.path = re(str);
      if (key === 'secretGroup') cur.group = Number(raw);
    }
    if (section === 'allow' && (key === 'regexes' || key === 'paths')) {
      // Mảng nhiều dòng: '''…''', mỗi phần tử một dòng.
      let body = raw;
      const closed = (b) => /\]\s*$/.test(b.replace(/'''.*?'''/g, ''));
      while (!closed(body) && n + 1 < lines.length) body += '\n' + lines[++n];
      for (const m of body.matchAll(/'''(.*?)'''/g)) allow[key].push(re(m[1]));
    }
  }
  return { rules: rules.filter((r) => r.id && r.regex), allow };
}

const mask = (s) => (s.length <= 4 ? '****' : `${s.slice(0, 4)}…(${s.length})`);

// Quét các dòng thêm mới của một file → [{ file, line, rule, hint }].
export function scanLines(file, lines, { rules, allow }) {
  if (allow.paths.some((p) => p.test(file))) return [];
  const found = [];
  for (const { n, text } of lines) {
    if (text.includes('gitleaks:allow')) continue;
    for (const rule of rules) {
      if (rule.path && !rule.path.test(file)) continue;
      const m = text.match(rule.regex);
      if (!m) continue;
      const secret = m[rule.group || 0] ?? m[0];
      if (allow.regexes.some((a) => a.test(secret))) continue;
      found.push({ file, line: n, rule: rule.id, hint: mask(secret) });
    }
  }
  return found;
}

// Dòng thêm mới theo file từ `git diff -U0` / `git show`.
export function addedLines(diff) {
  const files = new Map();
  let file = null;
  let n = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.startsWith('+++ b/') ? line.slice(6) : null;
      if (file && !files.has(file)) files.set(file, []);
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      n = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (line.startsWith('+')) files.get(file).push({ n: n++, text: line.slice(1) });
    else if (!line.startsWith('-') && !line.startsWith('\\')) n++;
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const rangeAt = args.indexOf('--range');
  const range = rangeAt >= 0 ? args[rangeAt + 1] : null;
  const root = git(['rev-parse', '--show-toplevel']).trim();
  const configPath = join(root, '.gitleaks.toml');
  const config = existsSync(configPath)
    ? parseRules(readFileSync(configPath, 'utf8'))
    : { rules: [], allow: { regexes: [], paths: [] } };
  const problems = [];

  if (!range) {
    const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
      .split('\0')
      .filter(Boolean);
    for (const file of staged) {
      // Bị .gitignore mà vẫn được stage → thường là `git add -f` nhầm (.env, khóa, dump).
      const ignored = spawnSync('git', ['check-ignore', '--no-index', '-q', file], { cwd: root });
      if (ignored.status === 0) problems.push(`${file}: file bị .gitignore nhưng đang được stage`);
      const size = Number(git(['cat-file', '-s', `:${file}`], { cwd: root }).trim());
      if (size > MAX_BYTES) problems.push(`${file}: ${(size / 1048576).toFixed(1)} MB > 5 MB`);
    }
  }

  // Nội dung: gitleaks (nếu có) hoặc rule của repo.
  const gitleaks = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  if (gitleaks.status === 0 && !process.env.HALLO_SECRET_SCAN_NO_GITLEAKS) {
    const cmd = range
      ? ['git', `--log-opts=${range}`, '--redact', '--no-banner', '--exit-code', '1']
      : ['git', '--staged', '--redact', '--no-banner', '--exit-code', '1'];
    if (existsSync(configPath)) cmd.push('--config', configPath);
    const r = spawnSync('gitleaks', cmd, { cwd: root, stdio: 'inherit' });
    if (r.status !== 0)
      problems.push('gitleaks phát hiện secret (chi tiết ở trên, giá trị đã được che)');
  } else {
    const diff = range
      ? git(['log', '-p', '-U0', '--no-color', '--format=', range], { cwd: root })
      : git(['diff', '--cached', '-U0', '--no-color'], { cwd: root });
    for (const [file, lines] of addedLines(diff))
      for (const f of scanLines(file, lines, config))
        problems.push(`${f.file}:${f.line}: ${f.rule} (${f.hint})`);
  }

  if (!problems.length) return 0;
  console.error('\n✗ hallo secret-scan chặn commit:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`
Cách xử lý:
  • Bỏ khỏi stage: git restore --staged <file>   • Giá trị trong .env.example → placeholder xxxxxxxx
  • Fixture có chủ đích → thêm comment "gitleaks:allow" trên đúng dòng đó
  • Secret thật đã từng push lên GitHub → XOAY NGAY rồi báo lead (runbooks/security-secrets.md)
`);
  return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`secret-scan lỗi: ${error.message}`);
    process.exitCode = 2;
  }
}
