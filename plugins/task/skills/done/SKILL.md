---
name: done
description: Khép một task sau khi PR đã merge — kiểm PR từng repo, đóng issue mà GitHub không tự đóng (PR vào dev trong khi nhánh mặc định là main), đóng issue chính kèm tóm tắt, dọn worktree/nhánh đã merge, đánh dấu task DONE.
argument-hint: "[#n | owner/repo#n] [--force] [--keep-branches]"
disable-model-invocation: true
allowed-tools:
  - Bash(gh issue *)
  - Bash(gh pr list *)
  - Bash(gh pr view *)
  - Bash(gh repo view *)
  - Bash(gh auth status)
  - Bash(git -C *)
  - Bash(git worktree *)
  - Bash(git branch -d *)
  - Bash(git fetch *)
  - Bash(node *)
---

# /task:done — khép task

Input: `$ARGUMENTS`

Task đang mở trong workspace: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" tasks`

## Làm

1. **Chọn task**: input (`#n` = issue chính, hoặc `owner/repo#n`) > task hiện tại của repo này > nếu workspace chỉ có một task đang mở thì lấy nó; nhiều task → hỏi chọn **một**.
   Các repo của task = mọi mục cùng `mainIssue` ở trên.
2. **Mỗi repo** (`<repo>`, `<issue>`, `<branch>`):
   - `gh pr list -R <repo> --head <branch> --state all --json number,state,mergedAt,baseRefName,url` (task chia nhiều PR → thêm `--search "<issue> in:body"`).
   - `gh issue view <issue> -R <repo> --json state,stateReason` và `gh repo view <repo> --json defaultBranchRef`.
   - Trường hợp:
     | PR | Issue | Làm |
     | --- | --- | --- |
     | đã merge | còn mở | `gh issue close <issue> -R <repo> --comment "Xong qua #<pr> (merge vào <base>). GitHub chỉ tự đóng khi merge vào nhánh mặc định."` |
     | đã merge | đã đóng | không làm gì |
     | không có PR | đã đóng (not planned) | coi là xong |
     | chưa merge / đang mở | — | **dừng ở repo này**, báo; chỉ đóng khi có `--force` (comment lý do) |
3. **Issue chính**: mọi repo đã xong → nếu còn mở, comment tóm tắt (PR từng repo, việc tay còn lại nếu plan có ghi) rồi đóng. Còn repo chưa xong → không đóng, liệt kê.
4. **Dọn** (bỏ qua nếu `--keep-branches`), chỉ với repo đã merge, **hỏi một lần** cho cả danh sách:
   - Worktree của task (trường `worktree`, hoặc `git -C <path> worktree list` có `<branch>`): `git worktree remove <dir>` — từ chối nếu worktree còn thay đổi chưa commit (báo, không `--force`).
   - Nhánh local: `git -C <path> branch -d <branch>` (chỉ `-d`: git tự từ chối nếu chưa merge).
   - Nhánh remote: không tự xóa — gợi ý bật *Automatically delete head branches* trên GitHub.
5. **Trạng thái**: trong mỗi repo `node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" save '{"mainIssue":"<chính>","status":"DONE","doneAt":"<ISO>"}'`.
   Task vẫn được giữ (xem bằng `task.mjs tasks --all`); xóa hẳn: `task.mjs forget <mainIssue>`.
6. Gợi ý tiếp: `/kb:sync` để cập nhật hallo-system-knowledge theo các PR vừa merge.

## Kết quả (≤ 6 dòng)

```
✓ Task HallojapanAI/hallo-claude#8 DONE
  hallo-claude#8 ← #9 merged · hallo-system-knowledge#7 ← #8 merged · hallo-api#6, hallo-web#6 not planned
  đã đóng tay: — · dọn: 2 worktree, 3 nhánh local
  tiếp: /kb:sync
```
