# Wajahat Mahmood · Engineering portfolio

Static personal website for software engineering, robot integration, and test automation. Queens College CS, expected December 2026.

[Custom domain](https://wajm1.com/) · [GitHub](https://github.com/wajm1) · [LinkedIn](https://www.linkedin.com/in/wajm1/)

## Content

- rf IDEAS: Python robotic RFID validation, calibration, configuration, feedback and result logging.
- Michigan/RIX: C++/SDL2 teleoperation, synchronization, POSIX/TCP tests, and accepted IROS 2026 research.
- Viam dual-arm throw and catch: PyBullet physics, gravity-aware catch replanning, and a read-only/dry-run Viam adapter.
- xArm Robot Learning: Isaac Lab PPO cube-lift training with randomized states and parallel simulation.
- CUNY Connect: Next.js/Supabase networking, realtime messaging and validated/cached recommendations.
- GlanceScribe: team-built Healthcare track winner; live media, browser audio transcription, transcript-based SOAP drafts, and FFmpeg.
- Project filters for robotics and software work.

The project preserves its HTML/CSS/JavaScript stack and light/dark engineering-drawing design. No frontend framework or runtime package installation is required.

## Files and public output

`index.html` contains the active site. `favicon.svg` and selected robot-demo media are public assets. The current master resume PDF is stored in the repository, but it is unlinked from the site and excluded from the public package.

`Portfolio.dc.html` and `support.js` are historical design/export artifacts, not loaded by the active page and not included in the public package. They are retained unchanged to preserve prior work.

Private career research, Overleaf LaTeX source, LinkedIn copy and interview preparation live in ignored `career_refresh/`. **Do not serve, publish or force-add that directory.** The build copies an explicit allowlist into `dist/` and refuses unexpected or private output files. Package public output, never the whole checkout.

## Validate and preview

```sh
node scripts/validate.mjs
node scripts/build.mjs
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Validation checks inline JavaScript syntax, local links, anchors, duplicate IDs, and selected content.

Browser QA should cover desktop/mobile, both themes, project filters, disclosures and email copy. Verify there are no resume-download links. Video uses `preload="none"`; the external demonstration iframe is lazy-loaded. No API keys or backend credentials are needed.

## Publishing

`CNAME` preserves the custom domain for GitHub Pages. Public publication is a separate decision from local validation.

Contact: [wajm1.dev@gmail.com](mailto:wajm1.dev@gmail.com).
