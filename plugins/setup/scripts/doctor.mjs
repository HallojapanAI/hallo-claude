#!/usr/bin/env node
// doctor — kiểm môi trường dev HalloJapan. Chỉ đọc, không sửa gì. Luôn thoát 0.
//   node doctor.mjs [--json]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { plan as securityPlan } from './security/harden.mjs';
import { company, repoNames, requiredRepos } from './company.mjs';

const ORG = company.org;
const REPOS = repoNames;
const MARKET = company.marketplace;
const KB = company.kb;
const withFlag = (flag) => REPOS.filter((r) => company.repos[r][flag]);

const run = (cmd, args, opts = {}) => {
  try {
    return { ok: true, out: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000, ...opts }).trim() };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// Workspace: HALLO_WORKSPACE, hoặc thư mục cha của git root, hoặc cwd.
// Worktree ngoài workspace → tính theo repo gốc (git common dir).
const commonDir = run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']).out;
const gitRoot = commonDir ? dirname(commonDir) : run('git', ['rev-parse', '--show-toplevel']).out;
const candidates = [process.env.HALLO_WORKSPACE, gitRoot && dirname(gitRoot), process.cwd()].filter(Boolean).map((p) => resolve(p));
const ws = candidates.find((p) => REPOS.some((r) => existsSync(join(p, r, '.git')))) ?? candidates.at(-1);

const checks = [];
const add = (group, name, status, detail, fix = '') => checks.push({ group, name, status, detail, fix });

// Công cụ
const nodeV = process.version.slice(1);
const nvmrc = withFlag('nvmrc').map((r) => join(ws, r, '.nvmrc')).find(existsSync);
const want = nvmrc ? readFileSync(nvmrc, 'utf8').trim() : '24';
add('tools', 'node', nodeV === want ? 'ok' : nodeV.split('.')[0] === want.split('.')[0] ? 'warn' : 'fail', `${nodeV} (cần ${want})`, `nvm install ${want} && nvm use ${want}`);
const npmV = run('npm', ['-v']).out;
add('tools', 'npm', /^(10\.(9|[1-9]\d)|11)\./.test(npmV) ? 'ok' : 'fail', npmV || 'không có', 'npm i -g npm@11');
const gitV = run('git', ['--version']);
add('tools', 'git', gitV.ok ? 'ok' : 'fail', gitV.out.replace('git version ', ''), 'brew install git');
const gh = run('gh', ['--version']);
if (!gh.ok) add('tools', 'gh', 'fail', 'chưa cài — /git:ship, /git:pr, /review:* cần gh', 'brew install gh && gh auth login');
else {
  const auth = run('gh', ['auth', 'status']);
  add('tools', 'gh auth', auth.ok ? 'ok' : 'fail', auth.ok ? (auth.out.match(/account (\S+)/) ?? [])[1] ?? 'đã đăng nhập' : 'chưa đăng nhập', 'gh auth login -h github.com -p ssh');
}
add('tools', 'gitleaks', run('gitleaks', ['version']).ok ? 'ok' : 'warn', run('gitleaks', ['version']).ok ? 'có' : 'không có — hook dùng rule dự phòng, thiếu rule mặc định của gitleaks', 'brew install gitleaks');
add('tools', 'jq', run('jq', ['--version']).ok ? 'ok' : 'warn', run('jq', ['--version']).out || 'không có', 'brew install jq');

