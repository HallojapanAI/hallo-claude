#!/usr/bin/env node
// Kiểm toàn bộ marketplace theo quy ước repo (chạy trong CI và trước mỗi PR):
//  - marketplace.json ↔ thư mục plugins/ khớp 1-1, tên trùng plugin.json, version semver
//  - SKILL.md / agents/*.md có frontmatter hợp lệ; name skill = tên thư mục; description đủ dài
//  - skill có tác dụng phụ (allowed-tools chứa git push/commit, gh pr create…) phải disable-model-invocation
//  - hooks.json đúng dạng { hooks: {...} }; file script được tham chiếu có tồn tại
//  - shared/ đã sync; không dùng thư mục commands/ (legacy)
//  - nếu có Claude CLI: chạy `claude plugin validate` cho marketplace + từng plugin
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const json = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    err(`${relative(ROOT, p)}: JSON lỗi — ${e.message}`);
    return null;
  }
};
// Frontmatter YAML tối giản: key: value, key: >- (khối), key:\n  - item
const frontmatter = (file) => {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      const v = kv[2].trim();
      fm[key] = v === '' || v === '>-' || v === '>' || v === '|' ? '' : v.replace(/^["']|["']$/g, '');
      continue;
    }
    if (key && /^\s+-\s+/.test(line)) fm[key] = [...(Array.isArray(fm[key]) ? fm[key] : []), line.replace(/^\s+-\s+/, '').trim()];
    else if (key && /^\s+\S/.test(line)) fm[key] = `${fm[key]} ${line.trim()}`.trim();
  }
  return { fm, body: text.slice(m[0].length) };
};
const SEMVER = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const SIDE_EFFECT = /git (push|commit|rebase|reset|switch|branch)|gh (pr (create|edit|merge|review)|api)|Bash\(git \*\)|Bash\(gh \*\)/;

// Marketplace
const market = json(join(ROOT, '.claude-plugin', 'marketplace.json'));
const dirs = readdirSync(join(ROOT, 'plugins')).filter((d) => statSync(join(ROOT, 'plugins', d)).isDirectory());
if (market) {
  if (!market.name || !market.owner?.name) err('marketplace.json: thiếu name/owner.name');
  const listed = new Set();
  for (const p of market.plugins ?? []) {
    listed.add(p.name);
    if (p.source !== `./plugins/${p.name}`) err(`marketplace: ${p.name} source phải là ./plugins/${p.name}`);
    if (!p.description) err(`marketplace: ${p.name} thiếu description`);
    if (p.version) warn(`marketplace: ${p.name} có version — chỉ khai báo version trong plugin.json`);
  }
  for (const d of dirs) if (!listed.has(d)) err(`plugins/${d} chưa có trong marketplace.json`);
  for (const n of listed) if (!dirs.includes(n)) err(`marketplace: ${n} không có thư mục plugins/${n}`);
}

