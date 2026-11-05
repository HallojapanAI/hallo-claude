---
name: go
description: Bắt đầu code một task sau khi plan trên issue đã được duyệt (label plan-approved) — đọc góp ý review, cập nhật plan nếu cần, chuyển đúng branch rồi triển khai theo plan.
argument-hint: "[#n | owner/repo#n]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(gh issue *)
  - Bash(gh api *)
  - Bash(gh auth status)
  - Bash(node *)
  - Bash(mktemp *)
---

# /task:go — plan đã duyệt → code

Input: `$ARGUMENTS`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Task đang mở trong workspace: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" tasks`

## Làm

1. **Xác định task**: input > task của repo hiện tại > task trong workspace ở trên (chạy được từ bất kỳ repo nào).
   Nhiều task khác `mainIssue` → hỏi chọn. Không có → thử số trong tên branch (`feat/57-…`); vẫn không rõ → hỏi.
   Các repo của task = mọi mục cùng `mainIssue`.
2. **Kiểm duyệt từng repo**: với mỗi repo, `gh issue view <issue> -R <repo> --json labels,state,url`.
   - Duyệt **riêng từng repo**: chỉ repo có issue gắn `plan-approved` mới được code.
   - Không repo nào được duyệt → **dừng**, báo "plan chưa được duyệt" + link các issue.
   - Một phần được duyệt → báo repo nào sẽ làm, repo nào chờ; repo đang chờ mà PR của repo đã duyệt phụ thuộc vào (vd web cần API) → làm phần đã duyệt trước, nhắc trong kết quả.
   - Issue đã đóng → bỏ repo đó.
3. **Đọc plan + góp ý**: `gh issue view <n> -R <slug> --comments --json comments`.
   Plan hiện hành = comment cuối có `<!-- hallo-plan vN -->` (gộp các phần nếu bị chia). Góp ý = mọi comment **sau** nó (bỏ comment của bot).
4. **Áp góp ý**: tóm tắt từng góp ý thành 1 dòng. Có góp ý làm đổi plan → sửa file plan và đăng bản mới như `/task:plan-update` (v N+1),
   rồi báo người dùng các thay đổi. Góp ý mâu thuẫn/mơ hồ → hỏi trước khi code.
5. **Branch**: ở mỗi repo **đã duyệt**, `git switch <branch>` từ trạng thái task (chưa có branch → tạo như `/task:open` bước 10).
   `git fetch origin` và rebase lên `origin/dev` nếu bị behind.
6. **Trạng thái**: trong mỗi repo đã duyệt `task.mjs save '{"status":"IN_PROGRESS"}'`; comment 1 dòng lên issue của repo đó: `▶ Bắt đầu triển khai theo Plan vN`.
7. **Code**: làm theo plan, đúng thứ tự mục "Chia PR". Mỗi PR: code → test theo mục Verification → `/review:diff` → `/git:ship`
   (PR body có `Closes #<issue của repo đó>`). Đi lệch plan → ghi lại và báo trên issue, không âm thầm đổi phạm vi.

## Kết quả

Tóm tắt ≤ 6 dòng: plan version, số góp ý đã áp, repo đã duyệt / đang chờ, branch đang làm, PR/phần việc đầu tiên sẽ làm.
