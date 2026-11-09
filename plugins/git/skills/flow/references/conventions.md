# Quy ước Git/GitHub — HalloJapan Group

Nguồn sự thật cho mọi skill trong marketplace `hallojapangroup`. Rút ra từ cách hallo-api, hallo-web,
hallo-system-knowledge đang vận hành (CI `deploy-dev.yml`, `review-trigger.yml`, `runbooks/design-review-ci.md`).

## 1. Mô hình nhánh

```
feat/HJ-022-qr-revoke ──PR (rebase)──► dev ──PR release (merge commit)──► main
fix/RV-002-google-email ─┘              │
                                        ├─ push dev = deploy VPS dev (deploy-dev.yml)
                                        └─ push dev = review hệ thống tầng 2 (hallo-system-knowledge)
```

| Nhánh | Vai trò | Ai ghi |
| --- | --- | --- |
| `dev` | Nhánh tích hợp, **base của mọi PR**. Code mới nhất. | Chỉ qua PR (required check `pr-review`) |
| `main` | Nhánh release (default branch trên GitHub) | Chỉ qua PR release từ `dev` |
| `<type>/<ref>-<slug>` | Nhánh làm việc, sống ngắn (≤ 3 ngày) | Tác giả |

- Không push thẳng `dev`/`main`/`master` — guard hook chặn.
- Repo **tắt** "Automatically delete head branches": PR release có head là chính `dev`, bật tự xóa thì merge release sẽ xóa luôn `dev`.
- Nhánh làm việc luôn tạo từ `origin/dev` mới nhất.
- Cập nhật nhánh bằng **rebase** lên `origin/dev`, push lại bằng `--force-with-lease` (chỉ trên nhánh của mình).
- PR nháp (draft) **không** được bot review tầng 1 — dùng draft cho WIP, chuyển ready khi muốn review.

## 2. Tên nhánh

```
<type>/<ref>-<slug>        ref tùy chọn
```

- `type`: `feat` · `fix` · `hotfix` · `refactor` · `perf` · `chore` · `docs` · `test` · `ci` (trùng type commit).
- `ref`: `HJ-022` (task roadmap) · `RV-002` (việc review) · `123` (số issue GitHub).
- `slug`: kebab-case tiếng Anh, 2–5 từ, ≤ 40 ký tự, không dấu.

Ví dụ: `feat/HJ-022-qr-revoke`, `fix/RV-002-google-email-verified`, `chore/bump-prisma-7-11`, `docs/runbook-deploy`.

## 3. Commit — Conventional Commits (tiếng Anh)

```
<type>(<scope>): <summary>

[body: vì sao, không phải cái gì — tiếng Anh hoặc Việt, wrap 100]

[footer: Refs HJ-022 | Fixes RV-002 | Closes #12 | BREAKING CHANGE: ...]
```

- `summary`: mệnh lệnh, chữ thường đầu câu, không dấu chấm cuối, tổng dòng đầu ≤ 72 ký tự.
- `type`: như tên nhánh. `feat`/`fix` hiện trong release note; `!` sau type/scope cho breaking (`feat(api)!: …`).
- `scope` = module/feature, ngắn:
  - hallo-api: `auth` `access` `shops` `members` `qr` `products` `workflow` `catalog` `images` `channels` `worker` `db` `config` `openapi` `deploy`
  - hallo-web: `auth` `workflow` `qr` `products` `dashboard` `team` `shops` `settings` `combos` `reports` `ui` `api` `i18n` `deploy`
  - hallo-system-knowledge: `domain` `arch` `adr` `roadmap` `runbook` `memory` `review` `tools`
- Mỗi commit một ý; tách commit khi diff chứa nhiều thay đổi không liên quan.
- Không commit: `.env*` (trừ `.env.example` placeholder), key, token, dump DB, ảnh khách hàng, `dist/`, `.tmp/`.
- Không `--no-verify`. Không attribution AI trong message (không `Co-Authored-By: Claude`, không "Generated with").
- Commit "Update", "wip", "fix bug" bị coi là không đạt — luôn mô tả cụ thể.

## 4. Pull Request

