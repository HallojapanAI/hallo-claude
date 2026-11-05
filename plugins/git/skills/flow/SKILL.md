---
name: flow
description: >-
  Quy ước Git/GitHub của HalloJapan Group (nhánh dev, tên nhánh, Conventional Commits, PR vào dev,
  Fixes RV-xxx / Refs HJ-xxx, check trước push). Dùng tự động mỗi khi commit, push, tạo nhánh,
  rebase, mở/sửa PR, release, hoặc khi được hỏi về quy trình git trong hallo-api, hallo-web,
  hallo-system-knowledge. Ưu tiên hơn thói quen git chung chung.
user-invocable: false
allowed-tools:
  - Bash(node *)
---

# Git flow HalloJapan — luật cốt lõi

Ngữ cảnh repo hiện tại:

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## 10 luật

1. Base của mọi PR là **`dev`**. Không push thẳng `dev`/`main`/`master` (push `dev` = deploy + review hệ thống).
2. Nhánh: `<type>/<ref>-<slug>` từ `origin/dev` — vd `feat/HJ-022-qr-revoke`, `fix/RV-002-google-email-verified`.
3. Commit: `type(scope): summary` tiếng Anh, ≤ 72 ký tự, một ý mỗi commit. Không attribution AI.
4. PR: title = dòng commit chuẩn (squash merge), body tiếng Việt theo `references/pr-body.md`.
5. Liên kết: `Refs HJ-xxx`, `Fixes RV-xxx`, `Fixes #n` khi có (lấy gợi ý từ tên nhánh).
6. Chạy check của repo (dòng `check:` ở trên) trước khi push; đỏ thì sửa, không bỏ qua.
7. Làm đủ "việc kèm theo" (dòng `việc kèm theo:` ở trên): OpenAPI (R-013), migration, i18n en/vi/ja.
8. Không stage `.env*` (trừ `.env.example` placeholder), key, token, dữ liệu khách hàng. Stage theo đường dẫn cụ thể.
9. Không `--force` (chỉ `--force-with-lease` trên nhánh của mình), không `--no-verify`, không `gh pr merge --admin`.
10. Không merge PR khi check `Security` (`secret-scan`, `npm-audit`) đỏ, đang chạy hoặc chưa chạy — guard chặn `gh pr merge`; merge trên web cũng phải đợi xanh.
10. Thao tác phá hủy (`reset --hard`, `clean -f`, `branch -D`) chỉ khi user xác nhận rõ.

Chi tiết và bảng tham chiếu: [references/conventions.md](references/conventions.md).
Mẫu body PR: [references/pr-body.md](references/pr-body.md).

## Lệnh nhanh của team

| Lệnh | Việc |
| --- | --- |
| `/git:new feat HJ-022 qr revoke` | Tạo nhánh chuẩn từ `origin/dev` |
| `/git:commit` | Commit chuẩn (hiện message, xác nhận) |
| `/git:ship` | commit → check → push → mở PR vào dev |
| `/git:pr` | Tạo/cập nhật PR cho nhánh hiện tại |
| `/git:sync` | Rebase lên `origin/dev` mới nhất |
| `/git:status` | Trạng thái + PR + check + bước tiếp |
| `/git:release` | PR release `dev → main/master` |
| `/git:clean` | Dọn nhánh local đã merge |

Khi user nói chung chung ("commit giúp", "đẩy lên", "mở PR"), làm theo đúng quy trình của lệnh tương ứng ở trên.
