// MyLife — HadithService
// data/hadith/api-1.json, despite its name and location, is the OpenAPI
// specification for the AlAdhan Prayer Times API — not hadith content. There
// is no hadith text anywhere in this project. Rather than have UI code
// discover that by a failed/empty fetch, this service says so directly so
// callers can show a clear "not available" state instead of a generic error.
const HadithService = (() => {
  async function getAll() {
    throw Object.assign(
      new Error('No Hadith dataset is present in this project. data/hadith/api-1.json is the AlAdhan Prayer Times API spec, not hadith text — see PathResolver.hadith() and this file\u2019s header comment.'),
      { code: 'NO_DATA' }
    );
  }

  function isAvailable() {
    return false;
  }

  return { getAll, isAvailable };
})();
