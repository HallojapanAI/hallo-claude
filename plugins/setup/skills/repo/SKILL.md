---
name: repo
description: Gắn cấu hình Claude chuẩn team vào repo hiện tại — .claude/settings.json bật marketplace hallo + plugin và hook SessionStart cho cloud session, .claude/rules/hallo.md (quy ước tóm tắt, dùng được khi không có plugin), CLAUDE.md trỏ về AGENTS.md của hallo-system-knowledge. Lead chạy một lần mỗi repo.
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git *)
  - Read
---

# /setup:repo

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Mẫu: [project-settings.json](${CLAUDE_PLUGIN_ROOT}/templates/project-settings.json) · [CLAUDE.md](${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md) · [rules-hallo.md](${CLAUDE_PLUGIN_ROOT}/templates/rules-hallo.md)

Vì sao có 3 file: plugin `hallo` chỉ nạp trên máy đã cài; **cloud session (claude.ai/code, app điện thoại) không nạp plugin và không có
`../hallo-system-knowledge`** — chỉ đọc `CLAUDE.md`, `.claude/rules/*.md` và hook trong `.claude/settings.json` đã commit.

## Làm

1. **`.claude/settings.json`** (commit vào repo):
   - Chưa có → tạo từ mẫu.
   - Đã có → **merge**: thêm `extraKnownMarketplaces.hallo`, các khóa `enabledPlugins` còn thiếu và hook `SessionStart` (nếu chưa có hook cùng lệnh); giữ nguyên mọi khóa khác. Hiện diff trước khi ghi.
   - hallo-system-knowledge: chỉ bật `git`, `kb` (không cần `review`, `sec`); hook `SessionStart` vẫn giữ (repo có `package-lock.json`).
   - Hook chỉ chạy khi `CLAUDE_CODE_REMOTE=true` (cloud) và chưa có `node_modules`: `npm ci` + `npm run --if-present db:generate`. Máy cá nhân không bị ảnh hưởng.
2. **`.claude/rules/hallo.md`**: chép từ mẫu `rules-hallo.md` (đã có → ghi đè nếu khác, hiện diff).
3. **`CLAUDE.md`** ở gốc repo — chưa có thì tạo từ mẫu `CLAUDE.md`, thay `<repo>` và `<lệnh check của repo>` theo dòng `check:` ở trên
   (đã có thì chỉ thêm các dòng tham chiếu còn thiếu: `.claude/rules/hallo.md`, link GitHub hallo-system-knowledge).
4. **Bảo mật**: chạy `node "${CLAUDE_PLUGIN_ROOT}/scripts/security/harden.mjs" apply` (khối `.gitignore`, gitleaks, hook pre-commit, CI, Dependabot);
   xử lý dòng ⚠ như `/sec:harden` bước 4–6. Repo mới bắt buộc có baseline này trước PR đầu tiên.
5. Không commit thay: gợi ý `/git:ship` với nhánh `chore/claude-setup`. Sau khi merge, thành viên chỉ cần trust thư mục khi mở Claude
   (plugin chưa có trong cache → `claude plugin install git@hallo review@hallo sec@hallo kb@hallo setup@hallo task@hallo` một lần).
