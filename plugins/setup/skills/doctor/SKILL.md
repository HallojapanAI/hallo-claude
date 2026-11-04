---
name: doctor
description: Kiểm môi trường dev HalloJapan (node/npm theo .nvmrc, gh, git identity, SSH, 3 repo, .env, marketplace hallo) và chỉ cách sửa từng lỗi.
allowed-tools:
  - Bash(node *)
---

# /setup:doctor

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"`

## Trả lời

1. Tóm tắt 1 dòng: sẵn sàng / còn N lỗi.
2. Liệt kê ❌ trước rồi ⚠️, mỗi mục kèm lệnh sửa (đã có ở trên, chỉnh cho đúng máy nếu cần).
3. Hỏi user có muốn bạn chạy các lệnh sửa **không cần bí mật** (npm ci, git config pull.rebase, cp .env.example) không.
   Không tự chạy: `gh auth login`, tạo SSH key, điền `.env` — user tự làm (gợi ý gõ `! gh auth login` trong prompt).
