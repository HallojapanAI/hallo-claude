---
name: scan
description: Quét bảo mật thay đổi hiện tại (mặc định) hoặc toàn repo — secret, phân quyền theo shop, auth/OAuth, rate limit, upload, injection, XSS/CSP, CSRF, phụ thuộc — theo quy tắc SEC của HalloJapan.
argument-hint: "[--all | đường dẫn] [--deps]"
context: fork
agent: auditor
allowed-tools:
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git show *)
  - Bash(git blame *)
  - Bash(git status *)
  - Bash(git fetch *)
  - Bash(node *)
  - Bash(npm audit *)
  - Bash(gitleaks *)
---

# Security scan

Phạm vi: `$ARGUMENTS` — mặc định thay đổi so với `origin/dev` (cả chưa commit); `--all`: toàn repo; `--deps`: thêm `npm audit`.

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Quy tắc & RV bảo mật đang mở

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-rules.mjs" --sec --all-rv`

## Checklist theo stack

**Chung**
- Secret/PII trong code, test, docs, `.env.example` (R-008): `gitleaks detect --no-banner --redact` nếu có; không thì grep `(?i)(secret|token|password|api[_-]?key|private key|BEGIN [A-Z ]*KEY)`.
- Phụ thuộc (`--deps`): `npm audit --omit=dev --json` → chỉ báo high/critical có đường tới code chạy thật.

**hallo-api (NestJS + Prisma)**
- Endpoint `/shops/:shopId/...` thiếu `ShopAccess.authorize` hoặc vai trò `null` cho thao tác ghi/dữ liệu nhạy cảm; DTO lộ cost/nguồn/secret (R-001). IDOR: id từ client không ràng buộc `shopId`.
- OAuth/identity: `email_verified`, state/PKCE, redirect URL whitelist (R-009). Phiên: `authenticatedAt`, thu hồi, cookie `HttpOnly/Secure/SameSite`.
- Rate limit đếm thất bại, khóa theo định danh + IP (R-012); kiểm phiên/quyền trước khi đọc body lớn/multer (R-010).
- Audit trong cùng transaction cho thay đổi quyền/thành viên/secret (R-011).
- Injection: `$queryRawUnsafe`/`$executeRawUnsafe`, nối chuỗi SQL, path traversal khi ghi ảnh (`IMAGE_STORAGE_DIR`), SSRF khi fetch URL từ người dùng/AI, prompt injection vào OpenAI có quyền ghi.
- Upload: giới hạn kích thước, kiểm MIME thật (sharp), tên file do server sinh.
- Log: không ghi token, mật khẩu, mã xác minh, body nhạy cảm.

**hallo-web (React + Vite)**
- `dangerouslySetInnerHTML`, `href`/`src` từ dữ liệu ngoài không qua `safeExternalUrl` (R-009).
- `fetch(` ngoài `src/api/client.ts` → mất CSRF/timeout (R-007). Token/secret trong `localStorage` hoặc biến `VITE_*`.
- CSP: script inline, `'unsafe-inline'` (RV-005); `target="_blank"` thiếu `rel="noopener"`.
- Quyền chỉ kiểm ở UI mà API không kiểm (R-006) — báo như lỗi API.

## Output

```
## Bảo mật: ⛔ có P0/P1 | ⚠️ có P2/P3 | ✅ không phát hiện

| # | Mức | Quy tắc | Vị trí | Lỗ hổng & đường tấn công | Cách sửa |
|---|-----|---------|--------|---------------------------|----------|

Cần xác minh: …
Đã kiểm: <nhóm checklist đã chạy, số file>
```

Có P0 → nhắc: không merge; nếu secret đã lên remote thì **xoay secret trước**, xóa lịch sử sau.
