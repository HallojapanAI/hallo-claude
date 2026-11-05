# review — Code review theo quy tắc R-xxx

| Lệnh | Việc |
| --- | --- |
| `/review:diff [path\|--staged]` | Review thay đổi local so với `origin/dev` — chạy trước `/git:ship` |
| `/review:pr <n\|url> [--post]` | Review một PR GitHub |
| `/review:publish <api\|web> <n> [--yes]` | Review tầng 1 rồi **đăng** comment + status `pr-review` lên PR (xem trước, xác nhận rồi mới đăng) |
| `/review:system [--full] [--yes]` | Review tầng 2 toàn hệ thống tại `dev` → issue gán người + ghi `design-review.md` |
| `/review:fix [n] [-y]` | Xử lý góp ý của bot `pr-review` + reviewer: kế hoạch → sửa → commit → push |

- Quy tắc đọc trực tiếp từ `hallo-system-knowledge/roadmap/review-rules.md` (+ RV đang mở chạm file đã đổi) — không chép, luôn mới nhất.
- Chuẩn output giống tầng 1 CI: mức P0–P3, tiêu chí SEC/SCALE/REL/EXT/OPS/QA, gắn `R-xxx`.
- `diff` và `pr` chạy trong subagent `reviewer` chỉ-đọc (context fork) → không làm bẩn phiên đang code.
- `diff`/`pr` chỉ để **tự xem**; `publish`/`system` **ghi lên GitHub**. Hai lệnh này chạy pipeline của CI bằng phiên `gh` và gói Claude Code của người chạy: không secret dùng chung, không phí API; Claude chạy một lần, kết quả đăng đúng bản đã xem.
- Cần repo knowledge nằm cạnh repo code, hoặc `export HALLO_KB=/path/to/hallo-system-knowledge`.

Cài: `/plugin install review --marketplace HallojapanAI/hallo-claude`
