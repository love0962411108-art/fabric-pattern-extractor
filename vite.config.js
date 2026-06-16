import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function resolveBase() {
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return explicitBase;
  }

  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (repoName) {
    return `/${repoName}/`;
  }

  return '/fabric-pattern-extractor/';
}

export default defineConfig({
  plugins: [react()],
  base: resolveBase(),
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
