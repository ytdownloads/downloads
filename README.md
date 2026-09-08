# YTdownloader — Frontend

A high-performance, modern web user interface for downloading YouTube videos and playlists with real-time SSE progress indicators, format selection, responsive dark styling, and integrated legal compliance pages.

---

## Features

- **Modern Responsive UI**: Built with React 18, Vite, TypeScript, Lucide Icons, and Tailwind CSS following a sleek dark navy/neon accent design.
- **Dynamic Content Detection**: Automatically routes single video URLs, shorts, and playlists without requiring manual user switching.
- **Real-Time Progress Streaming**: Connects directly to backend Server-Sent Events (SSE) for live byte counters, percentages, speeds, and ETA.
- **Single & Playlist Workflows**: Supports granular resolution selection, audio-only downloads, individual video selection in playlists, and bulk ZIP streaming.
- **Configurable Backend Integration**: Powered by `VITE_API_URL` to point seamlessly to the production backend on Render, or default to `/api` locally via Vite reverse proxy.
- **Comprehensive Legal Compliance**: Complete and responsive legal pages (Privacy Policy, Terms of Service, DMCA / Copyright, Cookie Policy, and Disclaimer) with instant client-side navigation.
- **Strict Brand & Compliance Standards**: Standardized branding as **YTdownloader** and copyright `@2026 YTdownloader All right reserved`.

---

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 6
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React

---

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
   For local development where the backend runs on `http://localhost:5000`, leave `VITE_API_URL` empty to use the Vite proxy defined in `vite.config.ts`.

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## Production Build & Deployment

1. **Verify TypeScript types:**
   ```bash
   npm run typecheck
   ```

2. **Generate production bundle:**
   ```bash
   npm run build
   ```
   The compiled static files will be placed into the `dist/` directory.

3. **Configure Production Backend URL:**
   When deploying to GitHub Pages, Vercel, Netlify, or Cloudflare Pages, set the environment variable:
   ```env
   VITE_API_URL=https://ytdownloader-backend.onrender.com
   ```
   All API requests and SSE streams will automatically communicate with your deployed backend.

---

## License & Copyright

@2026 YTdownloader All right reserved
