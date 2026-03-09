# 🎵 Moca Music Desktop

> Aplicativo desktop para baixar músicas do YouTube em formato MP3, construído com Tauri + Next.js.

---

## 🖥️ Sobre o projeto

**Moca Music Desktop** é um app nativo que permite colar um link do YouTube, visualizar as informações do vídeo e baixar o áudio em MP3 diretamente para a pasta de downloads. A interface é simples, minimalista e feita para funcionar no macOS (e Windows).

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| 🖼️ Frontend | Next.js 16 (App Router, static export) |
| ⚛️ UI | React 19 + Tailwind CSS v4 + Radix UI |
| 🦀 Backend | Tauri v2 + Rust |
| 📥 Download | `yt-dlp` (CLI externo) |
| 🔍 Metadados | `rusty_ytdl` |
| ✅ Validação | Zod v4 + React Hook Form |
| 🧪 Testes | Jest + Testing Library |
| 📦 Pacotes | pnpm |

---

## ⚙️ Pré-requisitos

- [Node.js](https://nodejs.org/) `v24` (use `nvm use`)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) `1.85+`
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) instalado e disponível no PATH
- [ffmpeg](https://ffmpeg.org/) instalado e disponível no PATH

---

## 🚀 Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Rodar o app Tauri em modo desenvolvimento
pnpm tauri dev

# Rodar apenas o servidor Next.js (sem Tauri)
pnpm dev
```

---

## 🏗️ Build

```bash
# Build do app Tauri para produção
pnpm tauri build

# Build apenas do Next.js (export estático)
pnpm build
```

---

## 🧪 Testes

```bash
# Rodar testes do frontend (Jest)
pnpm test

# Rodar testes do backend (Rust)
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## 🔍 Lint

```bash
pnpm lint
```

---

## 🎨 Ícone do app

O ícone é gerado a partir de uma imagem PNG usando o comando:

```bash
pnpm tauri icon ./app-icon.png
```

- Fonte: [flaticon.com](https://www.flaticon.com/)
- Imagens originais: `icons/original/`
- Docs: [Tauri Icons](https://tauri.app/v1/guides/features/icons/)

---

## 🔄 Ciclo de desenvolvimento (Gitflow)

```bash
# 1. Iniciar uma nova feature
git flow feature start [feature-name]

# 2. Finalizar a feature (merge em develop)
git flow feature finish [feature-name]

# 3. Iniciar uma release
git flow release start [release-name]

# 4. Versionar o pacote (patch | minor | major)
npm version patch   # ou minor / major

# 5. Finalizar a release (merge em main e develop)
git flow release finish [release-name]

# 6. Publicar as tags
git push origin --tags
```

---

## 📁 Estrutura principal

```
mocamusic-desktop/
├── src/                    # Frontend Next.js
│   ├── app/                # App Router (page, usecases, domain)
│   ├── components/         # Componentes UI (Radix + shadcn)
│   └── lib/                # Utilitários (schema Zod, sanitize)
├── src-tauri/              # Backend Rust + config Tauri
│   └── src/main.rs         # Comandos Tauri (fetch_video_info, download_audio_as_mp3)
└── icons/                  # Ícones do app
```

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
