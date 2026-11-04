---
name: context
description: >-
  Tri thức hệ thống HalloJapan ở hallo-system-knowledge — nghiệp vụ (quy trình QR → website, trạng thái,
  combo, import), kiến trúc, ADR, task HJ-xxx, việc review RV-xxx, quy tắc R-xxx, glossary vi/ja/en.
  Dùng tự động khi câu hỏi hoặc việc code cần hiểu nghiệp vụ/kiến trúc, nhắc tới HJ-/RV-/R-, hoặc trước khi
  thiết kế tính năng mới trong hallo-api / hallo-web.
user-invocable: false
allowed-tools:
  - Bash(node *)
---

# Tri thức hệ thống — hallo-system-knowledge

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" --kb`

Đọc theo thứ tự (đường dẫn tính từ dòng `knowledge repo` ở trên), chỉ đọc phần cần:

1. `AGENTS.md` → `README.md` → `catalog/systems.yaml` (stack, đường dẫn, tích hợp).
2. `memory/known-drift.md`, `memory/open-questions.md` — chỗ tài liệu chưa đáng tin.
3. Theo chủ đề: `domain/` (nghiệp vụ, `glossary.md`), `architecture/`, `systems/<hallo-api|hallo-web>/`, `decisions/` (ADR).
4. Task: `roadmap/tasks/HJ-xxx_*.md` · Review: `roadmap/design-review.md` (RV-xxx), `roadmap/review-rules.md` (R-xxx).
5. Endpoint & trang: `generated/api-endpoints.md`, `generated/page-endpoint-table-map.md`.

Luật:
- Tài liệu và code mâu thuẫn → **code là sự thật hiện tại**; nêu chỗ lệch và đề xuất ghi vào `memory/known-drift.md`.
- Trích nguồn dạng `đường-dẫn:dòng` khi trả lời.
- Tên hệ thống chuẩn: `hallo-api`, `hallo-web`, `hallo-system-knowledge` (không dùng hallo-backend/hallo-frontend/hallo-ai).
- Không tìm thấy knowledge repo → nói rõ và gợi ý `/setup:init`.
