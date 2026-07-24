# Personal site

Astro + MDX + React islands. Static output, so it deploys free on Cloudflare
Pages or GitHub Pages.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Before you publish

1. Replace `Your Name`, `you@yourname.com`, `yourhandle` throughout
   (`src/layouts/Base.astro`, `src/pages/about.astro`, `src/pages/resume.astro`).
2. Set your real domain in `astro.config.mjs` — the `site` value feeds the
   canonical tags and the RSS links.
3. Fill in `src/pages/about.astro` and the short version on `src/pages/resume.astro`.

## Adding an essay

Drop a `.mdx` file in `src/pages/writing/`. The frontmatter drives the log,
the RSS feed, and the page metadata:

```yaml
---
layout: ../../layouts/Essay.astro
title: Where the money actually goes in a clinical trial
date: 2026-07-15
gloss: One line. This is what shows in the log and the feed.
figure: true      # set true only if the essay contains a live figure
---
```

Nothing else needs updating. The homepage, the writing index, and `/rss.xml`
all read the directory.

## Adding a figure

Put the component in `src/components/` as a `.jsx` file, then in the essay:

```jsx
import Figure from '../../components/Figure.astro';
import MyChart from '../../components/MyChart.jsx';

<Figure label="FIG 1" caption="What the reader is looking at." fallback="/figures/my-chart.png">
  <MyChart client:visible />
</Figure>
```

`client:visible` means React only loads when the figure scrolls into view, so
essays without figures ship zero JavaScript.

**Always export a static fallback** to `public/figures/`. The email edition
cannot run React. Easiest way:

```bash
npm run dev
# open the essay, right-click the chart → Inspect → copy the <svg> element
# save it as public/figures/my-chart.svg
```

Or screenshot at 2x for a PNG. Either works; SVG stays sharp and is smaller.

## Deploying to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → connect the repo.
3. Build command `npm run build`, output directory `dist`.
4. Custom domains → add your domain. If you registered through Cloudflare, DNS
   is automatic; otherwise point a CNAME at the `pages.dev` subdomain.

Every push to `main` redeploys. Cost is $0.

## The Substack workflow

Site first, email second:

1. Publish the essay here. It's live and canonical.
2. Next day, paste the text into Substack.
3. Where the live figure sits, insert the static export and link back to the
   essay: "the interactive version is on my site."

Substack cannot point canonical tags at you, so search engines may still favor
the Substack copy. That's the price of the distribution. If it starts to bother
you, Buttondown ($9/mo) sends straight from `/rss.xml` and the problem
disappears — along with Substack's recommendation network.
