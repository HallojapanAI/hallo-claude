# review — Code review theo quy tắc R-xxx

| Lệnh | Việc |
| --- | --- |
| `/review:diff [path\|--staged]` | Review thay đổi local so với `origin/dev` — chạy trước `/git:ship` |
| `/review:pr <n\|url> [--post]` | Review một PR GitHub |
| `/review:fix [n] [-y]` | Xử lý góp ý của bot `pr-review` + reviewer: kế hoạch → sửa → commit → push |

- Quy tắc đọc trực tiếp từ `hallo-system-knowledge/roadmap/review-rules.md` (+ RV đang mở chạm file đã đổi) — không chép, luôn mới nhất.
- Chuẩn output giống tầng 1 CI: mức P0–P3, tiêu chí SEC/SCALE/REL/EXT/OPS/QA, gắn `R-xxx`.
- `diff` và `pr` chạy trong subagent `reviewer` chỉ-đọc (context fork) → không làm bẩn phiên đang code.
- Cần repo knowledge nằm cạnh repo code, hoặc `export HALLO_KB=/path/to/hallo-system-knowledge`.

Cài: `/plugin install review --marketplace HallojapanAI/hallo-claude`
