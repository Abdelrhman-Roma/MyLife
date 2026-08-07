// MyLife — AzkarService
// Loads this project's own bundled Azkar data (data/azkar/azkar_obj.json).
// Categories are discovered dynamically from the data itself — never
// hardcoded — since the real dataset uses ~130 Arabic category names, not
// the small illustrative English list ("Morning/Evening/...") sometimes
// used as a rough guide.
const AzkarService = (() => {
  function validate(data, url) {
    if (!Array.isArray(data) || !data.length) throw new Error(`Invalid azkar data at ${url}: expected a non-empty array.`);
    const required = ['category', 'zekr', 'count'];
    const bad = data.find((z) => required.some((k) => !(k in z)));
    if (bad) throw new Error(`Invalid azkar entry: missing one of ${required.join(', ')}.`);
    return data;
  }

  let cached = null;

  async function getAll() {
    if (cached) return cached;
    const url = PathResolver.azkar();
    const data = await DataService.fetchJson(url, { label: 'Azkar data' });
    cached = validate(data, url);
    return cached;
  }

  async function getCategories() {
    const all = await getAll();
    const set = new Set(all.map((z) => z.category));
    return [...set];
  }

  async function getByCategory(category) {
    const all = await getAll();
    return all.filter((z) => z.category === category);
  }

  async function search(query) {
    const all = await getAll();
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter((z) => (z.zekr || '').includes(query.trim()) || (z.search || '').includes(query.trim()) || (z.description || '').toLowerCase().includes(q));
  }

  return { getAll, getCategories, getByCategory, search };
})();
window.AzkarService = AzkarService;
