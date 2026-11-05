#!/usr/bin/env node
// Chép script dùng chung shared/*.mjs vào plugins/<p>/scripts/ theo khai báo metadata.shared của plugin.json.
// Plugin được cài vào cache riêng nên không đọc được file ngoài thư mục plugin → phải vendor.
//   node scripts/sync-shared.mjs          chép
//   node scripts/sync-shared.mjs --check  chỉ kiểm, lệch thì thoát 1 (CI)
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CHECK = process.argv.includes('--check');
let drift = 0;

for (const name of readdirSync(join(ROOT, 'plugins'))) {
  const manifest = join(ROOT, 'plugins', name, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifest)) continue;
  const shared = JSON.parse(readFileSync(manifest, 'utf8')).metadata?.shared ?? [];
  for (const file of shared) {
    const src = join(ROOT, 'shared', file);
    const dst = join(ROOT, 'plugins', name, 'scripts', file);
    if (!existsSync(src)) {
      console.error(`✗ ${name}: shared/${file} không tồn tại`);
      drift++;
      continue;
    }
    const same = existsSync(dst) && readFileSync(dst, 'utf8') === readFileSync(src, 'utf8');
    if (same) continue;
    if (CHECK) {
      console.error(`✗ ${name}/scripts/${file} lệch với shared/${file} — chạy npm run sync`);
      drift++;
    } else {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      chmodSync(dst, 0o755);
      console.log(`→ ${name}/scripts/${file}`);
    }
  }
}
if (CHECK && drift) process.exit(1);
if (!drift) console.log(CHECK ? '✓ shared đồng bộ' : '✓ sync xong');
