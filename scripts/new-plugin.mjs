#!/usr/bin/env node
// Tạo plugin mới từ templates/plugin và đăng ký vào marketplace.
//   npm run new -- <tên> "<mô tả>" [category]
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const [name, description = '', category = 'workflow'] = process.argv.slice(2);
if (!/^[a-z][a-z0-9-]{1,20}$/.test(name ?? '')) {
  console.error('Dùng: npm run new -- <tên-ngắn-kebab> "<mô tả>" [category]\nTên ngắn vì người dùng gõ /<tên>:<skill>.');
  process.exit(1);
}
const dir = join(ROOT, 'plugins', name);
if (existsSync(dir)) {
  console.error(`plugins/${name} đã tồn tại`);
  process.exit(1);
}
cpSync(join(ROOT, 'templates', 'plugin'), dir, { recursive: true });

const fill = (p) => {
  for (const f of readdirSync(p)) {
    const full = join(p, f);
    if (statSync(full).isDirectory()) fill(full);
    else writeFileSync(full, readFileSync(full, 'utf8').replaceAll('__NAME__', name).replaceAll('__DESCRIPTION__', description || `Plugin ${name}`));
  }
};
fill(dir);

const mp = join(ROOT, '.claude-plugin', 'marketplace.json');
const market = JSON.parse(readFileSync(mp, 'utf8'));
market.plugins.push({ name, source: `./plugins/${name}`, category, tags: [], description: description || `Plugin ${name}` });
writeFileSync(mp, JSON.stringify(market, null, 2) + '\n');
console.log(`✓ plugins/${name} đã tạo và đăng ký. Tiếp:
  1. Sửa plugins/${name}/skills/hello → skill thật (đổi tên thư mục = tên lệnh /${name}:<skill>)
  2. npm run sync && npm run validate
  3. claude --plugin-dir plugins/${name}   # thử local
  4. Thêm "${name}@hallo": true vào plugins/setup/templates/project-settings.json nếu cả team cần`);
