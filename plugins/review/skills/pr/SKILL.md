---
name: pr
description: Review một Pull Request GitHub (số PR hoặc URL) theo quy tắc R-xxx và chuẩn tầng 1; tùy chọn đăng comment lên PR.
argument-hint: "<số PR | URL> [--post]"
context: fork
agent: reviewer
allowed-tools:
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git show *)
  - Bash(git blame *)
  - Bash(git status *)
  - Bash(git fetch *)
  - Bash(gh pr view *)
  - Bash(gh pr diff *)
  - Bash(node *)
---

# Review PR $ARGUMENTS

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Quy tắc

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-rules.mjs"`

## Làm

1. Thiếu số PR → dùng PR của nhánh hiện tại (`gh pr view --json number`).
2. `gh pr view <n> --json number,title,body,baseRefName,headRefName,author,files,commits,statusCheckRollup,comments`
   và `gh pr diff <n>`. PR khác repo hiện tại (URL) → thêm `-R owner/repo`.
3. Base khác `dev` (trừ PR release) → ghi nhận như một vấn đề OPS.
4. Mở file đầy đủ để kiểm ngữ cảnh: `git fetch origin pull/<n>/head:pr-<n>` rồi `git show pr-<n>:<path>` (không checkout).
5. Review như `/review:diff`; thêm: title đúng chuẩn commit, body có `Refs/Fixes` khớp nội dung, kích thước PR (> 400 dòng → gợi ý tách), comment bot `pr-review` đã có (không lặp lại; nêu nếu bot bỏ sót hoặc báo sai).

## Output

Cùng định dạng `/review:diff`, mở đầu bằng `PR #n — title (author) · base ← head`.

`--post` có trong input → **không tự đăng**: in bản comment markdown hoàn chỉnh và lệnh
`gh pr review <n> --comment --body-file -` để phiên chính đăng sau khi user xác nhận.

Muốn chạy đúng pipeline CI (cùng prompt + schema, ghi status `pr-review`): ở hallo-system-knowledge chạy
`npm run review:pr -- <hallo-api|hallo-web> <n> --dry-run` (cần `GITHUB_TOKEN`).
