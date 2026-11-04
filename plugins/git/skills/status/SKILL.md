---
name: status
description: Trạng thái git + PR + CI/pr-review của nhánh hiện tại, kèm đúng một bước nên làm tiếp.
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(node *)
---

# /git:status

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" status`

## Trả lời gọn (≤ 10 dòng)

1. Nhánh, base, ahead/behind, trạng thái working tree.
2. Commit chưa merge (tối đa 5).
3. PR: số, URL, draft/ready, review decision, check fail (nêu tên; `pr-review` fail → có finding P0/P1 hoặc vi phạm quy tắc).
4. Cảnh báo từ `việc kèm theo`.
5. **Một** bước tiếp, dạng lệnh: `/git:ship`, `/git:sync`, `/review:fix`, `/git:new …`, "chờ review"…
