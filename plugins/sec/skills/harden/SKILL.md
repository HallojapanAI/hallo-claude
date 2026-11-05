---
name: harden
description: Áp hoặc kiểm chuẩn bảo mật secret của HalloJapan trong repo hiện tại — khối .gitignore bảo mật, rule gitleaks, hook pre-commit chặn secret, CI secret-scan + npm audit, Dependabot. Dùng khi tạo repo mới, khi /setup:doctor báo lệch, hoặc khi được hỏi về chống lộ key/.env.
argument-hint: "[--check]"
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git *)
  - Bash(gitleaks *)
  - Read
---

# /sec:harden

Input: `$ARGUMENTS` — `--check`: chỉ báo lệch, không sửa.

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Hiện trạng: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/security/harden.mjs" check`

Bản chuẩn (một nguồn duy nhất): `hallo-claude/shared/security/` — rule trong `gitleaks.toml`, ignore trong `gitignore.base`.
Hướng dẫn cho người: `hallo-system-knowledge/runbooks/security-secrets.md`.

## Làm

1. `--check` → in hiện trạng ở trên, giải thích ngắn từng dòng ✗/⚠, dừng.
2. Working tree đang sửa file baseline (`.gitignore`, `package.json`, `.github/`) → báo, hỏi trước khi ghi.
3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/security/harden.mjs" apply` rồi hiện `git diff --stat` + diff `.gitignore`/`package.json`.
4. Dòng ⚠ **conflict** (file riêng của repo, vd `dependabot.yml` có sẵn, `prepare` đã có): gộp tay giữ ý của repo, thêm marker `hallo-security` vào comment đầu file.
5. Dòng ⚠ **file đã track nhưng bị ignore**: xem từng file. Dữ liệu nhạy cảm (`.env`, khóa, dump) → `git rm --cached <file>` và báo **xoay secret** nếu file từng lên GitHub. Không nhạy cảm (vd `.vscode/settings.json` chung của team) → giữ nguyên, ghi lý do.
6. Quét lịch sử: có `gitleaks` → `gitleaks git --config .gitleaks.toml --redact --no-banner`. Không có → gợi ý `brew install gitleaks`.
   Phát hiện cũ **đã xoay/vô hiệu** → thêm fingerprint vào `.gitleaksignore` kèm comment `# <ngày> đã xoay — <issue>`; chưa xoay → **dừng**, báo người quản trị xoay trước.
   Không bao giờ in giá trị secret (chỉ file:dòng, rule, 4 ký tự đầu).
7. Kiểm hook: tạo file tạm chứa `postgres://u:realpass123@h/db`, `git add` → `git commit` phải bị chặn; gỡ file tạm (`git restore --staged`, xóa). <!-- gitleaks:allow -->
8. Chạy check của repo (dòng `check:` ở trên) — `scripts/secret-scan.mjs` phải qua lint/format của repo.
9. Không commit thay: gợi ý `/git:ship` (nhánh `chore/<n>-security-baseline`).

## Kết quả (≤ 6 dòng)

`✓ baseline áp: <số file>` · hook: bật/chưa · lịch sử: sạch / N phát hiện cũ (đã ignore / cần xoay) · việc tay còn lại
(Secret scanning + Push protection, required check `secret-scan` trong branch protection).
