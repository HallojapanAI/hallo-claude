# git — Git/GitHub chuẩn HalloJapan

| Lệnh | Việc |
| --- | --- |
| `/git:new feat HJ-022 qr revoke` | Nhánh `feat/HJ-022-qr-revoke` từ `origin/dev` |
| `/git:commit [-y]` | Conventional Commit (hiện message → xác nhận) |
| `/git:ship [--draft] [--no-check] [-y]` | commit → rebase dev → check → push → PR vào `dev` |
| `/git:pr [view\|edit\|ready\|draft]` | Tạo/xem/sửa PR, không commit |
| `/git:sync [--merge]` | Rebase lên `origin/dev`, gỡ xung đột có hướng dẫn |
| `/git:status` | Trạng thái + PR + check + 1 bước tiếp |
| `/git:release` | PR release `dev → main/master` + release note |
| `/git:clean` | Xóa nhánh local đã merge |

**Tự động** (không cần gõ):
- Skill `flow` nạp quy ước khi bạn nói "commit/push/mở PR…" bằng lời thường.
- Hook guard trên mọi lệnh Bash: **chặn** push vào `dev`/`main`/`master`, force push (cho phép `--force-with-lease` trên nhánh riêng), `--no-verify`, `git add .env`, `gh pr merge --admin`, **`gh pr merge` khi check `Security` (secret-scan, npm-audit) đỏ / đang chạy / chưa chạy**; **hỏi lại** trước `reset --hard`, `clean -f`, `checkout .`, `branch -D`.
  Tắt tạm: chạy `HALLO_GUARD=off claude`.

Quy ước đầy đủ: [skills/flow/references/conventions.md](skills/flow/references/conventions.md).

Cài: `/plugin install git --marketplace HallojapanAI/hallo-claude`
