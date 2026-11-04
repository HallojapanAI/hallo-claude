# setup — Onboarding & môi trường

| Lệnh | Việc |
| --- | --- |
| `/setup:doctor` | Kiểm node/npm theo `.nvmrc`, gh, git identity, SSH, 3 repo, `.env`, marketplace |
| `/setup:init [dir]` | Onboard máy mới: clone repo cạnh nhau trên `dev`, `npm ci`, `.env` từ mẫu |
| `/setup:repo` | Gắn `.claude/settings.json` (bật marketplace + plugin) và `CLAUDE.md` vào repo hiện tại |

Chạy doctor không cần Claude: `node plugins/setup/scripts/doctor.mjs`.

Cài: `/plugin install setup --marketplace HallojapanAI/hallo-claude`
