---
name: system
description: Review tầng 2 (toàn hệ thống tại dev của hallo-api, hallo-web) rồi tạo/cập nhật issue gán người và ghi kết quả vào hallo-system-knowledge, bằng phiên gh và gói Claude Code của chính người chạy. Dùng sau khi merge một đợt vào dev.
argument-hint: "[--full] [--yes]"
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(npm run review:system *)
  - Bash(git -C *)
  - Read
---

# /review:system $ARGUMENTS

Điều kiện: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-review.mjs" preflight system`

## Làm

1. `ok` = false → in `problems` (thường: repo knowledge chưa ở `dev`, chưa sạch, hoặc behind → `git -C <kb> pull --ff-only`), **dừng**.
   Không tự stash hay đổi nhánh của repo knowledge.
2. **Review (gọi Claude đúng một lần)**, trong `kb`: `npm run review:system -- --dry-run` (+ `--full` nếu input có).
   "dev không có commit mới" → báo, dừng (thêm `--full` nếu muốn quét toàn bộ).
3. **Cho xem**: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-review.mjs" summary "$(node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-review.mjs" path system)"`,
   và `git -C <kb> diff --no-index --stat` giữa file hiện tại và `.review/system/preview/` (những gì sẽ đổi trong repo knowledge).
4. **Hỏi xác nhận** "Tạo/cập nhật issue (đứng tên @<gh>) và commit + push kết quả vào dev của hallo-system-knowledge?" — trừ khi `--yes`.
5. **Ghi đúng kết quả đã xem** (không gọi lại Claude):
   `npm run review:system -- --findings .review/system/findings.json --commit --push` (+ `--full` nếu bước 2 có).
   - "dev đã đổi" → chạy lại từ bước 2.
   - Push bị từ chối (người khác vừa chạy) → `git -C <kb> pull --rebase` rồi `git -C <kb> push`; xung đột → dừng, báo. Không force.

Không bao giờ in token.

## Kết quả (≤ 5 dòng)

Số issue tạo/cập nhật/đóng, RV mới, commit đã push vào repo knowledge, link `generated/system-review-latest.md`.
