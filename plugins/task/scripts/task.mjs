#!/usr/bin/env node
// task.mjs — tiện ích cho plugin task (không dependency, không bao giờ exit ≠ 0 khi dùng trong !`...`).
//
//   node task.mjs latest-plan                 đường dẫn plan mới nhất trong ~/.claude/plans
//   node task.mjs chunks <plan.md> <outdir>   chia plan thành các phần ≤ 60.000 ký tự (giới hạn comment GitHub)
//   node task.mjs repos [api,web,...]         đường dẫn + slug GitHub của các repo trong workspace
//   node task.mjs state                       trạng thái task của repo hiện tại (JSON, {} nếu chưa có)
//   node task.mjs tasks [mainIssue]           task đang mở trong mọi repo của workspace (chạy được từ bất kỳ repo nào)
//   node task.mjs save '<json>'               gộp JSON vào trạng thái task của repo hiện tại
//   node task.mjs linkify <in.md> <out.md>    `hallo-xxx/path[:L[-M]]` → permalink GitHub (commit của <remote>/dev, không có thì main);
//                                             file chưa có trên remote (file sẽ tạo mới) giữ nguyên
//
// Trạng thái lưu trong <git-dir>/hallo-task.json → không bao giờ bị commit.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const LIMIT = 60_000;
const ALIASES = { api: 'hallo-api', web: 'hallo-web', kb: 'hallo-system-knowledge', claude: 'hallo-claude' };

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
  const names = (list || 'api,web').split(',').map((n) => ALIASES[n.trim()] ?? n.trim()).filter(Boolean);
  return names.map((name) => {
    const path = join(ws, name);
    const ok = existsSync(join(path, '.git'));
    // Remote: ưu tiên `origin`, không có thì remote đầu tiên (vd hallo-claude đặt tên remote = tên repo).
    const remotes = ok ? sh('git', ['remote'], path).split('\n').filter(Boolean) : [];
    const remoteName = remotes.includes('origin') ? 'origin' : (remotes[0] ?? '');
    const remote = remoteName ? sh('git', ['remote', 'get-url', remoteName], path) : '';
    const slug = (remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/) ?? [])[1] ?? '';
    const has = (b) => remoteName && sh('git', ['rev-parse', '--verify', '--quiet', `refs/remotes/${remoteName}/${b}`], path);
    const base = has('dev') ? 'dev' : 'main';
    return { name, path, exists: ok, slug, remote: remoteName, base };
  });
}

// Ghi chú tham chiếu trong plan bằng `<repo>/<path>[:dòng]` → link GitHub cố định theo commit,
// để người review mở đúng phiên bản code mà plan dựa vào. In ra stderr số link đã đổi / chưa có trên remote.
export function linkify(text, resolver) {
  const stats = { linked: 0, local: [] };
  const out = text.replace(/(?<!\[)`(hallo-[a-z-]+)\/([^`\s:]+?)(\/)?(?::(\d+)(?:-(\d+))?)?`(?!\])/g, (m, repo, path, slash, l1, l2) => {
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

// Mọi repo cạnh nhau trong workspace có trạng thái task; lọc theo mainIssue nếu có.
function workspaceTasks(mainIssue) {
  const ws = workspace();
  const out = [];
  for (const name of existsSync(ws) ? readdirSync(ws) : []) {
    const path = join(ws, name);
    const gitDir = existsSync(join(path, '.git')) ? sh('git', ['rev-parse', '--absolute-git-dir'], path) : '';
    const f = gitDir ? join(gitDir, 'hallo-task.json') : '';
    if (!f || !existsSync(f)) continue;
    try {
      const state = JSON.parse(readFileSync(f, 'utf8'));
      if (!mainIssue || state.mainIssue === mainIssue) out.push({ name, path, ...state });
    } catch {
      /* file hỏng → bỏ qua */
    }
  }
  return out;
}

function stateFile() {
  const gitDir = sh('git', ['rev-parse', '--absolute-git-dir']);
  return gitDir ? join(gitDir, 'hallo-task.json') : '';
}
function readState() {
  const f = stateFile();
  try {
    return f && existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  } catch {
    return {};
  }
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
  else if (cmd === 'state') console.log(JSON.stringify(readState(), null, 2));
  else if (cmd === 'tasks') {
    const list = workspaceTasks(a);
    console.log(list.length ? JSON.stringify(list, null, 2) : '[] (không có task nào trong workspace)');
  }
  else if (cmd === 'save') {
    const f = stateFile();
    if (!f) console.log('không ở trong git repo');
    else {
      const next = { ...readState(), ...JSON.parse(a), updatedAt: new Date().toISOString() };
      writeFileSync(f, JSON.stringify(next, null, 2) + '\n');
      console.log(JSON.stringify(next));
    }
  } else console.log('Dùng: task.mjs latest-plan | chunks <plan> <outdir> | linkify <in> <out> | repos [api,web] | state | tasks [mainIssue] | save <json>');
} catch (e) {
  console.log(`task.mjs: ${e.message}`);
}
