---
name: hello
description: Skill mẫu của plugin __NAME__ — thay bằng mô tả cụ thể việc skill làm và khi nào dùng (Claude dựa vào câu này để tự chọn skill).
argument-hint: "[tham số]"
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
---

# /__NAME__:hello

Input: `$ARGUMENTS`

Ngữ cảnh repo (script dùng chung, đã sync vào scripts/):

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/hallo-ctx.mjs"`

## Làm

1. …

## Kết quả

Ngắn gọn, tiếng Việt, kết thúc bằng một bước tiếp theo.
