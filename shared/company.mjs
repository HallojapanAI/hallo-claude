// company — cấu hình công ty của bộ plugin, đọc từ company.json nằm cạnh file này.
// BẢN GỐC: hallo-claude/shared/company.mjs — `npm run sync` chép vào plugins/*/scripts/ cùng company.json.
// Dùng: import { company, repoByAlias, repoKind, refIdRegex } from './company.mjs';
import { readFileSync } from 'node:fs';

export const company = JSON.parse(readFileSync(new URL('./company.json', import.meta.url), 'utf8'));

/** Tên repo có trong company.repos. */
export const repoNames = Object.keys(company.repos);

/** Repo bắt buộc (không `optional`). */
export const requiredRepos = repoNames.filter((r) => !company.repos[r].optional);

/** alias (api, web, kb…) → tên repo; tên repo giữ nguyên; không biết → trả lại input. */
export function repoByAlias(name) {
  if (!name) return name;
  if (company.repos[name]) return name;
  return repoNames.find((r) => company.repos[r].alias === name) ?? name;
}

/** `kind` của repo (api, web, kb, plugins…) hoặc null nếu không thuộc công ty. */
export const repoKind = (name) => company.repos[name]?.kind ?? null;

/** Thông tin repo, hoặc mặc định cho repo lạ. */
export const repoInfo = (name) => company.repos[name] ?? { kind: 'other', check: '', extra: '' };

/** Regex bắt ID tham chiếu (HJ-022, RV-002…) trong tên nhánh/commit. */
export const refIdRegex = (flags = 'i') => new RegExp(`\\b(${company.refIds.join('|')})\\b`, flags);

export const PROTECTED = new Set(company.branches.protected);
export const INTEGRATION = company.branches.integration;
export const RELEASE = company.branches.release;
