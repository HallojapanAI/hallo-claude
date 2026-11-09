#!/usr/bin/env node
// task.mjs — tiện ích cho plugin task (không dependency, không bao giờ exit ≠ 0 khi dùng trong !`...`).
//
//   node task.mjs latest-plan                 đường dẫn plan mới nhất trong ~/.claude/plans
//   node task.mjs chunks <plan.md> <outdir>   chia plan thành các phần ≤ 60.000 ký tự (giới hạn comment GitHub)
//   node task.mjs repos [api,web,...]         đường dẫn + slug GitHub của các repo trong workspace
//   node task.mjs state [mainIssue]           task hiện tại (hoặc task chỉ định) của repo này (JSON, {} nếu chưa có)
//   node task.mjs save '<json>'               gộp JSON vào task có `mainIssue` trong JSON (không có → task hiện tại),
//                                             rồi đặt task đó làm hiện tại
//   node task.mjs list [--all]                các task của repo này (bỏ task DONE, trừ khi --all)
//   node task.mjs tasks [mainIssue] [--all]   task trong mọi repo của workspace (chạy được từ bất kỳ repo/worktree nào)
//   node task.mjs use <mainIssue>             đổi task hiện tại của repo này
//   node task.mjs forget <mainIssue>          xóa hẳn một task khỏi repo này
//   node task.mjs verify <repo-dir> [args…]   chạy `npm run local -- verify [args]` ở repo đó; log đầy đủ ra file,
//                                             chỉ in dòng tóm tắt (+ 40 dòng cuối khi FAIL) → ít token. Repo chưa có
//                                             script `local` → in "verify: SKIP". Luôn thoát 0.
//   node task.mjs linkify <in.md> <out.md>    `hallo-xxx/path[:L[-M]]` → permalink GitHub (commit của <remote>/dev, không có thì main);
//                                             file chưa có trên remote (file sẽ tạo mới) giữ nguyên
//
// Trạng thái lưu trong <git common dir>/hallo-tasks.json (chung cho bản clone và mọi worktree của repo,
// không bao giờ bị commit), dạng { current, tasks: { "<mainIssue>": {...} } } — một repo có nhiều task.
// File cũ hallo-task.json (một task/repo) được tự chuyển sang khi đọc.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { INTEGRATION, RELEASE, company, repoByAlias, repoNames } from './company.mjs';

const LIMIT = 60_000;
// Mặc định `repos` không có tham số: các repo có `deps` (code) — vd api,web.
const DEFAULT_REPOS = repoNames.filter((r) => company.repos[r].deps).map((r) => company.repos[r].alias ?? r).join(',');

const sh = (cmd, args, cwd = process.cwd()) => {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
  } catch {
    return '';
  }
};

function latestPlan() {
  const dir = join(homedir(), '.claude', 'plans');
  if (!existsSync(dir)) return '';
  return (
    readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ f: join(dir, f), t: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0]?.f ?? ''
  );
}

