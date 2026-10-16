# about-dw

陳德維 De-Wei Chen 的個人履歷網站，有兩種可切換的排版：

- **經典（Classic）**：穩重、好讀的履歷，`Cmd/Ctrl + P` 可直接輸出白底 PDF。
- **沉浸（Immersive）**：Three.js 粒子名字，游標經過會推散粒子；捲動時粒子散成星空，經歷以玻璃卡片漂浮呈現。
  切換時 2D 履歷卡片會「飛進」3D 空間化成粒子，切回時粒子再收回卡片位置（致敬 Vr2dDisplay）。

網址參數：`?mode=3d` 直接進入沉浸模式，`?lang=zh|en` 指定語言。

## 技術

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Three Fiber · motion · pnpm

## 開發

```bash
pnpm install
pnpm dev
```

## 修改內容

所有文字都在 [`src/data/resume.ts`](src/data/resume.ts)（中英兩份），兩種排版都只讀這份資料。
PDF 中標示 `(Link)` 的項目（Viveport Cloud Portal、OvOy）網址請填入檔案頂端的 `VIVEPORT_CLOUD`、`OVOY`。

## 部署到 GitHub Pages（User site）

1. 在 GitHub 建立名為 `<你的帳號>.github.io` 的 repo。
2. 推上 `main` 分支：
   ```bash
   git init && git add -A && git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:<你的帳號>/<你的帳號>.github.io.git
   git push -u origin main
   ```
3. Repo → Settings → Pages → Source 選 **GitHub Actions**。
4. 之後每次推到 `main`，`.github/workflows/deploy.yml` 會自動建置並發布到 `https://<你的帳號>.github.io`。
