# AlloyBunny.github.io

This site is built with [Quartz 4](https://quartz.jzhao.xyz/) and published from the Markdown files in `content/`.

## Daily workflow

Open `content/` as an Obsidian vault, write Markdown notes there, then commit and push.

For the shortest publish path, run:

```bash
npm run publish -- "Update notes"
```

If you omit the message, the script creates one from the current timestamp:

```bash
npm run publish
```

## Local preview

```bash
npm ci
npx quartz build --serve
```

## Deployment

Pushing to `master` runs `.github/workflows/deploy.yml`, builds Quartz into `public/`, and deploys it with GitHub Pages Actions.

The publish script also copies `public/` to the repository root and keeps `.nojekyll` present. This makes the site work even when GitHub Pages is configured to publish from `master` root instead of GitHub Actions.
