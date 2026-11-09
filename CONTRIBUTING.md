# Đóng góp vào hallo-claude

## Thêm plugin mới (vd `deploy`, `db`, `i18n`, `test`)

```sh
npm run new -- deploy "Deploy & vận hành: kiểm VPS, log PM2, rollback" ops
# sửa plugins/deploy/skills/hello → skill thật
npm run sync && npm run validate && npm test
claude --plugin-dir plugins/deploy        # thử local, /reload-plugins sau khi sửa
```

Rồi mở PR (`/git:ship`). Plugin cả team cần → thêm `"<tên>@hallo": true` vào
[plugins/setup/templates/project-settings.json](plugins/setup/templates/project-settings.json).

## Quy ước thiết kế

| Mục | Quy ước |
| --- | --- |
| Tên plugin | 1 từ ngắn, kebab-case — người dùng gõ `/<plugin>:<skill>` |
| Tên skill | động từ/danh từ ngắn: `ship`, `scan`, `find`. Tên thư mục = tên lệnh |
| Skill có tác dụng phụ (commit, push, sửa file, gọi API ghi) | `disable-model-invocation: true` — chỉ chạy khi người gõ |
| Skill tri thức nền (quy ước, ngữ cảnh) | `user-invocable: false` — Claude tự nạp theo `description` |
| Review/audit chỉ đọc | `context: fork` + agent trong `agents/` có tools tối thiểu |
| `allowed-tools` | Hẹp nhất có thể; lệnh chỉ đọc thì liệt kê `git diff *`, `git log *`… không dùng `git *` |
| Ngữ cảnh động | `` !`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"` `` — script không bao giờ exit ≠ 0 |
| Nguồn sự thật | Quy tắc/nghiệp vụ đọc từ hallo-system-knowledge lúc chạy, **không chép** vào plugin |
| Ngôn ngữ | Nội dung tiếng Việt; tên lệnh, commit, code tiếng Anh |
| Độ dài SKILL.md | < 150 dòng; chi tiết đưa vào `references/` |
| Script | Node ≥ 24, không dependency ngoài |

## Bảo mật

- Rule secret và khối `.gitignore` bảo mật chỉ sửa ở `shared/security/` (`gitleaks.toml`, `gitignore.base`), rồi `npm run sync`.
  Các repo nhận bản mới khi chạy `/sec:harden` (hoặc `/setup:doctor` báo lệch).
- Repo này **public**: không ghi host, IP, đường dẫn server, tên người, phát hiện bảo mật cụ thể. Hook pre-commit và CI `secret-scan` chặn phần lớn trường hợp.

## Cấu hình công ty: `shared/company.json`

Mọi thứ gắn với HalloJapan (org GitHub, tên marketplace, danh sách repo + `kind`/`alias`/lệnh check, nhánh `dev`/`main`,
nhánh bảo vệ, mẫu ID `HJ-`/`RV-`, tên repo tri thức) nằm **một chỗ** ở `shared/company.json`; script đọc qua
`shared/company.mjs` (`company`, `repoByAlias`, `repoKind`, `refIdRegex`, `PROTECTED`, `INTEGRATION`…). Không hardcode
lại trong plugin. Thêm repo mới cho công ty → thêm một dòng vào `repos` rồi `npm run sync`.

Công ty khác muốn dùng bộ plugin này: clone repo, sửa `company.json`, đổi tên `hallo-*` (`hallo-ctx`, `HALLO_*`, marketplace),
bỏ plugin không áp dụng. Skill text (`SKILL.md`, `references/`) vẫn nhắc tên HalloJapan — rà bằng `grep -ri hallo plugins/*/skills`.

## Script dùng chung

Plugin được cài vào cache riêng, không đọc được file ngoài thư mục của nó, nên script chung phải **chép vào**
từng plugin:

1. Sửa bản gốc ở `shared/`.
2. Khai báo trong `plugin.json` → `"metadata": { "shared": ["company.json", "company.mjs", "hallo-ctx.mjs"] }`
   (`hallo-ctx.mjs`, `kb-rules.mjs`, `guard.mjs`… import `./company.mjs` nên luôn cần cả hai file company).
3. `npm run sync` (CI chạy `validate` sẽ fail nếu bản chép lệch bản gốc).

## Version & phát hành

- SemVer trong `plugin.json` (không đặt version trong marketplace.json). Đổi hành vi lệnh → minor; đổi/xóa tên lệnh → major.
- Người dùng nhận bản mới khi version tăng: `claude plugin update <tên>@hallo`.
- Tag phát hành: `claude plugin tag plugins/<tên>`.

## Checklist PR

- [ ] `npm run validate` và `npm test` xanh
- [ ] README của plugin cập nhật bảng lệnh
- [ ] Tăng version plugin đã đổi
- [ ] Thử thật bằng `claude --plugin-dir plugins/<tên>` trong hallo-api hoặc hallo-web
