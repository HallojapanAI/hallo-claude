#!/usr/bin/env node
// task.mjs — tiện ích cho plugin task (không dependency, không bao giờ exit ≠ 0 khi dùng trong !`...`).
//
//   node task.mjs latest-plan                 đường dẫn plan mới nhất trong ~/.claude/plans
//   node task.mjs chunks <plan.md> <outdir>   chia plan thành các phần ≤ 60.000 ký tự (giới hạn comment GitHub)
//   node task.mjs repos [api,web,...]         đường dẫn + slug GitHub của các repo trong workspace
//   node task.mjs state                       trạng thái task của repo hiện tại (JSON, {} nếu chưa có)
//   node task.mjs save '<json>'               gộp JSON vào trạng thái task của repo hiện tại
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

function workspace() {
  const root = sh('git', ['rev-parse', '--show-toplevel']);
  return process.env.HALLO_WORKSPACE || (root ? dirname(root) : process.cwd());
}

function repos(list) {
  const ws = workspace();
  const names = (list || 'api,web').split(',').map((n) => ALIASES[n.trim()] ?? n.trim()).filter(Boolean);
  return names.map((name) => {
    const path = join(ws, name);
    const ok = existsSync(join(path, '.git'));
    const remote = ok ? sh('git', ['remote', 'get-url', 'origin'], path) : '';
    const slug = (remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/) ?? [])[1] ?? '';
    const base = ok && sh('git', ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/dev'], path) ? 'dev' : 'main';
    return { name, path, exists: ok, slug, base };
  });
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
  } else if (cmd === 'repos') console.log(JSON.stringify(repos(a), null, 2));
  else if (cmd === 'state') console.log(JSON.stringify(readState(), null, 2));
  else if (cmd === 'save') {
    const f = stateFile();
    if (!f) console.log('không ở trong git repo');
    else {
      const next = { ...readState(), ...JSON.parse(a), updatedAt: new Date().toISOString() };
      writeFileSync(f, JSON.stringify(next, null, 2) + '\n');
      console.log(JSON.stringify(next));
    }
  } else console.log('Dùng: task.mjs latest-plan | chunks <plan> <outdir> | repos [api,web] | state | save <json>');
} catch (e) {
  console.log(`task.mjs: ${e.message}`);
}
