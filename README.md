# AlloyBunny.github.io

Personal blog built with [Astro](https://astro.build/) and the
[Fuwari](https://github.com/saicaca/fuwari) template.

## Writing

Write posts as Markdown files in `src/content/posts/`.

The frontmatter format is:

```yaml
---
title: My Post
published: 2026-05-24
tags: ["手册"]
category: "手册"
draft: false
---
```

## Local Development

```bash
npm ci
npm run dev
```

## Verify

```bash
make verify
```

This regenerates favicons from `src/assets/images/avatar.jpeg`, then runs tests,
Astro check, and the production build.

## Publish

```bash
make publish MSG="Update blog"
```

This runs verification, stages non-ignored changes, commits them, and pushes to
`origin master`. GitHub Actions deploys the generated `dist/` output to GitHub
Pages.