for (const name of dirs) {
  const dir = join(ROOT, 'plugins', name);
  const rel = (p) => relative(ROOT, p);
  const manifest = json(join(dir, '.claude-plugin', 'plugin.json'));
  if (!manifest) continue;
  if (manifest.name !== name) err(`${name}: plugin.json name "${manifest.name}" ≠ tên thư mục`);
  if (!SEMVER.test(manifest.version ?? '')) err(`${name}: version "${manifest.version}" không phải semver`);
  if (!manifest.description) err(`${name}: thiếu description`);
  if (existsSync(join(dir, 'commands'))) warn(`${name}: commands/ là định dạng cũ — dùng skills/<tên>/SKILL.md`);
  if (!existsSync(join(dir, 'README.md'))) err(`${name}: thiếu README.md`);

  const skillsDir = join(dir, 'skills');
  for (const s of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
    const file = join(skillsDir, s, 'SKILL.md');
    if (!existsSync(file)) {
      err(`${rel(join(skillsDir, s))}: thiếu SKILL.md`);
      continue;
    }
    const parsed = frontmatter(file);
    if (!parsed) {
      err(`${rel(file)}: thiếu frontmatter`);
      continue;
    }
    const { fm, body } = parsed;
    if (fm.name && fm.name !== s) err(`${rel(file)}: name "${fm.name}" ≠ thư mục "${s}"`);
    if (!/^[a-z][a-z0-9-]{0,30}$/.test(s)) err(`${rel(file)}: tên skill phải kebab-case ngắn`);
    if ((fm.description ?? '').length < 30) err(`${rel(file)}: description quá ngắn (<30 ký tự) — Claude dựa vào nó để chọn skill`);
    const tools = [].concat(fm['allowed-tools'] ?? []).join(' ');
    const userOnly = fm['disable-model-invocation'] === 'true';
    const hidden = fm['user-invocable'] === 'false';
    if (SIDE_EFFECT.test(tools) && !userOnly && !/^(status|secrets)$/.test(s))
      warn(`${rel(file)}: allowed-tools có thao tác ghi git/gh nhưng Claude tự gọi được — cân nhắc disable-model-invocation: true`);
    if (hidden && userOnly) err(`${rel(file)}: vừa ẩn khỏi / vừa cấm Claude gọi → không ai dùng được`);
    if (fm.context === 'fork' && fm.agent && !['Explore', 'Plan', 'general-purpose'].includes(fm.agent) && !existsSync(join(dir, 'agents', `${fm.agent}.md`)))
      err(`${rel(file)}: agent "${fm.agent}" không có trong agents/`);
    for (const m of body.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g))
      if (!existsSync(join(dir, m[1]))) err(`${rel(file)}: tham chiếu ${m[1]} không tồn tại`);
    for (const m of body.matchAll(/\]\((?!https?:|\$\{|#)([^)#]+)/g))
      if (!existsSync(join(skillsDir, s, m[1]))) err(`${rel(file)}: link ${m[1]} hỏng`);
    if (/^```!/m.test(body) || [...body.matchAll(/!`([^`]+)`/g)].some((m) => /[|;&]|\$\(/.test(m[1])))
      err(`${rel(file)}: lệnh chèn ngữ cảnh không được có pipe/&&/; (bị kiểm quyền từng phần) — gói vào script node`);
    if (body.split('\n').length > 500) warn(`${rel(file)}: > 500 dòng — tách sang references/`);
  }

  const agentsDir = join(dir, 'agents');
  for (const a of existsSync(agentsDir) ? readdirSync(agentsDir).filter((f) => f.endsWith('.md')) : []) {
    const parsed = frontmatter(join(agentsDir, a));
    if (!parsed?.fm.name || !parsed.fm.description) err(`${rel(join(agentsDir, a))}: agent cần name + description`);
    else if (parsed.fm.name !== a.replace(/\.md$/, '')) err(`${rel(join(agentsDir, a))}: name ≠ tên file`);
  }

  const hooksFile = join(dir, 'hooks', 'hooks.json');
  if (existsSync(hooksFile)) {
    const h = json(hooksFile);
    if (h && typeof h.hooks !== 'object') err(`${rel(hooksFile)}: phải có khóa gốc "hooks"`);
    for (const m of JSON.stringify(h ?? {}).matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g))
      if (!existsSync(join(dir, m[1]))) err(`${rel(hooksFile)}: script ${m[1]} không tồn tại`);
  }
}

// Shared đồng bộ
try {
  execFileSync('node', [join(ROOT, 'scripts', 'sync-shared.mjs'), '--check'], { stdio: 'pipe' });
} catch (e) {
  err(String(e.stderr || e.stdout).trim());
}

// Claude CLI (nếu có)
let cli = false;
try {
  execFileSync('claude', ['--version'], { stdio: 'ignore' });
  cli = true;
} catch {}
if (cli && !process.argv.includes('--no-cli')) {
  for (const target of ['.', ...dirs.map((d) => `plugins/${d}`)]) {
    try {
      execFileSync('claude', ['plugin', 'validate', target], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    } catch (e) {
      err(`claude plugin validate ${target}:\n${String(e.stdout || '') + String(e.stderr || '')}`.trim());
    }
  }
} else if (!cli) warn('không có Claude CLI — bỏ qua `claude plugin validate`');

for (const w of warns) console.log(`⚠  ${w}`);
for (const e of errors) console.log(`✗ ${e}`);
console.log(errors.length ? `\n✗ ${errors.length} lỗi, ${warns.length} cảnh báo` : `✓ hợp lệ (${dirs.length} plugin, ${warns.length} cảnh báo)`);
process.exit(errors.length ? 1 : 0);
