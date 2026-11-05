## Tóm tắt

<!-- 1–3 câu: PR làm gì và vì sao. -->

## Thay đổi

- <!-- thay đổi chính, theo module -->

## Liên quan

<!-- Xóa dòng không dùng. Fixes RV-xxx làm bot tự gắn fix-in-pr và đóng issue khi merge. -->
Refs HJ-xxx
Closes #n   <!-- issue của task (/task:open); bỏ nếu không có -->
Fixes RV-xxx
Fixes #xx

## Kiểm thử

- [ ] `npm run check`
- [ ] `npm test`
- [ ] <!-- test tích hợp / e2e / thử tay: bước và kết quả -->

## Checklist

- [ ] Không có secret, `.env`, dữ liệu khách hàng (R-008)
- [ ] Đổi DTO/route → đã xuất lại OpenAPI và có PR cặp ở hallo-web (R-013) — hoặc không áp dụng
- [ ] Đổi schema DB → có migration + index cho điều kiện lọc mới — hoặc không áp dụng
- [ ] Text UI đủ en/vi/ja — hoặc không áp dụng
- [ ] Cần cập nhật hallo-system-knowledge? (`/kb:sync` sau khi merge) — hoặc không

## Ảnh chụp / ghi chú

<!-- UI: ảnh trước/sau (desktop + mobile). Rủi ro, việc còn lại, cách rollback. -->
