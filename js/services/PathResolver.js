// MyLife — PathResolver
// Resolves data-file URLs relative to the PROJECT ROOT, computed from this
// script's own <script src> location rather than a hardcoded "../" — so it
// stays correct no matter which page (or how deeply nested a future page)
// includes it. This file must be loaded via a plain <script> tag (not
// dynamically injected after the fact) so document.currentScript is valid.
const PathResolver = (() => {
  // This file lives at js/services/PathResolver.js — two directories below
  // the project root — so the root is two levels up from here.
  const thisScriptUrl = document.currentScript && document.currentScript.src;
  const root = thisScriptUrl ? new URL('../../', thisScriptUrl) : new URL('../../', window.location.href);

  function resolve(relativePath) {
    return new URL(relativePath, root).href;
  }

  return {
    root: root.href,
    quranChapterIndex: () => resolve('data/quran/chapters/index.json'),
    quranChapter: (id) => resolve(`data/quran/chapters/${id}.json`),
    quranFull: () => resolve('data/quran/quran.json'),
    azkar: () => resolve('data/azkar/azkar_obj.json'),
    hadith: () => resolve('data/hadith/api-1.json'), // present for completeness; see HadithService for why this isn't real hadith data
    // True when the page was opened as a local file (double-clicked) rather
    // than served over http(s) — fetch() of same-origin JSON is blocked by
    // the browser in this mode, which is the #1 cause of a generic
    // "Failed to fetch" error for a project like this one.
    isFileProtocol: () => window.location.protocol === 'file:',
  };
})();
window.PathResolver = PathResolver;
