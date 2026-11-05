---
name: secrets
description: Quét nhanh secret/PII trong phần sắp commit hoặc sắp push (staged + commit chưa push). Dùng tự động trước commit/push khi diff chạm .env, config, test fixture, docs.
argument-hint: "[--staged | --branch]"
allowed-tools:
  - Bash(git diff *)
  - Bash(node *)
  - Bash(gitleaks *)
---

# Secret check (nhanh, < 30 giây)

Phạm vi: `$ARGUMENTS` — `--staged` (mặc định nếu có file staged) hoặc `--branch` (commit chưa có trên `origin/dev`).

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" secrets`

## Làm

0. Repo có `scripts/secret-scan.mjs` (baseline `/sec:harden`) → dùng nó: `node scripts/secret-scan.mjs --staged` hoặc `--range origin/dev..HEAD`
   (cùng rule `.gitleaks.toml` với hook và CI). Chưa có → `node "${CLAUDE_PLUGIN_ROOT}/scripts/security/secret-scan.mjs" …` chạy trong repo, rồi gợi ý `/sec:harden`.
   Các bước dưới chỉ là dự phòng khi không chạy được script.
1. Có gitleaks → `gitleaks git --staged --redact --no-banner` (staged) hoặc `gitleaks git --log-opts="origin/dev..HEAD" --redact --no-banner` (branch).
2. Không có → `git diff --cached -U0` / `git diff origin/dev...HEAD -U0`, chỉ xét dòng `+`, tìm:
   - file `.env`, `*.pem`, `*.key`, `id_rsa*`, `*.p12`, dump `.sql`
   - `(?i)(secret|token|passw(or)?d|api[_-]?key|client_secret|authorization:\s*bearer)\s*[:=]\s*['"]?[^'"\s]{8,}`
   - `sk-[A-Za-z0-9]{20,}`, `ghp_`/`github_pat_`, `AKIA[0-9A-Z]{16}`, `-----BEGIN [A-Z ]*PRIVATE KEY-----`
   - `postgres(ql)?://[^:]+:[^@]+@`, `redis://:[^@]+@`
   - email thật, SĐT, đường dẫn `/Users/<tên>` hoặc `/home/<tên>` (R-008)
3. `.env.example`: mọi giá trị phải là placeholder (`xxxxxxxx`, `localhost`, `changeme`) — giá trị trông thật là lỗi.
4. **Không in giá trị** — chỉ `file:dòng` + loại + 4 ký tự đầu.

## Kết quả

`✅ sạch` hoặc danh sách + hành động: bỏ khỏi stage (`git restore --staged <file>`), thay placeholder; đã push → xoay secret ngay rồi báo lead.
