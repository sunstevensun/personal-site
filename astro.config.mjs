import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  // Change this to your real domain once the DNS is pointed.
  site: 'https://yourname.com',
  integrations: [mdx(), react()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
