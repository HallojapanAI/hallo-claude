---
name: ship
description: "Ship trọn gói: commit (nếu cần) → chạy check → push → mở/cập nhật PR vào dev. Lệnh dùng hằng ngày."
argument-hint: "[--draft] [--no-check] [-y] [ghi chú]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(node *)
  - Bash(npm run *)
  - Bash(npm test)
---

# /git:ship

Input: `$ARGUMENTS`
- `--draft`: mở PR nháp (bot `pr-review` chưa chạy).
- `--no-check`: bỏ bước check (phải ghi rõ trong PR body là chưa chạy).
- `-y`: không hỏi lại message commit / title PR.

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Quy ước: [conventions.md](${CLAUDE_PLUGIN_ROOT}/skills/flow/references/conventions.md) · Mẫu body: [pr-body.md](${CLAUDE_PLUGIN_ROOT}/skills/flow/references/pr-body.md)

## Làm theo thứ tự, dừng ngay khi một bước lỗi

1. **Nhánh**: đang ở nhánh bảo vệ → tạo nhánh như `/git:new` (đề xuất tên từ diff, hỏi một lần) rồi mang thay đổi sang.
2. **Commit**: còn thay đổi → làm đúng quy trình `/git:commit`.
3. **Việc kèm theo**: mục `việc kèm theo` ở trên chưa làm (OpenAPI R-013, migration, i18n) → báo và hỏi làm luôn hay ghi vào PR là việc còn lại.
4. **Cập nhật base**: `git fetch origin`; behind `origin/dev` > 0 → `git rebase origin/dev` (xung đột → dừng, hướng dẫn như `/git:sync`).
5. **Check** (trừ `--no-check`): chạy lệnh ở dòng `check:`. Fail → tóm tắt lỗi (file:dòng), đề xuất sửa; không push.
6. **Push**: `git push -u origin HEAD` (đã rebase nhánh đã push → `git push --force-with-lease`).
7. **PR**:
   - `gh pr view --json number,url,state,isDraft` để biết đã có PR chưa.
   - Chưa có → `gh pr create --base dev --title "<commit chuẩn>" --body-file -` (+ `--draft`). Nhiều commit → title tóm tắt cả nhánh theo chuẩn commit.
   - Body tiếng Việt theo pr-body.md: điền thật (thay đổi, kết quả check đã chạy, `Refs/Fixes` từ tên nhánh + commit), xóa dòng checklist không áp dụng.
   - Đã có → push là đủ; chỉ `gh pr edit --body-file -` nếu phạm vi thay đổi đáng kể.
   - `gh` chưa cài/chưa đăng nhập → in URL so sánh `https://github.com/<slug>/compare/dev...<branch>?expand=1` + body để dán, và nhắc `/setup:doctor`.

## Kết quả (≤ 6 dòng)

```
✓ ship feat/HJ-022-qr-revoke → PR #45 (ready)  <url>
  commits: 2 · check: pass · base: dev (up to date)
  liên quan: Refs HJ-022
  tiếp: chờ status pr-review + 1 approve → squash merge
```
