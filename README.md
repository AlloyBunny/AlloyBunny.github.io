# AlloyBunny.github.io

This site is built with [Quartz 4](https://quartz.jzhao.xyz/) and published from the Markdown files in `content/`.

## Daily workflow

Open `content/` as an Obsidian vault, write Markdown notes there, then commit and push.

## Local preview

```bash
npm ci
npx quartz build --serve
```

## Deployment

Pushing to `master` runs `.github/workflows/deploy.yml`, builds Quartz into `public/`, and deploys it with GitHub Pages Actions.
