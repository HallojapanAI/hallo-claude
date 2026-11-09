# Quy ước HalloJapan Group (bản tóm tắt cho repo này)

Bản đầy đủ: `hallo-system-knowledge/AGENTS.md`, `roadmap/review-rules.md`, `hallo-claude/plugins/git/skills/flow/references/conventions.md`.
File này để Claude làm đúng **kể cả khi không có plugin `hallo` và không có repo tri thức bên cạnh** (cloud session, clone lẻ).

## Nhánh, commit, PR

- `dev` = nhánh tích hợp, base của mọi PR. `main` = release (chỉ PR `dev → main`). Không push thẳng `dev`/`main`/`master`, không force push (nhánh riêng: `--force-with-lease`), không `--no-verify`.
- Nhánh `<type>/<HJ-xxx|RV-xxx|n>-<slug>` tạo từ `origin/dev` mới nhất; cập nhật bằng rebase.
- Commit Conventional Commits tiếng Anh, mỗi commit một ý, chuẩn ngay từ đầu (PR được **rebase merge**, không gộp). Không attribution AI trong message.
- PR vào `dev`, title = dòng commit chính, body tiếng Việt (Tóm tắt / Thay đổi / Liên quan `Refs HJ-xxx` `Fixes RV-xxx` / Kiểm thử / Checklist). ≤ 400 dòng đổi. Merge khi CI xanh + `pr-review` success + 1 approve.
- Trong cloud session: mở PR ở trạng thái **draft** với nhánh `claude/...`, người thật đổi tên nhánh/ready khi review.

## Check trước khi push

- hallo-api, hallo-web: `npm run check && npm test`. hallo-system-knowledge: `npm run kb:check`.
- Cloud không có PostgreSQL/Redis local: bỏ `test:integration`, ghi rõ trong PR.

## Việc kèm theo bắt buộc

- Đổi DTO/controller hallo-api → xuất lại `openapi/openapi.json`, PR cặp ở hallo-web (`api-schema/` + `npm run api:generate`) — R-013.
- Đổi `prisma/schema.prisma` → migration trong `prisma/migrations/` + index cho điều kiện lọc mới — R-005.
- Endpoint `/shops/:shopId/...` → `ShopAccess.authorize` với hằng `*_ROLES` — R-001.
- Gọi dịch vụ ngoài (Haravan, OpenAI, SMTP) → job worker, không trong request — R-002.
- hallo-web: `fetch` chỉ qua `src/api/client.ts` — R-007; text UI đủ `en`/`vi`/`ja`.
- `.env.example` chỉ placeholder; không bao giờ commit `.env`, key, dump — R-008.

## Tài liệu và sự thật

- Code là sự thật hiện tại; tài liệu lệch → ghi `memory/known-drift.md` của hallo-system-knowledge (qua `/kb:sync` sau merge).
- Mức: P0 khai thác được / mất dữ liệu · P1 sai chức năng hoặc bảo mật · P2 scale/bảo trì · P3 gợi ý. Tiêu chí: SEC SCALE REL EXT OPS QA.
