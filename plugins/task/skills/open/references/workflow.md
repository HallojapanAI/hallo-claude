# Quy trình task HalloJapan: Plan → Issue → Review → Code

Mọi task, dù nhỏ hay lớn, đều đi qua cùng một vòng. Mục tiêu: người review thấy và duyệt kế hoạch **trước** khi code,
mọi quyết định có dấu vết trên GitHub, và quy trình đủ đều để dần tự động hóa.

```
1. /plan <yêu cầu>      Claude khảo sát code + hallo-system-knowledge, hỏi lại điểm cần chốt, viết plan
2. /task:open           issue mỗi repo bị ảnh hưởng (link chéo) + feature branch + đăng plan làm comment
3. (người) review       comment góp ý trên issue chính → gắn `plan-approved` ở issue của từng repo đồng ý
4. /task:go             kiểm label, áp góp ý (Plan vN+1 nếu đổi), code trên đúng branch
5. /review:diff → /git:ship (Closes #n) → /review:publish → /review:fix → merge
6. /task:done            đóng issue GitHub không tự đóng (PR vào dev), dọn worktree/nhánh, đánh dấu DONE → /kb:sync
```

## Plan phải có

- **Context**: vì sao làm, quyết định đã chốt với người yêu cầu.
- Dòng `**Repo ảnh hưởng:** hallo-api (chính), hallo-web` — repo đầu tiên là repo chính (đặt issue + plan).
- Thiết kế theo repo, file chính sẽ sửa, hàm/component dùng lại.
- **Chia PR**: mỗi PR tự build và deploy được → thành checklist trên issue.
- **Verification**: lệnh test, ca kiểm thử, cách thử tay.
- **Tham chiếu = link remote**: file/thư mục đã có trên GitHub ghi dạng `` `hallo-api/src/modules/products/items.service.ts:241` ``
  (luôn có tên repo, kèm dòng nếu cần) — `/task:open` đổi thành permalink theo commit `origin/dev`, người review bấm là tới đúng code.
  File sẽ tạo mới cũng ghi kèm tên repo (giữ dạng code). Không dùng đường dẫn tuyệt đối trên máy (`/Users/...`) hay đường dẫn
  thiếu tên repo khi file đã có remote; file chỉ có ở máy (ảnh demo, file tải về) → chỉ ghi tên file.

## Issue & branch

- Mỗi repo bị ảnh hưởng 1 issue. Issue chính chứa plan (comment `Plan vN`), issue phụ trỏ về `Thuộc <repo>#<n>`.
- Branch `<type>/<số issue của repo đó>-<slug>` từ `origin/dev`, push ngay để thấy trên GitHub.
- PR vào `dev` ghi `Closes #<n>` của đúng repo → merge thì issue tự đóng.
- Trạng thái task lưu local ở `<git common dir>/hallo-tasks.json` (nhiều task mỗi repo, dùng chung với worktree; không bao giờ commit); `/task:go`, `/task:status` tìm task trong mọi repo của workspace nên chạy từ repo nào cũng được.

## Label

| Label | Nghĩa |
| --- | --- |
| `plan` | Issue có plan đang chờ/đã review |
| `plan-approved` | Gắn **riêng ở issue từng repo**: repo đó được phép code. Plan đổi phạm vi repo nào → gỡ label repo đó, duyệt lại |
| `type:<feat/fix/…>` | Loại việc, khớp tiền tố branch |

## Hướng tự động hóa (sau khi quy trình ổn định)

1. GitHub Action khi gắn `plan-approved` → chạy Claude Code (`/task:go`) trên runner, mở PR nháp.
2. Bot comment tóm tắt góp ý chưa xử lý khi có `Plan vN` mới.
3. `/task:open` tự lấy task HJ-xxx từ hallo-system-knowledge/roadmap để điền `Refs`.
