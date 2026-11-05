# Mẫu body issue

## Issue chính

```markdown
## Bối cảnh
<3–6 dòng rút từ mục Context của plan: vấn đề, mục tiêu, quyết định đã chốt>

## Phạm vi
- Repo chính: `<slug>`
- Repo liên quan: `<slug>#<m>` …

## Kế hoạch
Toàn văn plan ở comment **Plan v1** bên dưới (bản mới nhất = comment `Plan vN` cuối cùng).

## Checklist PR
- [ ] <mỗi mục trong phần "Chia PR" của plan>

## Duyệt
Góp ý bằng comment. Khi đồng ý, gắn label **`plan-approved`** — Claude chỉ bắt đầu code sau label này (`/task:go`).

Refs HJ-xxx   <!-- bỏ nếu không có -->
```

## Issue phụ

```markdown
Thuộc <slug-chính>#<n> — plan đầy đủ ở issue đó.

## Phần việc ở repo này
<liệt kê mục/tiêu đề của plan thuộc repo này>

## Checklist PR
- [ ] …
```

Quy tắc: tiếng Việt; không chép secret, đường dẫn máy cá nhân (`/Users/...`) hay dữ liệu khách hàng vào issue (R-008) — thay đường dẫn tuyệt đối bằng đường dẫn tương đối trong repo.
