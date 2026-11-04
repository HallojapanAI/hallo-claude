---
name: init
description: Onboard máy mới vào workspace HalloJapan — clone đủ repo cạnh nhau trên nhánh dev, cài dependency, tạo .env từ mẫu, đăng ký marketplace hallo. Chạy một lần cho thành viên mới.
argument-hint: "[thư mục workspace]"
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git clone *)
  - Bash(git -C *)
  - Bash(npm ci)
---

# /setup:init — onboard

Workspace: `$ARGUMENTS` (mặc định thư mục cha của repo hiện tại, hoặc thư mục hiện tại).

Bố cục chuẩn (các repo **phải** nằm cạnh nhau — skill và tool review tìm nhau theo đường dẫn tương đối):

```
<workspace>/
  hallo-api/                 NestJS API + worker
  hallo-web/                 React/Vite web
  hallo-system-knowledge/    tài liệu, quy tắc review, roadmap
  hallo-claude/              (tùy chọn) bộ plugin này — chỉ cần khi đóng góp plugin
```

Hiện trạng:

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"`

## Làm từng bước, báo sau mỗi bước, dừng khi lỗi

1. **Tiên quyết** (user tự làm, bạn chỉ hướng dẫn): Node theo `.nvmrc`, `gh auth login`, SSH key trên GitHub, `git config user.name/email`. Thiếu → dừng ở đây và đưa lệnh.
2. **Clone** repo còn thiếu: `git clone git@github.com:HallojapanAI/<repo>.git` rồi `git -C <repo> switch dev`.
3. **Dependency**: `npm ci` trong hallo-api, hallo-web (và hallo-system-knowledge nếu có `package-lock.json`).
   hallo-api thêm `npm run db:generate`.
4. **.env**: hallo-api `.env` chưa có → copy `.env.example` (không ghi đè). Nói rõ biến nào user phải tự điền
   (DATABASE_URL, REDIS_URL, AUTH_SECRET, SECRETS_ENCRYPTION_KEY, SMTP_*); **không** tự sinh hay hỏi giá trị secret trong chat.
   Gợi ý xin `.env` dev từ lead qua kênh an toàn.
5. **Claude**: đăng ký marketplace ở scope user nếu chưa có — đưa lệnh cho user gõ:
   `! claude plugin marketplace add HallojapanAI/hallo-claude` rồi `! claude plugin install git@hallo` (tương tự review, sec, kb).
   Repo đã có `.claude/settings.json` (từ `/setup:repo`) thì chỉ cần trust thư mục khi mở Claude.
6. **Git mặc định khuyến nghị**: `git config --global pull.rebase true`, `git config --global fetch.prune true` (hỏi trước).
7. Chạy lại doctor; kết thúc bằng bảng ✅/❌ và "bước đầu tiên": `cd hallo-api && npm run dev`, đọc `hallo-system-knowledge/README.md`.
