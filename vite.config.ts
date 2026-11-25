import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the app also works in a subfolder
  // like https://<user>.github.io/<repo>/ on GitHub Pages.
  base: './',
});
