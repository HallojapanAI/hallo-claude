---
name: fix
description: Xử lý góp ý review của PR hiện tại (comment bot pr-review + reviewer) — lập kế hoạch, sửa, commit, push, trả lời.
argument-hint: "[số PR] [-y]"
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(node *)
  - Bash(npm run *)
  - Bash(npm test)
---

# /review:fix

Input: `$ARGUMENTS`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Làm

1. Xác định PR (input hoặc nhánh hiện tại). Đảm bảo đang ở đúng head branch và đã `git pull --ff-only`.
2. Thu thập góp ý chưa xử lý:
   - `gh pr view <n> --json comments,reviews,statusCheckRollup`
   - inline: `gh api repos/{owner}/{repo}/pulls/<n>/comments --paginate`
   - Comment tổng hợp của bot `pr-review` (bảng finding P0–P3, R-xxx).
3. Lập bảng kế hoạch: `# · nguồn (bot/người) · mức · file:dòng · việc sửa · đồng ý/phản biện`.
   Góp ý sai hoặc không áp dụng → ghi lý do phản biện, không sửa. Hiện bảng, chờ xác nhận (trừ `-y`).
4. Sửa theo thứ tự mức (P0 → P3). Vi phạm R-xxx → sửa theo cột "Cách làm đúng (DRY)", gom về helper chung nếu lặp nhiều chỗ.
5. Chạy check của repo. Commit theo chuẩn, gom theo chủ đề, vd `fix(auth): verify google email_verified (review)`.
6. `git push` (không rebase lại nếu không cần — giữ lịch sử review dễ theo dõi).
7. Đề xuất câu trả lời cho từng thread (đã sửa ở `<sha>` / lý do không sửa). Đăng bằng `gh` chỉ khi user đồng ý.
8. Bot `pr-review` tự chạy lại khi có commit mới — nhắc user chờ status.
