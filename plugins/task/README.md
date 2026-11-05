# task — Plan → Issue → Review → Code

| Lệnh | Việc |
| --- | --- |
| `/task:open [plan.md] [--repos api,web] [--type feat] [--ref HJ-xxx]` | Tham chiếu `<repo>/<path>:dòng` → permalink GitHub; issue mỗi repo (link chéo) + label `plan`, branch `<type>/<n>-<slug>` từ `origin/dev` (đã push), đăng plan làm comment `Plan v1` |
| `/task:go [#n]` | Chạy từ repo bất kỳ trong workspace; chỉ code repo có issue gắn `plan-approved` (duyệt riêng từng repo): đọc góp ý sau plan, cập nhật plan nếu cần, chuyển branch, code theo plan |
| `/task:plan-update [plan.md] [#n]` | Đăng `Plan vN+1` kèm tóm tắt thay đổi |
| `/task:done [#n] [--force] [--keep-branches] [--skip-verify]` | Sau khi merge: chạy `npm run local -- verify` trên `dev` mới nhất, đóng issue mà GitHub không tự đóng (PR vào `dev`), đóng issue chính kèm tóm tắt, dọn worktree/nhánh đã merge, đánh dấu task DONE |
| `/task:status` | Issue/label/plan version/branch/PR + một bước tiếp |

Quy trình đầy đủ: [skills/open/references/workflow.md](skills/open/references/workflow.md).

Yêu cầu: `gh` đã đăng nhập (`gh auth login`), các repo nằm cạnh nhau trong workspace (đổi bằng `HALLO_WORKSPACE`).
Trạng thái task lưu ở `<git common dir>/hallo-tasks.json`: nhiều task mỗi repo, dùng chung cho mọi worktree, không bao giờ bị commit. File cũ `hallo-task.json` được tự chuyển sang.
