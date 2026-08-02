import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, existsSync } from 'fs';

/**
 * Phase 6 audit fix: `sw.js`, `offline.html`, `data/*.json`, and `assist/*`
 * are only ever referenced via runtime strings — `navigator.serviceWorker
 * .register('../sw.js')`, `fetch(url)` inside DataService, an offline-page
 * URL string inside sw.js itself, and image paths inside manifest.json
 * (which Vite doesn't parse as JS/HTML). None of that is visible to Vite's
 * static import/HTML analysis, so `vite build` was silently producing a
 * `dist/` folder missing the service worker, the offline fallback page, and
 * every bit of bundled Quran/Azkar/Hadith content — a real, previously
 * undetected production bug caught in this phase's audit. Rather than move
 * these into Vite's `public/` convention (which would mean rewriting every
 * existing relative path across 12 HTML files and 19 CSS files — too
 * invasive and risky for what this bug actually needs), this copies them
 * into `dist/` verbatim after the build, with no new dependency required.
 */
function copyRuntimeReferencedAssets() {
  return {
    name: 'copy-runtime-referenced-assets',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      const copies = [
        ['sw.js', 'sw.js'],
        ['offline.html', 'offline.html'],
        ['manifest.json', 'manifest.json'], // defensive: copied even if Vite's HTML plugin also handles the <link rel="manifest"> reference
        // Most of this established application still uses ordered classic
        // scripts. Vite deliberately leaves those URLs untouched (rather
        // than changing their execution order), so they must be present in
        // dist exactly as referenced by the generated HTML.
        ['css', 'css'],
        ['js', 'js'],
        ['locales', 'locales'],
        ['data', 'data'],
        ['assist', 'assist'],
      ];
      for (const [src, dest] of copies) {
        const from = resolve(__dirname, src);
        if (existsSync(from)) cpSync(from, resolve(outDir, dest), { recursive: true });
      }
    },
  };
}

// Multi-page build config. Vite's dev server (`npm run dev`) will serve any
// page directly with no config needed; this input list is only required for
// `npm run build` to know about every HTML entry point in the app.
export default defineConfig({
  root: '.',
  plugins: [copyRuntimeReferencedAssets()],
  build: {
    // Phase 4 production-hardening: explicit, sane defaults rather than
    // relying on Vite's own defaults silently doing the right thing.
    minify: 'esbuild', // fast, effective JS/CSS minification for smaller bundles
    sourcemap: false, // don't ship source maps to production (avoids exposing original source structure)
    cssCodeSplit: true, // each page's CSS ships separately rather than one giant combined stylesheet
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        account: resolve(__dirname, 'pages/account.html'),
        calendar: resolve(__dirname, 'pages/calendar.html'),
        dashboard: resolve(__dirname, 'pages/dashboard.html'),
        goals: resolve(__dirname, 'pages/goals.html'),
        habits: resolve(__dirname, 'pages/habits.html'),
        nutrition: resolve(__dirname, 'pages/nutrition.html'),
        prayer: resolve(__dirname, 'pages/prayer.html'),
        statistics: resolve(__dirname, 'pages/statistics.html'),
        study: resolve(__dirname, 'pages/study.html'),
        todo: resolve(__dirname, 'pages/todo.html'),
        weather: resolve(__dirname, 'pages/weather.html'),
        workout: resolve(__dirname, 'pages/workout.html'),
      },
      output: {
        // The `firebase` package is the one heavy shared dependency across
        // every migrated page (currently just Todo) — splitting it into its
        // own chunk means the browser downloads and caches it once, instead
        // of it being duplicated into each page's own bundle as more pages
        // get migrated in future phases.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }
        },
      },
    },
  },
});
