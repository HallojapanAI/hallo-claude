---
name: diff
description: Review thay đổi local (nhánh hiện tại so với origin/dev, gồm cả phần chưa commit) theo quy tắc R-xxx và chuẩn tầng 1 của bot pr-review — chạy trước khi ship.
argument-hint: "[đường dẫn | --staged]"
context: fork
agent: reviewer
allowed-tools:
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git show *)
  - Bash(git blame *)
  - Bash(git status *)
  - Bash(git fetch *)
  - Bash(node *)
---

# Review local — chuẩn tầng 1

Phạm vi: `$ARGUMENTS` (mặc định: toàn bộ thay đổi so với `origin/dev`, cả chưa commit; `--staged`: chỉ phần đã stage; đường dẫn: chỉ file đó).

## Ngữ cảnh

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs" diffstat`

## Quy tắc (nguồn: hallo-system-knowledge/roadmap/review-rules.md)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kb-rules.mjs"`

## Làm

1. Lấy diff đầy đủ theo phạm vi (`git diff origin/dev...HEAD` + `git diff HEAD`, hoặc `git diff --cached`).
2. Mở file đầy đủ quanh mỗi hunk để hiểu ngữ cảnh; theo caller/callee khi cần.
3. Kiểm từng quy tắc áp dụng cho repo (`api`, `web`, `api+web`) và các việc RV đang mở có file trong diff.
4. Kiểm thêm: đúng chức năng, lỗi biên (null, rỗng, phân trang, đồng thời), transaction, phân quyền theo shop, lộ dữ liệu, N+1/include không giới hạn, i18n đủ 3 locale, test cho đường mới.

## Output (tiếng Việt, nặng nhất trước, tối đa 15 mục)

```
## Kết luận: ✅ sẵn sàng ship | ⚠️ nên sửa | ⛔ chặn merge (có P0/P1 hoặc vi phạm R ACTIVE/GUARDED)

| # | Mức | Tiêu chí | Quy tắc | Vị trí | Vấn đề | Cách sửa |
|---|-----|----------|---------|--------|--------|----------|
| 1 | P1 | SEC | R-001 | src/x.ts:42 | … | dùng `COST_ROLES` … |

RV có thể đã sửa: RV-012 (bằng chứng …) → thêm `Fixes RV-012` vào PR.
Việc kèm theo còn thiếu: …
```

Không có vấn đề → nói rõ đã kiểm những gì (quy tắc nào, file nào) trong 2–3 dòng.
