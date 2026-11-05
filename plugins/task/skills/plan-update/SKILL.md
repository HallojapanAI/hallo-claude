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

Trạng thái task: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" state`

## Làm

1. Plan = file trong input > `plan` trong trạng thái. Issue = input > `mainIssue`.
2. Lấy bản trước: comment cuối có `<!-- hallo-plan vN -->` trên issue (`gh issue view --comments`). N mới = N + 1.
3. Viết 3–8 gạch đầu dòng "Thay đổi so với vN" (nội dung, không phải diff dòng).
4. `task.mjs chunks` → comment đầu: `<!-- hallo-plan v<N+1> -->` + `## Plan v<N+1>` + mục "Thay đổi" + plan.
5. `task.mjs save '{"planVersion":<N+1>}'` ở mỗi repo của task. Nếu label `plan-approved` đang có và thay đổi làm đổi phạm vi → hỏi người dùng có gỡ label để duyệt lại không (`gh issue edit --remove-label plan-approved`).

## Kết quả

Một dòng: `✓ Plan v<N+1> đã đăng <url comment>` + danh sách thay đổi.
