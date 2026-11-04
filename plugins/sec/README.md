# sec — Bảo mật

| Lệnh | Việc |
| --- | --- |
| `/sec:scan [--all\|path] [--deps]` | Quét bảo mật thay đổi (hoặc toàn repo) theo checklist NestJS/Prisma + React/Vite và quy tắc SEC |
| `/sec:secrets [--staged\|--branch]` | Quét secret/PII nhanh trước commit/push (Claude cũng tự gọi khi diff chạm `.env`, config) |

- `scan` chạy trong subagent `auditor` chỉ-đọc. Không bao giờ in giá trị secret.
- Có `gitleaks` thì dùng (`brew install gitleaks`), không thì regex.

Cài: `/plugin install sec --marketplace HallojapanAI/hallo-claude`
