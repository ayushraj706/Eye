# 👁️ NetraScope AI — Digital Eye Analysis System

A production-ready, fully client-side Next.js application that performs multi-layer digital eye pixel analysis directly in the browser. No server, no data upload, 100% private.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

## 📦 Deploy to Vercel

```bash
npx vercel --prod
```
Or connect your GitHub repo to Vercel — it auto-detects Next.js.

---

## 🏗️ Architecture

| Layer | Description |
|-------|-------------|
| **Layer 1** | Camera capture via `getUserMedia`, live mirrored canvas with eye guide overlay |
| **Layer 2a** | Jaundice Index — peripheral sclera yellow-spectrum pixel scan |
| **Layer 2b** | Redness Index — dominant red channel conjunctival marker detection |
| **Layer 2c** | Cataract Opacity — high-brightness desaturated cluster analysis |
| **Layer 3** | LocalStorage persistence — full scan history, never leaves browser |
| **Layer 4** | ASCII text report generator + one-click `.txt` download |
| **Layer 5** | Medical disclaimer in Hindi + English on every screen |

---

## 📁 File Structure

```
eye-analysis/
├── app/
│   ├── globals.css        # Design system, animations, Orbitron font
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Complete app (1190 lines, single component)
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

---

## ⚠️ Medical Disclaimer

यह ऐप किसी वास्तविक डॉक्टर की जांच का विकल्प नहीं है।  
किसी भी चिकित्सा निर्णय के लिए डॉक्टर से अवश्य सलाह लें।

**This app is for educational purposes only. Results are based on raw pixel analysis and carry no clinical validity. Always consult a qualified ophthalmologist.**

---

## 🎨 Design

- **Theme**: Dark cyberpunk medical + full light mode toggle
- **Fonts**: Orbitron (display) + Sora (body) + JetBrains Mono (code)
- **Colors**: Cyan-500 (primary), Emerald-500 (success), Rose-500 (alert), Amber-500 (warning)
- **Effects**: Scan line animation, corner brackets, glow effects, gradient text

## 🔒 Privacy

- Zero server calls — all analysis happens in-browser via Canvas `getImageData`
- History stored in `localStorage` key: `eye_scan_history`
- Clearing browser data wipes all records
