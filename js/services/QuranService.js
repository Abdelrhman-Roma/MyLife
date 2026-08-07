// MyLife — QuranService
// Loads this project's own bundled Quran data (data/quran/). Never called
// directly from UI code — js/prayer.js only talks to this service.
const QuranService = (() => {
  function validateChapterList(data, url) {
    if (!Array.isArray(data) || data.length !== 114) {
      throw new Error(`Invalid chapter index at ${url}: expected an array of 114 chapters, got ${Array.isArray(data) ? data.length : typeof data}.`);
    }
    const required = ['id', 'name', 'transliteration', 'type', 'total_verses'];
    const bad = data.find((c) => required.some((k) => !(k in c)));
    if (bad) throw new Error(`Invalid chapter entry in index: missing one of ${required.join(', ')}.`);
    return data;
  }

  function validateChapter(data, id, url) {
    if (!data || typeof data !== 'object') throw new Error(`Invalid chapter ${id} at ${url}: not an object.`);
    if (!Array.isArray(data.verses) || !data.verses.length) throw new Error(`Invalid chapter ${id} at ${url}: missing or empty "verses" array.`);
    const badVerse = data.verses.find((v) => typeof v.id !== 'number' || typeof v.text !== 'string');
    if (badVerse) throw new Error(`Invalid chapter ${id} at ${url}: a verse is missing "id" or "text".`);
    return data;
  }

  async function getChapterList() {
    const url = PathResolver.quranChapterIndex();
    const data = await DataService.fetchJson(url, { label: 'Quran chapter index' });
    const list = Array.isArray(data) ? data.map((chapter) => ({
      id: chapter.id,
      name: chapter.name,
      transliteration: chapter.transliteration,
      type: chapter.type,
      total_verses: chapter.total_verses || (Array.isArray(chapter.verses) ? chapter.verses.length : 0),
    })) : data;
    return validateChapterList(list, url);
  }

  async function getChapter(id) {
    const url = PathResolver.quranChapter(id);
    const data = await DataService.fetchJson(url, { label: `Quran chapter ${id}` });
    return validateChapter(data, id, url);
  }

  // Loads every chapter (each individually cached) for full-text search.
  // Only slow the first time; every chapter fetched once stays cached.
  async function getAllChapters(onProgress) {
    const list = await getChapterList();
    const out = [];
    for (let i = 0; i < list.length; i++) {
      out.push(await getChapter(list[i].id));
      if (onProgress) onProgress(i + 1, list.length);
    }
    return out;
  }

  return { getChapterList, getChapter, getAllChapters };
})();
window.QuranService = QuranService;
