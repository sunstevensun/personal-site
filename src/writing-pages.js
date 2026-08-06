// Standalone HTML pages that live in public/ and aren't .mdx essays.
// Add one object per page and it appears in the writing log, sorted by date
// alongside your essays. The `url` must match where the file actually sits:
//   public/writing/superpower.html        ->  url: '/writing/superpower.html'
//   public/writing/superpower/index.html  ->  url: '/writing/superpower'
// Set `figure: true` if the page contains a live/interactive visual (shows FIG).

export const writingPages = [
  {
    title: 'Superpower',                 // replace with the real title
    date: '2026-08-06',                  // YYYY-MM-DD, controls sort order
    gloss: 'Biomarkers are consumer lead generators.',
    url: '/writing/superpower.html',     // match your actual path (see note above)
    figure: true,
  },
  {
    title: 'Oura',
    date: '2026-08-06',
    gloss: 'Consumer devices are on their way.',
    url: '/writing/oura.html',
    figure: true,
  },
];
