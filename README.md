# Wajahat Mahmood · Portfolio

Personal site for a software engineer who builds **real-time systems** and the tools that test the hardware they run on.

**Live:** [wajm1.com](https://wajm1.com)

Open to **2027 SWE** roles.

---

## What's here

This isn't a static brochure. The page is built like an engineering datasheet, with two interactive demos baked into the first scroll:

| Demo | What it does |
|------|----------------|
| **IK arm** | Drag (or arrow keys) to drive a 3-link planar arm. FABRIK solver, joint limits, live TCP readout. |
| **Collab editor** | Type a line, press Enter, and your edit broadcasts into a simulated multi-cursor buffer. |

Selected work covers:

- **GlanceScribe** · AI medical scribe from Meta smart-glasses video → SOAP notes (Best Healthcare, Hack Brooklyn '26)
- **Interbotix RX-200 driver** · C++ teleoperation + race-condition fixes powering IROS '26 research
- **Real-time collaborative code editor** · Socket.IO sync, session recovery, sandboxed runs ([live demo](https://wajm1.github.io/Code-Interview-Platform/))

---

## Stack on the site

Single `index.html`. No build step. No framework. Space Grotesk + JetBrains Mono, CSS custom properties, and a light / dark theme toggle that respects `prefers-color-scheme` and remembers your choice.

```
index.html          → the whole site
uploads/            → resume PDF
CNAME               → wajm1.com (GitHub Pages)
```

---

## Run it locally

```bash
# any static server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` in a browser.

---

## Contact

- Email: [wajm1.dev@gmail.com](mailto:wajm1.dev@gmail.com)
- GitHub: [github.com/wajm1](https://github.com/wajm1)
- LinkedIn: [linkedin.com/in/wajm1](https://linkedin.com/in/wajm1)
- Devpost: [devpost.com/wajm1](https://devpost.com/wajm1)

Sheet 01 / 01.
