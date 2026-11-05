---
name: plan-update
description: Đăng bản plan đã sửa lên issue của task thành comment "Plan vN" mới, kèm tóm tắt điểm khác so với bản trước.
argument-hint: "[plan.md] [#n]"
disable-model-invocation: true
allowed-tools:
  - Bash(gh issue *)
  - Bash(gh auth status)
  - Bash(node *)
  - Bash(mktemp *)
  - Bash(git *)
---

# /task:plan-update

Input: `$ARGUMENTS`

Task đang mở trong workspace: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" tasks`

## Làm

1. Plan = file trong input > `plan` trong trạng thái. Issue = input > `mainIssue`.
2. Lấy bản trước: comment cuối có `<!-- hallo-plan vN -->` trên issue (`gh issue view --comments`). N mới = N + 1.
3. Viết 3–8 gạch đầu dòng "Thay đổi so với vN" (nội dung, không phải diff dòng).
4. Link remote như `/task:open` bước 8 (`task.mjs linkify`), rồi `task.mjs chunks` → comment đầu: `<!-- hallo-plan v<N+1> -->` + `## Plan v<N+1>` + mục "Thay đổi" + plan.
5. `task.mjs save '{"mainIssue":"<chính>","planVersion":<N+1>}'` ở mỗi repo của task. Repo nào có `plan-approved` mà thay đổi làm đổi phạm vi **của repo đó** → hỏi người dùng có gỡ label ở issue repo đó để duyệt lại không (`gh issue edit <n> -R <repo> --remove-label plan-approved`).

## Kết quả

Một dòng: `✓ Plan v<N+1> đã đăng <url comment>` + danh sách thay đổi.
