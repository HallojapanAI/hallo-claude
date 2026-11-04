---
name: clean
description: Dọn nhánh local đã merge vào dev (hoặc remote đã xóa), có xác nhận trước khi xóa.
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(node *)
---

# /git:clean

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" clean`

## Làm

1. Gộp hai danh sách trên, bỏ nhánh hiện tại và `dev`/`main`/`master`.
2. Hiện danh sách → chờ user xác nhận (cho phép bỏ bớt).
3. Nhánh trong "merged" → `git branch -d`. Nhánh "gone" (squash merge nên git không thấy merged) → `git branch -D` (guard sẽ hỏi xác nhận).
4. Báo số nhánh đã xóa.