- **Base: `dev`**. PR được **rebase merge**: từng commit của nhánh lên `dev` nguyên vẹn (hash mới), không gộp.
  - Vì vậy **mỗi commit** phải đạt chuẩn mục 3 trước khi merge — gộp/sửa commit `wip`, `fixup`, "address review" bằng rebase trên nhánh của mình rồi `--force-with-lease`.
  - Title PR = dòng commit chính (`feat(qr): add label revoke flow`) — dùng cho release note.
- Body: theo [pr-body.md](pr-body.md) — tiếng Việt.
- Liên kết bắt buộc khi có:
  - `Refs HJ-022` — task roadmap (repo hallo-system-knowledge).
  - `Fixes RV-012` — sửa việc review → bot gắn `fix-in-pr`, merge thì tự đóng issue (RV → `DONE`).
  - `Fixes #34` — issue GitHub trong repo.
- Kích thước: mục tiêu ≤ 400 dòng đổi (trừ file sinh: `openapi.json`, `schema.d.ts`, migration lock). Lớn hơn → tách PR.
- Merge khi: CI xanh + status `pr-review` = success + ≥ 1 approve. Không `--admin`.
- Kiểu merge: `rebase` cho PR vào `dev` (repo tắt squash); `merge commit` cho PR release `dev → main`.
- Sau merge: `/git:clean` — xóa nhánh local và nhánh remote của mình (GitHub không tự xóa nữa).

## 5. Việc đi kèm bắt buộc theo loại thay đổi

| Khi đổi | Phải làm trong cùng PR (hoặc PR cặp) | Quy tắc |
| --- | --- | --- |
| DTO/controller hallo-api | Xuất lại `openapi/openapi.json` (`node --import @swc-node/register/esm-register src/tools/export-openapi.ts`); PR cặp ở hallo-web: copy schema vào `api-schema/` + `npm run api:generate` | R-013 |
| `prisma/schema.prisma` | Migration SQL trong `prisma/migrations/` + `npm run db:generate`; điều kiện lọc mới kèm index | R-005 |
| Endpoint `/shops/:shopId/...` | `ShopAccess.authorize` với hằng `*_ROLES` tường minh | R-001 |
| Gọi dịch vụ ngoài (Haravan, OpenAI, SMTP, sharp nặng) | Đưa vào job worker, không chạy trong request | R-002 |
| Text giao diện hallo-web | Đủ 3 locale `en` (gốc) / `vi` / `ja` | — |
| `fetch(` ở hallo-web | Chỉ qua `src/api/client.ts` | R-007 |
| `.env.example` | Chỉ placeholder `xxxxxxxx` | R-008 |
| Thay đổi đáng kể về hệ thống | Cập nhật hallo-system-knowledge (`/kb:sync`) | AGENTS.md |

Danh sách quy tắc đầy đủ, luôn mới nhất: `hallo-system-knowledge/roadmap/review-rules.md`.

## 6. Kiểm tra trước khi push

| Repo | Bắt buộc | Khi liên quan |
| --- | --- | --- |
| hallo-api | `npm run check && npm test` | `npm run test:integration` (DB/Redis), `npm run smoke` |
| hallo-web | `npm run check && npm test` | `npm run test:e2e`, `npm run smoke` |
| hallo-system-knowledge | `npm run kb:check` | `npm run kb:gen` khi code nguồn đổi |
| hallo-claude | `npm run validate` | — |

Node theo `.nvmrc` (24.x). CI chạy đúng các lệnh này trên `dev`, đỏ ở local = đỏ ở deploy.

## 7. Release

- PR `dev → main`, title `release: YYYY-MM-DD`, body = danh sách PR từ lần release trước, nhóm theo type.
- **Merge commit**, không rebase/squash: rebase merge tạo hash mới trên `main`, `main` lệch lịch sử với `dev` và lần release sau bị conflict. Gắn tag `vYYYY.MM.DD` sau khi merge.

## 8. Mức độ & tiêu chí (dùng chung cho review/security)

- Mức: `P0` khai thác được ngay/mất dữ liệu · `P1` sai chức năng/bảo mật, sửa trước merge · `P2` scale/bảo trì · `P3` gợi ý.
- Tiêu chí: `SEC` · `SCALE` · `REL` · `EXT` · `OPS` · `QA`.
- Bot `pr-review` fail khi có mục ≤ `P1` hoặc vi phạm quy tắc `ACTIVE`/`GUARDED`.
