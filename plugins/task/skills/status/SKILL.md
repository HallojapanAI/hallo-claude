---
name: status
description: Trạng thái task đang làm — issue, label duyệt plan, version plan, branch, PR và đúng một bước nên làm tiếp.
allowed-tools:
  - Bash(gh issue view *)
  - Bash(gh pr list *)
  - Bash(gh auth status)
  - Bash(git status *)
  - Bash(git rev-parse *)
  - Bash(node *)
---

# /task:status

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Trạng thái task: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" state`

## Làm (chỉ đọc)

1. Không có trạng thái → thử lấy số issue từ tên branch; vẫn không có → báo "chưa có task", gợi ý `/plan` → `/task:open`.
2. `gh issue view <n> -R <slug> --json state,labels,url,comments` → có `plan-approved`? Plan version mới nhất? Số góp ý sau plan?
3. `gh pr list -R <slug> --head <branch> --json number,state,isDraft,url`.

## Kết quả (≤ 6 dòng) + đúng một bước tiếp

| Tình huống | Bước tiếp |
| --- | --- |
| Chưa `plan-approved`, chưa có góp ý | chờ review trên issue |
| Có góp ý sau plan | sửa plan → `/task:plan-update` |
| Đã `plan-approved`, chưa code | `/task:go` |
| Đang code, chưa PR | `/review:diff` → `/git:ship` |
| PR mở | `/git:status` / `/review:fix` |
