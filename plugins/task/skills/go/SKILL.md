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

Trạng thái task của repo này: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" state`

## Làm

1. **Xác định issue**: input > `mainIssue` trong trạng thái ở trên > số trong tên branch (`feat/57-…`). Không rõ → hỏi.
2. **Kiểm duyệt**: `gh issue view <n> -R <slug> --json labels,state,title,url`.
   Không có label `plan-approved` → **dừng**, báo "plan chưa được duyệt" + link issue. Issue đã đóng → dừng.
3. **Đọc plan + góp ý**: `gh issue view <n> -R <slug> --comments --json comments`.
   Plan hiện hành = comment cuối có `<!-- hallo-plan vN -->` (gộp các phần nếu bị chia). Góp ý = mọi comment **sau** nó (bỏ comment của bot).
4. **Áp góp ý**: tóm tắt từng góp ý thành 1 dòng. Có góp ý làm đổi plan → sửa file plan và đăng bản mới như `/task:plan-update` (v N+1),
   rồi báo người dùng các thay đổi. Góp ý mâu thuẫn/mơ hồ → hỏi trước khi code.
5. **Branch**: ở mỗi repo trong plan, `git switch <branch>` từ trạng thái task (chưa có branch → tạo như `/task:open` bước 10).
   `git fetch origin` và rebase lên `origin/dev` nếu bị behind.
6. **Trạng thái**: `task.mjs save '{"status":"IN_PROGRESS"}'`; comment lên issue chính: `▶ Bắt đầu triển khai theo Plan vN` (1 dòng).
7. **Code**: làm theo plan, đúng thứ tự mục "Chia PR". Mỗi PR: code → test theo mục Verification → `/review:diff` → `/git:ship`
   (PR body có `Closes #<issue của repo đó>`). Đi lệch plan → ghi lại và báo trên issue, không âm thầm đổi phạm vi.

## Kết quả

Tóm tắt ≤ 5 dòng: plan version, số góp ý đã áp, branch đang làm, PR/phần việc đầu tiên sẽ làm.
