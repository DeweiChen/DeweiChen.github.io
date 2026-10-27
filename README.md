# about-dw

Personal resume site of 陳德維 De-Wei Chen — live at **https://deweichen.github.io**.

It has two switchable layouts:

- **Classic** — a calm, readable resume. `Cmd/Ctrl + P` prints a dedicated A4 layout modelled on the original PDF resume.
- **Immersive** — the name is drawn by a 3D Gaussian Splatting–style particle cloud (Three.js) that ripples away from the cursor. Scrolling dissolves it into a star field while experience floats past on glass cards.
  Switching layouts plays a 2D ↔ 3D transition: the resume card peels off into particles, and collapses back onto the card on the way out — a nod to Vr2dDisplay (2D apps in a 3D scene).

The immersive layout is the front page. URL parameters: `?mode=2d` opens the classic layout directly, `?lang=zh|en` picks the language.

## Tech stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Three Fiber · motion · pnpm

## Development

```bash
pnpm install
pnpm dev
```

```bash
pnpm build && pnpm preview
```

## Editing content

All text lives in [`src/data/resume.ts`](src/data/resume.ts) (Chinese and English); every layout, including the print layout, reads from it.

| What | Where |
| --- | --- |
| Resume text, links, contact | `src/data/resume.ts` |
| Particle effect (cursor push, glow) | `src/immersive/splat.vert`, `src/immersive/SplatPortrait.tsx` |
| Print layout | `src/print/PrintResume.tsx`, `src/print/print.css` |
| Photo and company logos for print | `src/assets/print/` |

## Deployment

Every push to `main` builds and deploys to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
The repository's **Settings → Pages → Source** must be set to **GitHub Actions**.

## License

The source code is released under the [MIT License](LICENSE).

The personal content — resume text, the photo, and the company logos in `src/assets/print/` — is not covered by that license. The logos are trademarks of their respective owners.
