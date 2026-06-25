# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Moca Music Desktop is a personal-use desktop app (Tauri v2 + Next.js 16) that downloads YouTube audio as MP3. The user pastes a YouTube URL, the app fetches video metadata via `rusty_ytdl`, lets the user confirm/edit the filename, then shells out to a bundled `yt-dlp` sidecar binary (using a bundled `ffmpeg`) to perform the actual download.

## Commands

```bash
nvm use                 # Node 24 — required before any other command (see .nvmrc)
pnpm install             # install JS deps

pnpm dev                 # Next.js dev server only (no Tauri shell), with Turbopack
pnpm tauri dev            # full app in dev mode (Tauri + Next.js)
pnpm local                # like `tauri dev` but loads vars from .env.local first (export $(grep -v '^#' .env.local | xargs))

pnpm build                # production Next.js static export (cross-env NODE_ENV=production next build)
pnpm tauri build           # full production desktop build

pnpm lint                  # eslint src
npx tsc --noEmit            # type-check (no built-in script; run directly)

pnpm test                   # jest (frontend)
pnpm test -- --coverage      # jest with coverage
pnpm test -- path/to/File.test.ts   # run a single test file
cargo test --manifest-path src-tauri/Cargo.toml   # Rust backend tests

pnpm run release patch|minor|major   # bumps version in package.json, Cargo.toml, tauri.conf.json; generates RELEASE_NOTES.md; commits + tags
```

Running a single Jest test by name: `pnpm test -- -t "test name substring"`.

## Architecture

### Two runtimes, one repo
- `src/` — Next.js 16 App Router frontend, statically exported (`next.config.mjs` sets `output: 'export'`) and loaded by Tauri via `frontendDist: ../out`. There is no Node server in production; all "backend" work happens in Rust.
- `src-tauri/` — Rust backend (Tauri v2). Exposes `#[tauri::command]` functions that the frontend calls via `@tauri-apps/api/core`'s `invoke()`. This is the only way the two sides communicate — there is no REST API in this app, so `.claude/rules/http.md` does not apply here (it's a generic rule, not project-specific).

### Frontend layering (`src/app/`)
Clean-architecture-flavored separation per feature:
- `domain/model/` — plain request/response DTO classes (e.g. `VideoInfoRequest`, `DownloadAudioResponse`), no logic.
- `usecase/` — one class per use case (`GetVideoInfo`, `DownloadAudio`), each with a single `execute()` method that calls `invoke()` on a specific Tauri command and translates Rust-side errors into user-facing messages.
- `page.tsx` — the single real screen (paste URL → fetch info → confirm name → download), holds all UI state via `useState`/`react-hook-form`. `configs/page.tsx` and `index.tsx` are unused/scaffold leftovers from shadcn templates, not wired into navigation.
- `src/lib/schema.ts` — Zod schema for the URL/filename form (`downloadVideoSchema`), validated with `youtubeRegex`.
- `src/lib/sanitize.ts` — `sanitizeMusicName()` turns a raw video title into a safe `.mp3` filename (strips special chars, title-cases words).
- `src/components/ui/` — shadcn/Radix primitives, untouched generated code.
- `src/components/internal/` — app-specific wrappers: `observability-provider.tsx` (Sentry init + `captureError`/`logInfo`/`countMetric` helpers used throughout the app instead of calling `@sentry/browser` directly), `error-boundary.tsx`, `display-version.tsx`, `clipboard-inspect.tsx`.

