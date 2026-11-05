---
name: repo
description: Gắn cấu hình Claude chuẩn team vào repo hiện tại — .claude/settings.json bật marketplace hallo + plugin, CLAUDE.md trỏ về AGENTS.md của hallo-system-knowledge. Lead chạy một lần mỗi repo.
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git *)
  - Read
---

# /setup:repo

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Mẫu settings: [project-settings.json](${CLAUDE_PLUGIN_ROOT}/templates/project-settings.json)

## Làm

1. **`.claude/settings.json`** (commit vào repo):
   - Chưa có → tạo từ mẫu.
   - Đã có → **merge**: thêm `extraKnownMarketplaces.hallo` và các khóa `enabledPlugins` còn thiếu; giữ nguyên mọi khóa khác. Hiện diff trước khi ghi.
   - hallo-system-knowledge: chỉ bật `git`, `kb` (không cần `review`, `sec`).
2. **`CLAUDE.md`** ở gốc repo — chưa có thì tạo đúng nội dung ngắn sau (đã có thì chỉ thêm dòng tham chiếu nếu thiếu):

   ```markdown
   # <repo>

   Đọc và làm theo `../hallo-system-knowledge/AGENTS.md` (bản đồ hệ thống, quy tắc ghi, memory).
   Git/GitHub theo plugin `git@hallo`: nhánh từ `dev`, PR vào `dev`, Conventional Commits — `/git:ship` để ship.
   Check trước khi push: `<lệnh check của repo>`. Quy tắc review: `../hallo-system-knowledge/roadmap/review-rules.md`.
   ```
3. **Bảo mật**: chạy `node "${CLAUDE_PLUGIN_ROOT}/scripts/security/harden.mjs" apply` (khối `.gitignore`, gitleaks, hook pre-commit, CI, Dependabot);
   xử lý dòng ⚠ như `/sec:harden` bước 4–6. Repo mới bắt buộc có baseline này trước PR đầu tiên.
4. Không commit thay: gợi ý `/git:ship` với nhánh `chore/claude-setup`.
