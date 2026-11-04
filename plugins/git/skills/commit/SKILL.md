---
name: commit
description: Commit thay đổi theo Conventional Commits chuẩn HalloJapan (hiện message, xác nhận rồi commit).
argument-hint: "[-y] [gợi ý nội dung]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(node *)
---

# /git:commit

Input: `$ARGUMENTS` — có `-y` (hoặc "luôn", "now") thì commit không hỏi lại.

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" commit`

Quy ước: [conventions.md §3](${CLAUDE_PLUGIN_ROOT}/skills/flow/references/conventions.md)

## Làm

1. Đang ở `dev`/`main`/`master` → dừng, đề xuất `/git:new` (đoán sẵn tên nhánh từ diff).
2. Đọc diff thật (`git diff --cached`, `git diff`) — không đoán từ tên file.
3. Quét secret trong phần sắp commit: `.env*` (trừ `.env.example`), chuỗi giống key/token/password/private key, email/SĐT khách hàng. Có → dừng và báo.
4. Chưa có gì staged → stage **theo đường dẫn cụ thể** các file thuộc cùng một ý. Không `git add -A`/`.` trừ khi user yêu cầu. File rác (`.tmp/`, `dist/`, log) không stage.
5. Diff chứa nhiều ý không liên quan → đề xuất tách thành nhiều commit (liệt kê nhóm file + message từng commit).
6. Soạn message:
   - `type(scope): summary` ≤ 72 ký tự, tiếng Anh, mệnh lệnh, không chấm cuối. Scope = module (xem conventions).
   - Body (khi cần): vì sao thay đổi, rủi ro. Footer: `Refs HJ-xxx` / `Fixes RV-xxx` lấy từ `ref` của tên nhánh nếu có.
   - Không attribution AI.
7. Hiện message trong khối code → chờ xác nhận (bỏ qua nếu `-y`). Commit bằng heredoc để giữ xuống dòng:
   `git commit -F- <<'MSG' … MSG`
8. Hook pre-commit fail → sửa nguyên nhân, stage lại, tạo commit **mới** (không `--amend` commit đã push, không `--no-verify`).

## Kết quả

`✓ <sha> <dòng đầu>` + bước tiếp (`/git:ship`).
