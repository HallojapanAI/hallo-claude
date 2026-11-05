---
name: publish
description: Review tầng 1 một PR vào dev rồi đăng comment + status pr-review lên PR, bằng phiên gh và gói Claude Code của chính người chạy (không secret dùng chung, không phí API). Dùng trước khi xin approve PR.
argument-hint: "<api|web> <số PR> [--yes]"
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(npm run review:pr *)
  - Bash(gh pr view *)
  - Bash(gh api *)
  - Read
---

# /review:publish $ARGUMENTS

Điều kiện: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-review.mjs" preflight pr`

Pipeline giống hệt CI (cùng prompt, schema, quy tắc chặn), chạy bằng `hallo-system-knowledge/tools/ci/review-local.mjs`.
Hướng dẫn: `hallo-system-knowledge/runbooks/design-review-ci.md`.

## Làm

1. `ok` = false ở trên → in `problems`, hướng dẫn sửa, **dừng**.
2. Repo `api`|`web` + số PR từ input; thiếu → lấy PR của nhánh hiện tại (`gh pr view --json number,headRepository`) nếu đang ở hallo-api/hallo-web, không thì hỏi **một** câu.
3. PR đã có status `pr-review` (không phải pending) cho đúng HEAD
   (`gh api repos/HallojapanAI/<repo>/commits/<head>/status --jq '.statuses[]|select(.context=="pr-review")|.state'`) → báo, hỏi có review lại không.
4. **Review (gọi Claude đúng một lần)**, trong thư mục `kb`: `npm run review:pr -- <hallo-api|hallo-web> <n> --dry-run`.
   Lâu vài phút; không ghi gì lên GitHub. Lỗi → in phần cuối log, dừng.
5. **Cho xem**: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-review.mjs" summary "$(node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-review.mjs" path pr <repo> <n>)"`.
   In nguyên tóm tắt + bản xem trước comment mà dry-run in ra.
6. **Hỏi xác nhận** "Đăng lên PR #<n> (comment + status pr-review đứng tên @<gh>)?" — trừ khi input có `--yes`. Không đồng ý → dừng, ghi đường dẫn findings.
7. **Đăng đúng kết quả đã xem** (không gọi lại Claude): `npm run review:pr -- <repo> <n> --findings <đường dẫn findings>`.
   Báo "PR có commit mới" → nói rõ và đề nghị chạy lại từ bước 4.

Không bao giờ in token. Không tự sửa code theo findings — gợi ý `/review:fix`.

## Kết quả (≤ 5 dòng)

`✓ PR <repo>#<n>: <N> phát hiện (P0 x · P1 y) → status pr-review <success|failure>` + link PR + bước tiếp
(`/review:fix` nếu bị chặn, không thì chờ approve).
