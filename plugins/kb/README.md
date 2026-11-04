# kb — Tri thức hệ thống (hallo-system-knowledge)

| Lệnh | Việc |
| --- | --- |
| `/kb:find <HJ-022\|RV-002\|R-001\|từ khóa>` | Tra nhanh task, việc review, quy tắc, nghiệp vụ — kèm nguồn |
| `/kb:sync [PR\|sha]` | Sau khi merge: cập nhật memory/fact/drift/changelog/task theo `AGENTS.md`, `kb:gen`, `kb:check`, mở PR |

Skill `context` (tự động): khi bạn hỏi về nghiệp vụ/kiến trúc hoặc nhắc HJ-/RV-/R-, Claude tự đọc đúng phần của repo knowledge theo thứ tự trong `AGENTS.md`.

Cài: `/plugin install kb --marketplace HallojapanAI/hallo-claude`
