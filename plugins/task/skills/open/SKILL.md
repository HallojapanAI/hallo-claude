---
name: open
description: Sau khi plan đã chốt — tạo issue GitHub cho từng repo bị ảnh hưởng (link chéo), feature branch từ origin/dev ở mỗi repo, và đăng toàn văn plan làm comment trên issue chính để review.
argument-hint: "[plan.md] [--repos api,web] [--type feat|fix|…] [--ref HJ-xxx]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(gh issue *)
  - Bash(gh label *)
  - Bash(gh auth status)
  - Bash(gh repo view *)
  - Bash(node *)
  - Bash(mktemp *)
---

# /task:open — plan → issue + branch

Input: `$ARGUMENTS`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Plan mới nhất: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" latest-plan`

Quy trình đầy đủ: [workflow.md](references/workflow.md) · Quy ước nhánh: skill `git:flow` (conventions.md §2).

## Làm theo thứ tự, dừng ngay khi một bước lỗi

1. **Plan**: dùng file trong input, không có thì plan mới nhất ở trên. Đọc toàn bộ. Không có plan → dừng, gợi ý `/plan <yêu cầu>`.
2. **Repo**: `--repos` > dòng `**Repo ảnh hưởng:**` trong plan > hỏi **một** câu. Repo đầu tiên = **repo chính**.
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" repos <list>` → path, slug, base. Repo không tồn tại → dừng.
3. **gh**: `gh auth status`. Chưa đăng nhập → dừng, nhắn người dùng chạy `! gh auth login`.
4. **Trùng**: ở repo chính `gh issue list -R <slug> --state open --search "<tiêu đề> in:title"`. Có issue gần trùng → hỏi dùng lại hay tạo mới.
5. **Label** (mỗi repo, idempotent): `gh label create plan --color 1D76DB --description "Plan đang chờ review" --force -R <slug>`,
   `plan-approved` (0E8A16, "Plan đã duyệt — Claude được bắt đầu code"), `type:<type>` (C5DEF5).
6. **Issue chính**: `gh issue create -R <slug> --title "<type>: <tóm tắt tiếng Việt ≤ 70 ký tự>" --label plan,type:<type> --body-file <tmp>`.
   Body theo [issue-body.md](references/issue-body.md): Context 3–6 dòng rút từ plan, phạm vi repo, checklist PR (mục "Chia PR" trong plan), `Refs HJ-xxx` nếu có.
7. **Issue phụ** (các repo còn lại): body ngắn — phần plan của repo đó (tiêu đề mục) + `Thuộc <slug-chính>#<n>`. Sau đó `gh issue edit` issue chính, thêm mục "Issue liên quan" liệt kê `<slug>#<m>`.
8. **Đăng plan**: `node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" chunks <plan> <tmpdir>` → mỗi file:
   `gh issue comment <n> -R <slug-chính> --body-file <file>`. Comment đầu mở bằng dòng `<!-- hallo-plan v1 -->` + `## Plan v1` (thêm vào file trước khi gửi).
9. **Branch** mỗi repo (`git -C <path>`): `<type>/<số issue của repo đó>-<slug>` (slug tiếng Anh kebab 2–5 từ, như `/git:new`).
   Working tree bẩn → báo và hỏi, không tự stash. `git fetch origin --prune` → `git switch -c <branch> origin/<base>` → `git push -u origin <branch>`.
   Branch đã có → hỏi switch hay đổi tên. Không bao giờ push vào dev/main.
10. **Lưu trạng thái** mỗi repo: chạy trong repo đó
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/task.mjs" save '{"issue":<n>,"repo":"<slug>","mainIssue":"<slug-chính>#<n>","branch":"<branch>","plan":"<đường dẫn plan>","planVersion":1,"status":"PLAN_REVIEW"}'`.
11. **Không code.** Dừng tại đây chờ review.

## Kết quả (≤ 8 dòng)

```
✓ Issue chính  HallojapanAI/hallo-api#57  <url>   (plan v1 đã đăng)
✓ Issue phụ    HallojapanAI/hallo-web#31  <url>
✓ Branch       feat/57-bulk-intake (api) · feat/31-bulk-intake (web) — đã push
  tiếp: review plan trên issue → comment góp ý → gắn label `plan-approved` → /task:go
```
