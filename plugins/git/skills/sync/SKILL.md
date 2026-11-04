---
name: sync
description: Cập nhật nhánh hiện tại lên origin/dev mới nhất bằng rebase, xử lý xung đột có hướng dẫn.
argument-hint: "[--merge]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(node *)
---

# /git:sync

Input: `$ARGUMENTS` — `--merge` để merge `origin/dev` thay vì rebase (khi nhánh có nhiều người cùng push).

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Làm

1. Working tree bẩn → `git stash push -u -m "git:sync"` (báo user), khôi phục ở cuối.
2. `git fetch origin --prune`.
3. Đang ở `dev`/`main`/`master` → chỉ `git pull --ff-only`; xong.
4. Nhánh làm việc: `git rebase origin/dev` (hoặc `git merge origin/dev` nếu `--merge`).
5. Xung đột:
   - Liệt kê file xung đột; với mỗi file đọc cả hai phía và **giải thích** khác biệt.
   - File sinh (`openapi/openapi.json`, `src/api/generated/schema.d.ts`, `package-lock.json`): không sửa tay — lấy bản `dev` rồi chạy lại lệnh sinh (`export-openapi`, `npm run api:generate`, `npm install`).
   - Code: đề xuất bản hợp nhất, sửa khi user đồng ý → `git add <file>` → `git rebase --continue`.
   - User muốn dừng → `git rebase --abort`.
6. Nhánh đã có upstream và đã rebase → hỏi rồi `git push --force-with-lease`.
7. `git stash pop` nếu đã stash.

## Kết quả

`✓ <branch> đã lên origin/dev @ <sha> · ahead N` + có cần push lại không.
