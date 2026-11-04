---
name: new
description: Tạo nhánh làm việc chuẩn HalloJapan từ origin/dev mới nhất (feat/HJ-022-qr-revoke).
argument-hint: <type> [HJ-xxx|RV-xxx|#n] <mô tả ngắn>
disable-model-invocation: true
allowed-tools:
  - Bash(git *)
  - Bash(node *)
---

# /git:new — tạo nhánh

Input: `$ARGUMENTS`

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

Quy ước: [conventions.md §2](${CLAUDE_PLUGIN_ROOT}/skills/flow/references/conventions.md)

## Làm

1. Dựng tên `<type>/<ref>-<slug>` từ input:
   - `type` ∈ feat fix hotfix refactor perf chore docs test ci. Đoán từ mô tả nếu thiếu ("sửa"→fix, "thêm"→feat); vẫn mơ hồ thì hỏi **một** câu.
   - `ref`: `HJ-022`, `RV-002` (viết hoa), `#12` → `12`. Không có thì bỏ.
   - `slug`: dịch mô tả sang tiếng Anh, kebab-case, 2–5 từ, ≤ 40 ký tự, bỏ dấu.
2. Working tree bẩn → báo số file, hỏi: mang theo sang nhánh mới (mặc định) hay `git stash push -u -m "<tên cũ>"`.
3. `git fetch origin --prune`, rồi `git switch -c <tên> origin/<base>` (base = `dev`; không cần checkout `dev` local).
   Nhánh đã tồn tại → hỏi switch sang nhánh đó hay đổi tên.
4. Không push lúc này (push khi `/git:ship`).

## Kết quả

Một dòng: `✓ <tên nhánh> từ origin/dev @ <sha ngắn>` + gợi ý: `code → /git:ship`.
