import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built output works regardless of the eventual GitHub
// Pages subpath — no remote is configured yet (see docs/), so the final
// <user>.github.io/<repo>/ path isn't known. Revisit once it is.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
});
