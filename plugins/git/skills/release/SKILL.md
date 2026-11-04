---
name: release
description: Mở PR release từ dev sang nhánh release (main cho hallo-web, master cho hallo-api) kèm release note.
argument-hint: "[--dry-run]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(node *)
---

# /git:release

Input: `$ARGUMENTS`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Làm

1. `git fetch origin --prune --tags`. Nhánh đích = default branch (dòng `release:`); đích trùng `dev` → dừng (repo không có nhánh release).
2. `git log --first-parent --oneline origin/<đích>..origin/dev` — rỗng → báo không có gì để release.
3. Release note (tiếng Việt), nhóm theo type commit: **Tính năng** (feat), **Sửa lỗi** (fix), **Hiệu năng** (perf), **Khác**; mỗi dòng `- <summary> (#PR)`; mục **Breaking** nếu có `!`/`BREAKING CHANGE`; mục **Đã sửa RV** liệt kê `RV-xxx` xuất hiện.
4. Đã có PR mở `dev → <đích>` → cập nhật body. Chưa có → `gh pr create --base <đích> --head dev --title "release: <YYYY-MM-DD>"`. `--dry-run` → chỉ in note.
5. Nhắc: merge bằng **merge commit** (không squash); sau merge tag `vYYYY.MM.DD` (`git tag -a … && git push origin <tag>`) — chỉ làm khi user yêu cầu.
