// The feed is load-bearing: it's how essays reach your email tool, and
// it's what makes "site is canonical" true in practice. Buttondown and
// Ghost can both send from it directly.

const modules = import.meta.glob('./writing/*.mdx', { eager: true });

const escape = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET(context) {
  const site = context.site?.href.replace(/\/$/, '') ?? '';

  const items = Object.values(modules)
    .map((m) => ({ ...m.frontmatter, url: m.url }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${site}${p.url}</link>
      <guid isPermaLink="true">${site}${p.url}</guid>
      <description>${escape(p.gloss)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Your Name</title>
    <link>${site}</link>
    <description>Essays on biotech, drug development, and China.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