### Rust backend (`src-tauri/src/main.rs`)
Two Tauri commands matter:
- `fetch_video_info(video_url)` — uses `rusty_ytdl::Video` to pull title/author without downloading anything.
- `download_audio_as_mp3(video_id, output_path, file_name)` — resolves the bundled sidecar directory (next to the app executable), invokes the `yt-dlp` sidecar (`app.shell().sidecar("yt-dlp")`) with `--ffmpeg-location` pointed at the bundled `ffmpeg`, extracts MP3 at max audio quality. Every failure path is both logged to a per-OS app-log-dir file (`get_log_file_path`/`append_to_log`) and reported to Sentry (`observability::capture_error`) — when adding new failure paths, do both.
- `show_in_folder` / `get_log_path` are small OS-integration helpers used by the toasts in `page.tsx` ("open folder" / "open log folder" actions).
- `observability.rs` wraps `sentry` init; it's a no-op unless `SENTRY_DSN` is set at *compile time* via `option_env!`, so Sentry is effectively disabled unless the env var is exported before `cargo build`/`pnpm build` (frontend Sentry uses the separate runtime-style var `NEXT_PUBLIC_SENTRY_DSN`, set per `.env.example`).
- Sidecar binaries (`yt-dlp`, `ffmpeg`) live in `src-tauri/binaries/` and are declared in `tauri.conf.json` under `bundle.externalBin`. They are platform-specific (`-x86_64-apple-darwin` checked in; Windows variants are downloaded fresh in CI — see `.github/workflows/main.yml` / `build-test.yml`).
- Unit tests for Rust code live inline in `#[cfg(test)] mod tests` blocks inside `main.rs` / `observability.rs`, not in separate files.

### Frontend tests (`src/test/`)
Jest + ts-jest + jsdom (see `jest.config.js`); `@/` resolves to `src/`. Mirrors the use case / component being tested (e.g. `DownloadAudio.test.ts`, `GetVideoInfo.test.ts`, `Page.test.tsx`, `sanitize.test.ts`, `schema.test.ts`).

### CI/CD and releases
- `pnpm run release <patch|minor|major>` (`scripts/bump-version.js`) bumps `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` together, regenerates `RELEASE_NOTES.md` from commits since the last tag (via `scripts/generate-changelog.js`, categorized by Conventional Commits type), then commits and tags locally — it does not push.
- `develop` is the integration branch; `main` is release. Pushing to `main` triggers `.github/workflows/main.yml`, which downloads fresh Windows `yt-dlp`/`ffmpeg` sidecars, builds via `tauri-apps/tauri-action`, and publishes a GitHub Release using `RELEASE_NOTES.md` as the body and the tag's version.
- `.github/workflows/build-test.yml` is a throwaway Windows build-test workflow scoped to the `windows-log-test` branch.

## Project workflow conventions (`.claude/`)

This repo uses a structured, PRD-driven workflow via custom slash commands, with feature work tracked under `tasks/prd-[feature-name]/`:
1. `/criar-prd` → clarifying questions, then `tasks/prd-[feature]/prd.md` (what/why, from `templates/prd-template.md`)
2. `/criar-techspec` → deep repo analysis + Context7/web research, then `tasks/prd-[feature]/techspec.md` (how)
3. `/criar-tasks` → breaks the techspec into ≤10 incremental tasks, each with its own tests; needs explicit approval of the high-level list before writing files; produces `tasks.md` + per-task `[num]_task.md` (from `templates/tasks-template.md` / `task-template.md`)
4. `/executar-task` → implements one task at a time, must finish with the `task-reviewer` subagent passing before marking the task complete in `tasks.md`
5. `/executar-review` → standalone review pass against the rules in `.claude/rules/`, the techspec, and tasks, using `git diff`/`git log main..HEAD`
6. `/executar-qa` → Playwright-MCP-driven E2E/a11y/visual QA against the PRD's numbered requirements; logs findings to `bugs.md`
7. `/executar-bugfix` → fixes everything in `bugs.md` by root cause, with a regression test per bug

The `task-reviewer` agent (`.claude/agents/task-reviewer.md`) checks completed tasks against `.claude/rules/*.md` (code-standards, node, http, logging, react, tests) and writes `[num]_task_review.md` next to the task file, in Portuguese.

`.claude/rules/http.md` describes a generic Express/REST convention used as a project-wide standard for *any* HTTP API work — there is currently no HTTP server in this codebase, but follow it if one is ever added.

Project documentation (PRDs, techspecs, reviews) is written in Portuguese; code, identifiers, and comments are English (per `.claude/rules/code-standards.md`).