// Cắt theo heading (#, ##) để mỗi phần đọc được độc lập; đoạn quá dài thì cắt theo dòng.
export function chunk(text, limit = LIMIT) {
  if (text.length <= limit) return [text];
  const blocks = text.split(/\n(?=#{1,2} )/);
  const out = [];
  let cur = '';
  const push = (s) => {
    if (cur && cur.length + s.length + 1 > limit) {
      out.push(cur);
      cur = '';
    }
    cur = cur ? `${cur}\n${s}` : s;
  };
  for (const b of blocks) {
    if (b.length <= limit) push(b);
    else for (const line of b.split('\n')) push(line.slice(0, limit));
  }
  if (cur) out.push(cur);
  return out;
}

// Thư mục chứa các repo. Worktree (vd ~/tmp/hallo_worktrees/hallo-api-feat-2) tính theo repo gốc
// của nó (git common dir), nên vẫn thấy các repo cạnh repo gốc.
function workspace() {
  if (process.env.HALLO_WORKSPACE) return process.env.HALLO_WORKSPACE;
  const common = sh('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (common) return dirname(dirname(common));
  const root = sh('git', ['rev-parse', '--show-toplevel']);
  return root ? dirname(root) : process.cwd();
}

function repos(list) {
  const ws = workspace();
  const names = (list || DEFAULT_REPOS).split(',').map((n) => repoByAlias(n.trim())).filter(Boolean);
  return names.map((name) => {
    const path = join(ws, name);
    const ok = existsSync(join(path, '.git'));
    // Remote: ưu tiên `origin`, không có thì remote đầu tiên (vd hallo-claude đặt tên remote = tên repo).
    const remotes = ok ? sh('git', ['remote'], path).split('\n').filter(Boolean) : [];
    const remoteName = remotes.includes('origin') ? 'origin' : (remotes[0] ?? '');
    const remote = remoteName ? sh('git', ['remote', 'get-url', remoteName], path) : '';
    const slug = (remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/) ?? [])[1] ?? '';
    const has = (b) => remoteName && sh('git', ['rev-parse', '--verify', '--quiet', `refs/remotes/${remoteName}/${b}`], path);
    const base = has(INTEGRATION) ? INTEGRATION : RELEASE;
    return { name, path, exists: ok, slug, remote: remoteName, base };
  });
}

// Tên repo công ty (vd hallo-api|hallo-web|…) để nhận tham chiếu trong plan.
const REPO_ALT = repoNames.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

// Ghi chú tham chiếu trong plan bằng `<repo>/<path>[:dòng]` → link GitHub cố định theo commit,
// để người review mở đúng phiên bản code mà plan dựa vào. In ra stderr số link đã đổi / chưa có trên remote.
export function linkify(text, resolver) {
  const stats = { linked: 0, local: [] };
  const out = text.replace(new RegExp(`(?<!\\[)\`(${REPO_ALT})\\/([^\`\\s:]+?)(\\/)?(?::(\\d+)(?:-(\\d+))?)?\`(?!\\])`, 'g'), (m, repo, path, slash, l1, l2) => {
    const r = resolver(repo, path);
    if (!r) {
      stats.local.push(`${repo}/${path}`);
      return m;
    }
    stats.linked++;
    const anchor = l1 ? `#L${l1}${l2 ? `-L${l2}` : ''}` : '';
    const label = `${repo}/${path}${slash ?? ''}${l1 ? `:${l1}${l2 ? `-${l2}` : ''}` : ''}`;
    return `[\`${label}\`](https://github.com/${r.slug}/${r.kind}/${r.sha}/${path}${anchor})`;
  });
  return { text: out, stats };
}

function remoteResolver() {
  const cache = new Map();
  return (repo, path) => {
    if (!cache.has(repo)) {
      const [info] = repos(repo);
      const sha = info.exists && info.remote ? sh('git', ['rev-parse', `${info.remote}/${info.base}`], info.path) : '';
      cache.set(repo, info.slug && sha ? { ...info, sha } : null);
    }
    const info = cache.get(repo);
    if (!info) return null;
    const type = sh('git', ['cat-file', '-t', `${info.sha}:${path}`], info.path);
    if (type !== 'blob' && type !== 'tree') return null;
    return { slug: info.slug, sha: info.sha, kind: type === 'tree' ? 'tree' : 'blob' };
  };
}


// Gọi bộ kiểm "sau mỗi task" của repo (hallo-api/scripts/local.mjs) và rút gọn kết quả.
export function summarizeVerify(output, status) {
  const lines = output.trimEnd().split('\n');
  const summary = [...lines].reverse().find((l) => /^verify: (PASS|FAIL)/.test(l.trim()));
  const ok = status === 0 && summary?.includes('PASS');
  const head = !summary
    ? `verify: FAIL (thoát ${status}, không có dòng tóm tắt)`
    : ok || !summary.includes('PASS')
      ? summary.trim()
      : `verify: FAIL (thoát ${status} dù tóm tắt ghi "${summary.trim()}")`;
  return ok ? head : [head, ...lines.slice(-40)].join('\n');
}

function verify(dir, args) {
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg?.scripts?.local) return 'verify: SKIP (repo chưa có `npm run local`)';
  const logDir = join(homedir(), '.hallo-local', 'logs');
  mkdirSync(logDir, { recursive: true });
  const log = join(logDir, `task-verify-${Date.now()}.log`);
  const r = spawnSync('npm', ['run', '--silent', 'local', '--', 'verify', ...args], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  writeFileSync(log, output);
  return `${summarizeVerify(output, r.status)}\n(log: ${log})`;
}

const STORE = 'hallo-tasks.json';
const LEGACY = 'hallo-task.json';

// Thư mục git dùng chung của repo (worktree trỏ về repo gốc) + git-dir riêng (nơi bản cũ có thể đã ghi).
function gitDirs(cwd) {
  const common = sh('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
  const own = sh('git', ['rev-parse', '--absolute-git-dir'], cwd);
  if (!common) return null;
  // Bản cũ ghi vào git-dir riêng của từng worktree (<common>/worktrees/<tên>/).
  const wt = join(common, 'worktrees');
  const worktrees = existsSync(wt) ? readdirSync(wt).map((d) => join(wt, d)) : [];
  return { common, legacy: [...new Set([common, own, ...worktrees].filter(Boolean))] };
}

const readJson = (f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};

// Đọc kho task; gộp các file một-task cũ vào (không xóa chúng, chỉ không đọc lại sau khi đã ghi kho mới).
export function loadStore(storePath, legacyPaths = []) {
  const store = (existsSync(storePath) && readJson(storePath)) || { current: null, tasks: {} };
  store.tasks ??= {};
  if (!existsSync(storePath))
    for (const f of legacyPaths) {
      const old = existsSync(f) && readJson(f);
      if (old?.mainIssue && !store.tasks[old.mainIssue]) {
        store.tasks[old.mainIssue] = old;
        store.current ??= old.mainIssue;
      }
    }
  return store;
}

// Gộp patch vào task có key = patch.mainIssue (hoặc task hiện tại); task đó thành hiện tại.
export function upsert(store, patch, now = new Date().toISOString()) {
  const key = patch.mainIssue ?? store.current;
  if (!key) throw new Error('chưa có task hiện tại — truyền "mainIssue" trong JSON');
  store.tasks[key] = { ...store.tasks[key], ...patch, mainIssue: key, updatedAt: now };
  store.current = key;
  return store.tasks[key];
}

export const isOpen = (t) => t && t.status !== 'DONE';

function storeAt(cwd = process.cwd()) {
  const dirs = gitDirs(cwd);
  if (!dirs) return null;
  const path = join(dirs.common, STORE);
  return { path, store: loadStore(path, dirs.legacy.map((d) => join(d, LEGACY))) };
}
const saveStore = ({ path, store }) => writeFileSync(path, JSON.stringify(store, null, 2) + '\n');

function workspaceTasks(mainIssue, all) {
  const ws = workspace();
  const out = [];
  for (const name of existsSync(ws) ? readdirSync(ws) : []) {
    const path = join(ws, name);
    if (!existsSync(join(path, '.git'))) continue;
    const at = storeAt(path);
    for (const t of Object.values(at?.store.tasks ?? {}))
      if (mainIssue ? t.mainIssue === mainIssue : all || isOpen(t)) out.push({ name, path, ...t });
  }
  return out;
}

const [cmd, a, b] = process.argv.slice(2);
try {
  if (cmd === 'latest-plan') console.log(latestPlan() || '(không có plan trong ~/.claude/plans)');
  else if (cmd === 'chunks') {
    const parts = chunk(readFileSync(resolve(a), 'utf8'));
    mkdirSync(b, { recursive: true });
    parts.forEach((p, i) => {
      const head = parts.length > 1 ? `> Plan — phần ${i + 1}/${parts.length}\n\n` : '';
      const f = join(b, `plan-${String(i + 1).padStart(2, '0')}.md`);
      writeFileSync(f, head + p);
      console.log(f);
    });
  } else if (cmd === 'linkify') {
    const { text, stats } = linkify(readFileSync(resolve(a), 'utf8'), remoteResolver());
    writeFileSync(resolve(b), text);
    console.log(`linked ${stats.linked}; chưa có trên remote (file mới?): ${stats.local.length ? stats.local.join(', ') : 'không'}`);
  } else if (cmd === 'repos') console.log(JSON.stringify(repos(a), null, 2));
  else if (cmd === 'verify') console.log(verify(resolve(a ?? '.'), process.argv.slice(4)));
  else if (cmd === 'state') {
    const at = storeAt();
    const key = a && !a.startsWith('--') ? a : at?.store.current;
    console.log(JSON.stringify((key && at?.store.tasks[key]) || {}, null, 2));
  } else if (cmd === 'list') {
    const at = storeAt();
    const list = Object.values(at?.store.tasks ?? {}).filter((t) => a === '--all' || isOpen(t));
    console.log(JSON.stringify({ current: at?.store.current ?? null, tasks: list }, null, 2));
  } else if (cmd === 'tasks') {
    const all = process.argv.includes('--all');
    const list = workspaceTasks(a && !a.startsWith('--') ? a : null, all);
    console.log(list.length ? JSON.stringify(list, null, 2) : '[] (không có task nào đang mở trong workspace)');
  } else if (cmd === 'save' || cmd === 'use' || cmd === 'forget') {
    const at = storeAt();
    if (!at) console.log('không ở trong git repo');
    else if (cmd === 'save') {
      const task = upsert(at.store, JSON.parse(a));
      saveStore(at);
      console.log(JSON.stringify(task));
    } else if (!at.store.tasks[a]) console.log(`không có task ${a} trong repo này`);
    else {
      if (cmd === 'use') at.store.current = a;
      else {
        delete at.store.tasks[a];
        if (at.store.current === a) at.store.current = Object.keys(at.store.tasks)[0] ?? null;
      }
      saveStore(at);
      console.log(`${cmd === 'use' ? 'task hiện tại' : 'đã xóa'}: ${a}`);
    }
  } else
    console.log(
      'Dùng: task.mjs latest-plan | chunks <plan> <outdir> | linkify <in> <out> | repos [api,web] | state [mainIssue] | save <json> | list [--all] | tasks [mainIssue] [--all] | use <mainIssue> | forget <mainIssue> | verify <repo-dir> [args]',
    );
} catch (e) {
  console.log(`task.mjs: ${e.message}`);
}
