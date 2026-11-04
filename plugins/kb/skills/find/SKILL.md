---
name: find
description: Tra nhanh trong hallo-system-knowledge theo ID (HJ-022, RV-002, R-001, ADR-003) hoặc từ khóa nghiệp vụ — trả lời ngắn kèm nguồn.
argument-hint: "<HJ-xxx | RV-xxx | R-xxx | từ khóa>"
allowed-tools:
  - Bash(node *)
  - Read
  - Grep
  - Glob
---

# /kb:find $ARGUMENTS

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" --kb`

## Làm

- `HJ-xxx` → `roadmap/tasks/HJ-xxx_*.md`: trạng thái, phụ thuộc, công việc chưa xong, tiêu chí hoàn thành.
- `RV-xxx` → dòng trong `roadmap/design-review.md`: mức, trạng thái, vấn đề, bằng chứng, khắc phục, nghiệm thu, liên quan; kiểm nhanh bằng chứng còn đúng trong code không.
- `R-xxx` → `roadmap/review-rules.md`: quy tắc, cách phát hiện, cách làm đúng, guard, các RV liên quan.
- `ADR-xxx` → `decisions/adr-xxx-*.md`.
- Từ khóa → grep `domain/ architecture/ systems/ decisions/ memory/ roadmap/` + `domain/glossary.md` (khớp vi/ja/en).

## Trả lời ≤ 12 dòng

Nội dung chính + nguồn `đường-dẫn:dòng` + (nếu là task/RV) bước tiếp: `/git:new fix RV-002 …`.
