# Smart Trip - Environment Setup Guide

## Prerequisites

| Tool | Minimum Version | Download |
|------|----------------|----------|
| **Node.js** | 18.x+ | https://nodejs.org/ |
| **npm** | 9.x+ | (bundled with Node.js) |
| **Git** | 2.x+ | https://git-scm.com/ |
| **Browser** | Chrome / Edge (Chromium) | Google Maps + File System Access API |

## Quick Start (Windows)

**Double-click `start.bat`** — it will automatically:
1. Check Node.js is installed
2. Create `.env` from `.env.example` if missing (and open it for editing)
3. Run `npm install` if `node_modules/` is missing
4. Start the Vite dev server at `http://localhost:5173`

## Manual Setup

### 1. Clone the repository
```bash
git clone https://github.com/showbox88/Smart-Trip.git
cd Smart-Trip
```

### 2. Switch to the development branch
```bash
git checkout refactor/itinerary-v3-core
```

### 3. Configure environment variables
```bash
cd react-app
cp .env.example .env
```

Edit `react-app/.env` and fill in your keys:
```env
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Google Maps (required)
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key
```

**Where to get keys:**
- **Supabase**: https://supabase.com → Project → Settings → API
- **Google Maps**: https://console.cloud.google.com → APIs & Services → Credentials
  - Enable: Maps JavaScript API, Places API, Routes API, Geocoding API

### 4. Install dependencies
```bash
npm install
```

### 5. Start development server
```bash
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

### 6. Build for production
```bash
npm run build
npm run preview   # preview the production build locally
```

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `npm install` fails | Delete `node_modules/` and `package-lock.json`, then retry |
| Google Maps shows gray | Check `VITE_GOOGLE_MAPS_KEY` in `.env`, ensure APIs are enabled |
| "Invalid API key" error | Verify key has no extra spaces, and billing is enabled on Google Cloud |
| Login doesn't work | Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` |
| Port 5173 in use | `npx vite --port 3000` or kill the existing process |

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for full architecture documentation.

## Notes

- `.env` is git-ignored — each developer must create their own from `.env.example`
- Google Maps API key was previously hardcoded in `index.html` — now uses `%VITE_GOOGLE_MAPS_KEY%` env injection
- `server.py` is for the legacy Vanilla JS version only — the React app does NOT need it
