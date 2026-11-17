---
name: design
description: >-
  Nguyên tắc UI/UX chung cho giao diện quản trị vận hành của HalloJapan (hallo-web, hallo-admin) — adaptive PC/Mobile,
  phân tầng thông tin, bảng dữ liệu tùy chỉnh, badge trạng thái, design token và component dùng chung để hai app
  đồng bộ. Dùng tự động mỗi khi xây mới, redesign hoặc chỉnh màn hình, component, layout, màu, style, responsive
  trong hallo-web hoặc hallo-admin.
user-invocable: false
---

# UI/UX đồng bộ hallo-web & hallo-admin

Hai app cùng stack: React 19 + Vite + Tailwind v4 + `lucide-react`, font Inter (tiếng Nhật rơi về font hệ thống).
Người dùng đi qua lại giữa hai app nên **màu, trạng thái, icon, thuật ngữ, kích thước phải giống nhau**.

## 0. Nguồn sự thật — đọc trước khi thiết kế

Không chép giá trị từ skill này; đọc code hiện tại (code là sự thật):

| Cần | Đọc ở |
| --- | --- |
| Design token (màu, nền, viền, radius, thang chữ `2xs/xs/ui/sm…`, dark mode) | `hallo-web/src/styles.css` (`@theme`, `:root`, `.dark`) |
| Component gốc (Button, Card, Badge, Input, Table, Dialog…) | `hallo-web/src/components/ui/` (shadcn new-york-v4, xem `README.md` ở đó) |
| Badge trạng thái + tone | `hallo-web/src/components/status-badge.tsx`, tone theo trạng thái ở `features/workflow/constants` |
| Bảng dữ liệu | `hallo-web/src/components/data-table.tsx`, `use-data-table.ts` |
| Khung trang | `app-shell.tsx`, `page.tsx` của từng app |
| Chữ hiển thị | `useI18n()` — vi/ja/en; thuật ngữ theo glossary của hallo-system-knowledge (skill `kb:context`) |

Luật đồng bộ:
- **hallo-web là chuẩn.** hallo-admin còn dùng class Tailwind trực tiếp (`slate-*`, `emerald-*` trong `src/components/ui.tsx`).
  Khi chạm UI admin: dùng/đưa sang token cùng tên với hallo-web (`bg-background`, `text-muted-foreground`, `border-border`,
  `bg-primary`…), không tạo palette, tên token hay biến thể component riêng. Refactor diện rộng chỉ làm khi task yêu cầu.
- Không hard-code hex/rgb trong component; thiếu token → thêm vào `styles.css` (cả light và dark) rồi dùng.
- Component đã có ở `components/ui` → dùng lại, không viết bản giống-mà-khác. Cần biến thể mới → thêm `variant`.
- Icon chỉ từ `lucide-react`; một khái niệm = một icon ở cả hai app.
- Mọi chuỗi qua i18n, kiểm cả bản tiếng Nhật (chữ dài hơn, không cắt mất nghĩa).

## 1. Adaptive UI, Unified UX

Không thu nhỏ bố cục PC xuống Mobile, không kéo giãn Mobile lên PC.
- **Thống nhất:** màu chủ đạo, status token, bộ icon, thuật ngữ, cấu hình người dùng (user preferences), dữ liệu realtime.
- **Desktop (chuột + bàn phím):** mật độ dữ liệu cao — Smart Data Table nhiều cột, sort trên header, chọn nhiều dòng
  + **Bulk Actions Bar**, **Split View / chi tiết 2 cột**, **Slide-over Drawer** bên phải để xem nhanh không rời ngữ cảnh.
- **Mobile (ngón cái):** quét nhanh, tác nghiệp tại chỗ — **Elevated Cards** phân cấp rõ, **filter chips** cuộn ngang
  1 chạm, **Bottom Sheet** cho lọc/sắp xếp, **Sticky Bottom Action Bar / FAB** trong vùng ngón cái.

## 2. Information on Demand

1. **Lớp 1 — nhận diện tức thì (0,5 giây):** mã định danh chính, badge trạng thái tương phản cao, con số tài chính quan trọng nhất.
2. **Lớp 2 — ngữ cảnh vận hành:** tên đối tượng (sản phẩm/khách hàng), số lượng, kênh nguồn, chỉ báo thanh toán/hạn xử lý.
3. **Lớp 3 — chi tiết & audit log:** lịch sử, ghi chú dài, log bảo mật — chỉ trong Drawer/Sheet hoặc khi người dùng mở rộng.

## 3. Người dùng kiểm soát dữ liệu

Màn hình danh sách nhiều trường:
- Giữ **sort theo cột** (Asc/Desc/Default), **ẩn/hiện cột**, **đổi thứ tự cột**.
- Một **View Schema** chung cho PC và Mobile: đổi thứ tự/ẩn một trường thì cả cột bảng PC lẫn thứ tự trong thẻ Mobile
  đổi theo.

## 4. Hướng hành động, gắn ngữ cảnh

- Bản ghi đang cảnh báo/tạm dừng (thiếu SKU, chưa thanh toán…) → nút xử lý (**Primary Contextual Action**) nằm ngay
  trong khối cảnh báo, 1 chạm là xử lý.
- Mobile: chừa vùng an toàn đáy (`pb-[env(safe-area-inset-bottom)]` hoặc padding đủ lớn) để thanh trình duyệt và
  sticky bar không che nội dung/nút cuối danh sách.

## 5. Phân cấp thị giác

- Nền tổng thể trung tính dịu (token `background`, họ slate-50) làm nổi bề mặt thẻ trắng (`card`) viền mảnh
  (`border`) và bóng nhẹ.
- **Badge trạng thái:** nền nhạt + viền mảnh + chấm tròn màu đậm + nhãn chữ rõ nghĩa — luôn qua `StatusBadge`/tone,
  không tự phối màu tại chỗ. Không dùng màu làm tín hiệu duy nhất.
- **Vùng chạm:** nút tối thiểu 36px (`h-9`) trên PC, 44px trên cảm ứng; có khoảng cách giữa các nút.
- Kiểm dark mode khi hallo-web có `.dark`.

## 6. Bảo toàn kiến trúc dữ liệu khi redesign

- Tách **presentation state** (cột hiển thị, mở/đóng drawer, view schema) khỏi **domain data model**.
- Không đổi tên trường, không phá luồng gọi API, phân quyền, logic audit/bảo mật hiện có. Dữ liệu cá nhân hiển thị
  theo quy tắc che/giới hạn vai trò của hallo-system-knowledge.

## Trước khi báo xong

- [ ] Đã đọc token/component ở mục 0; không hex mới, không component trùng.
- [ ] Màn hình chạy ở PC (≥1280px) và Mobile (~375px); không cuộn ngang trang; đáy không bị che.
- [ ] Badge, icon, thuật ngữ khớp màn hình tương ứng ở app còn lại.
- [ ] Chuỗi qua i18n (vi/ja/en); check/test của repo xanh.
