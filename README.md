# hallo-claude

Bộ **Claude Code plugin** nội bộ của HalloJapan Group (marketplace tên `hallo`). Mục tiêu: cả team làm việc với
Git/GitHub, review, bảo mật và tài liệu **theo cùng một chuẩn**, với ít thao tác nhất.

## Cài trong 30 giây

```sh
claude plugin marketplace add HallojapanAI/hallo-claude
claude plugin install git@hallo review@hallo sec@hallo kb@hallo setup@hallo
```

Hoặc để repo tự bật cho mọi người: chạy `/setup:repo` một lần trong hallo-api / hallo-web / hallo-system-knowledge
và commit `.claude/settings.json` (người khác chỉ cần trust thư mục khi mở Claude).

Kiểm máy: `/setup:doctor` · Máy mới: `/setup:init`.

## Cheat sheet

```text
/git:new feat HJ-022 qr revoke    tạo nhánh feat/HJ-022-qr-revoke từ origin/dev
/review:diff                       tự review trước khi ship (quy tắc R-xxx)
/git:ship                          commit → rebase → check → push → PR vào dev
/git:status                        đang ở đâu, PR/check ra sao, làm gì tiếp
/review:fix                        xử lý góp ý bot pr-review + reviewer
/git:sync                          rebase lên dev mới nhất
/kb:sync                           sau merge: cập nhật hallo-system-knowledge
/git:clean                         dọn nhánh đã merge
```

Một ngày làm việc điển hình: `/git:new` → code → `/review:diff` → `/git:ship` → (bot review) → `/review:fix` → merge → `/kb:sync` → `/git:clean`.

## Plugin

| Plugin | Lệnh | Tự động (không cần gõ) |
| --- | --- | --- |
| [git](plugins/git) | `new` `commit` `ship` `pr` `sync` `status` `release` `clean` | Skill `flow` nạp quy ước khi nói "commit/push/PR"; **hook guard** chặn push vào dev/main/master, force push, `--no-verify`, `git add .env` |
| [review](plugins/review) | `diff` `pr` `fix` | — |
| [sec](plugins/sec) | `scan` `secrets` | `secrets` tự chạy khi diff chạm `.env`/config |
| [kb](plugins/kb) | `find` `sync` | Skill `context` tự đọc hallo-system-knowledge khi cần nghiệp vụ/kiến trúc |
| [setup](plugins/setup) | `doctor` `init` `repo` | — |

Gõ `/` rồi vài ký tự (vd `/ship`) — autocomplete tìm đúng lệnh.

## Quy ước cốt lõi

Đầy đủ: [plugins/git/skills/flow/references/conventions.md](plugins/git/skills/flow/references/conventions.md).

- `dev` = nhánh tích hợp và base của mọi PR (push dev = deploy dev + review hệ thống). `main`/`master` = release.
- Nhánh `<type>/<HJ-xxx|RV-xxx|#n>-<slug>`; commit Conventional Commits tiếng Anh; PR/tài liệu tiếng Việt.
- PR vào `dev`, squash merge, cần status `pr-review` + 1 approve. `Fixes RV-xxx` / `Refs HJ-xxx` trong body.
- Quy tắc review R-xxx và việc RV-xxx sống ở **hallo-system-knowledge** — plugin đọc trực tiếp, không chép.

## Workspace

Các repo nằm cạnh nhau (skill tìm nhau theo đường dẫn tương đối; đổi bằng `HALLO_KB`, `HALLO_WORKSPACE`):

```
hallojapangroup/
  hallo-api/  hallo-web/  hallo-system-knowledge/  hallo-claude/
```

## Cấu trúc repo này

```
.claude-plugin/marketplace.json   danh sách plugin (marketplace "hallo")
plugins/<tên>/                    một plugin = một nhóm lệnh /<tên>:<skill>
  .claude-plugin/plugin.json        manifest; metadata.shared = script dùng chung cần chép vào
  skills/<skill>/SKILL.md           mỗi skill = một lệnh; references/ cho tài liệu dài
  agents/*.md                       subagent (vd reviewer, auditor chỉ-đọc)
  hooks/hooks.json, scripts/        hook + script (scripts/<shared> do npm run sync sinh)
shared/                           BẢN GỐC script dùng chung (hallo-ctx, kb-rules)
templates/plugin/                 khung cho plugin mới (npm run new)
scripts/                          sync-shared, validate, new-plugin
tests/                            test hook guard
```

Đóng góp / thêm plugin: [CONTRIBUTING.md](CONTRIBUTING.md).
