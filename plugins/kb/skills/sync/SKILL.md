---
name: sync
description: Sau khi PR merge (hoặc xong một tính năng), cập nhật hallo-system-knowledge theo AGENTS.md — fact, quyết định, drift, changelog, trạng thái task HJ, sinh lại generated/ — rồi mở PR ở repo knowledge.
argument-hint: "[số PR | sha | mô tả]"
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git *)
  - Bash(gh pr view *)
  - Bash(npm run kb:*)
---

# /kb:sync

Nguồn thay đổi: `$ARGUMENTS` (mặc định: PR/nhánh hiện tại của repo code).

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Làm

1. Hiểu thay đổi: `gh pr view <n> --json title,body,files,mergeCommit` hoặc `git log/diff` của sha/nhánh.
   Ghi lại commit nguồn dạng `<sha7> (dev)` cho `verified_commit`.
2. Ở repo knowledge: `git -C <kb> fetch origin && git -C <kb> switch -c docs/<ref>-<slug> origin/dev`.
3. Đối chiếu bảng "Cập nhật memory" trong `AGENTS.md` và đề xuất danh sách cập nhật **trước khi sửa**:

   | Thay đổi | File |
   | --- | --- |
   | Sự thật mới về hệ thống (có nguồn) | `memory/facts/<chủ-đề>.md` theo `templates/fact.md` |
   | Quyết định đã chốt | `memory/decisions-log.md` (lớn → ADR `decisions/`) |
   | Câu hỏi chưa có lời đáp | `memory/open-questions.md` |
   | Tài liệu lệch code | `memory/known-drift.md` (hoặc sửa tài liệu kỹ thuật nếu rõ ràng) |
   | Thay đổi đáng kể | `memory/changelog/YYYY-MM.md` |
   | Tiến độ task | `roadmap/tasks/HJ-xxx_*.md` kèm bằng chứng (lệnh, kết quả, commit) |
   | Module/feature đổi | `systems/<hệ thống>/...` + frontmatter `verified_at`, `verified_commit` |

4. Sửa sau khi user đồng ý. Tiếng Việt; thuật ngữ mới thêm `domain/glossary.md` (vi/ja/en); không secret/PII.
   **Không sửa tay `generated/`** và không sửa trạng thái RV bằng tay khi đã có issue (đồng bộ tự động).
5. `npm run kb:gen` (nếu code nguồn đổi endpoint/trang) rồi `npm run kb:check` — phải sạch.
6. Commit `docs(<scope>): …` và mở PR vào `dev` của hallo-system-knowledge theo quy trình `/git:ship`.