// Git identity + SSH
const uname = run('git', ['config', 'user.name']).out;
const umail = run('git', ['config', 'user.email']).out;
add('git', 'user.name/email', uname && umail ? 'ok' : 'fail', `${uname || '?'} <${umail || '?'}>`, 'git config --global user.name "Tên" && git config --global user.email "email@github"');
const ssh = run('ssh', ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', 'git@github.com']);
const sshOk = /successfully authenticated/i.test(ssh.out);
add('git', 'ssh github.com', sshOk ? 'ok' : 'fail', sshOk ? (ssh.out.match(/Hi ([^!]+)!/) ?? [])[1] ?? 'ok' : 'không xác thực được', 'ssh-keygen -t ed25519 && gh ssh-key add ~/.ssh/id_ed25519.pub');
add('git', 'pull.rebase', run('git', ['config', '--global', 'pull.rebase']).out === 'true' ? 'ok' : 'warn', run('git', ['config', '--global', 'pull.rebase']).out || 'chưa đặt', 'git config --global pull.rebase true');

// Repo trong workspace
for (const r of REPOS) {
  const dir = join(ws, r);
  if (!existsSync(join(dir, '.git'))) {
    const there = existsSync(dir);
    add('repos', r, company.repos[r].optional ? 'warn' : 'fail', there ? 'có thư mục nhưng chưa là git repo' : 'chưa clone', there ? `cd ${dir} && git init && git remote add origin git@github.com:${ORG}/${r}.git` : `git clone git@github.com:${ORG}/${r}.git ${dir}`);
    continue;
  }
  const g = (...a) => { const x = run('git', ['-C', dir, ...a]); return x.ok ? x.out : ''; };
  const branch = g('rev-parse', '--abbrev-ref', 'HEAD');
  const dirty = g('status', '--porcelain').split('\n').filter(Boolean).length;
  const behind = g('rev-list', '--count', 'HEAD..@{u}');
  const detail = [`nhánh ${branch}`, dirty ? `${dirty} file đang sửa` : 'sạch', behind ? `behind ${behind}` : 'chưa có upstream'];
  let status = 'ok';
  const needsEnv = Boolean(company.repos[r].env);
  if (company.repos[r].deps) {
    if (!existsSync(join(dir, 'node_modules'))) (status = 'warn'), detail.push('chưa npm ci');
    if (needsEnv && !existsSync(join(dir, '.env'))) (status = 'warn'), detail.push('chưa có .env');
  }
  add('repos', r, status, detail.join(' · '), status === 'ok' ? '' : `cd ${dir} && npm ci${needsEnv ? ' && cp -n .env.example .env' : ''}`);
}

// Bảo mật: baseline /sec:harden + hook pre-commit đã bật trên máy này
for (const r of REPOS) {
  const dir = join(ws, r);
  if (!existsSync(join(dir, '.git'))) continue;
  try {
    const sec = securityPlan(dir);
    const drift = sec.changes.map((c) => c.path);
    const status = drift.length ? 'fail' : sec.hookEnabled ? 'ok' : 'warn';
    const detail = drift.length ? `lệch: ${drift.join(', ')}` : sec.hookEnabled ? 'baseline khớp, hook bật' : 'baseline khớp, hook CHƯA bật trên máy này';
    add('security', r, status, detail, drift.length ? `cd ${dir} && /sec:harden` : `cd ${dir} && git config core.hooksPath scripts/git-hooks`);
  } catch {
    add('security', r, 'warn', 'không kiểm được', `cd ${dir} && /sec:harden --check`);
  }
}

// Claude plugins
const settingsFiles = [join(homedir(), '.claude', 'settings.json'), ...requiredRepos.map((r) => join(ws, r, '.claude', 'settings.json'))];
const enabled = new Set();
let marketKnown = false;
for (const f of settingsFiles) {
  const s = readJson(f);
  if (!s) continue;
  if (s.extraKnownMarketplaces?.[MARKET]) marketKnown = true;
  for (const [k, v] of Object.entries(s.enabledPlugins ?? {})) if (v && k.endsWith(`@${MARKET}`)) enabled.add(k.split('@')[0]);
}
const installed = readJson(join(homedir(), '.claude', 'plugins', 'known_marketplaces.json'));
if (installed && installed[MARKET]) marketKnown = true;
add('claude', `marketplace ${MARKET}`, marketKnown ? 'ok' : 'fail', marketKnown ? 'đã khai báo' : 'chưa khai báo', `claude plugin marketplace add ${ORG}/${company.pluginsRepo}`);
add('claude', 'plugins bật', enabled.size ? 'ok' : 'warn', enabled.size ? [...enabled].join(', ') : 'chưa thấy trong settings (có thể đã cài ở scope user)', `/setup:repo hoặc claude plugin install git@${MARKET}`);
add('claude', 'HALLO_KB', existsSync(join(ws, KB, company.kbMarker)) || process.env.HALLO_KB ? 'ok' : 'warn', process.env.HALLO_KB || join(ws, KB), `clone ${KB} cạnh các repo hoặc export HALLO_KB=<path>`);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ workspace: ws, checks }, null, 2));
} else {
  const icon = { ok: '✅', warn: '⚠️ ', fail: '❌' };
  console.log(`workspace: ${ws}`);
  let group = '';
  for (const c of checks) {
    if (c.group !== group) console.log(`\n[${(group = c.group)}]`);
    console.log(`${icon[c.status]} ${c.name}: ${c.detail}${c.status !== 'ok' && c.fix ? `\n     → ${c.fix}` : ''}`);
  }
  const n = (s) => checks.filter((c) => c.status === s).length;
  console.log(`\nTổng: ${n('ok')} ok · ${n('warn')} cảnh báo · ${n('fail')} lỗi`);
}
