---
name: pr
description: Tạo, cập nhật hoặc xem PR của nhánh hiện tại (base dev) theo mẫu HalloJapan — không commit.
argument-hint: "[view|edit|ready|draft] [ghi chú]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(node *)
---

# /git:pr

Input: `$ARGUMENTS` (mặc định: tạo nếu chưa có, không thì `view`).

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Mẫu body: [pr-body.md](${CLAUDE_PLUGIN_ROOT}/skills/flow/references/pr-body.md)

## Làm

- Nhánh bảo vệ → dừng, gợi ý `/git:new`.
- Thay đổi chưa commit → báo; PR chỉ chứa phần đã commit (gợi ý `/git:ship` nếu muốn gộp).
- Chưa push / ahead > 0 so với upstream → `git push -u origin HEAD`.
- **tạo**: `gh pr create --base dev` — title chuẩn commit, body theo mẫu, dựng từ `git log origin/dev..HEAD` + `git diff origin/dev...HEAD --stat`.
- **view**: `gh pr view --json number,title,url,state,isDraft,reviewDecision,mergeable,statusCheckRollup,comments`
  → tóm tắt: trạng thái, các check (đặc biệt `pr-review`), số comment chưa xử lý, có conflict không.
- **edit**: dựng lại body từ toàn bộ commit hiện tại, giữ phần người viết tay (ảnh, ghi chú), `gh pr edit --body-file -`.
- **ready** / **draft**: `gh pr ready` / `gh pr ready --undo`.

## Kết quả

URL PR + 1–3 dòng trạng thái + bước tiếp (vd: `pr-review` fail → `/review:fix`).
