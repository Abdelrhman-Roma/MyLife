/* Momentum cinematic background layer. Video assets are intentionally deferred. */
(() => {
  const body = document.body;
  if (!body || document.getElementById('momentum-space-layer')) return;

  const page = body.dataset.page || 'auth';
  const family = page === 'auth' ? 'earth'
    : ['dashboard', 'statistics', 'account'].includes(page) ? 'jupiter'
    : ['workout', 'habits', 'goals', 'todo'].includes(page) ? 'mars' : 'earth';
  const fallback = { earth: 'Earth.jpg', mars: 'mars.jpg', jupiter: 'jupiter.jpg' }[family];
  const base = page === 'auth' ? '' : '../';
  body.dataset.space = family;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = `${base}css/space-video.css`;
  document.head.appendChild(css);

  const layer = document.createElement('div');
  layer.id = 'momentum-space-layer';
  layer.className = 'space-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `<div class="space-fallback" style="background-image:url('${base}assist/images/${fallback}')"></div><video class="space-video" muted loop playsinline preload="none"></video><div class="space-overlay"></div>`;
  body.prepend(layer);

  const video = layer.querySelector('video');
  const loadVideo = async () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const candidates = [
      { url: `${base}assist/videos/${family}.webm`, type: 'video/webm' },
      { url: `${base}assist/videos/${family}.mp4`, type: 'video/mp4' },
    ];
    let asset = null;
    try {
      for (const candidate of candidates) {
        const response = await fetch(candidate.url, { method: 'HEAD', cache: 'no-store' });
        if (response.ok) { asset = candidate; break; }
      }
    } catch (_) {
      layer.classList.add('video-fallback');
      return;
    }
    if (!asset) { layer.classList.add('video-fallback'); return; }
    video.src = asset.url;
    video.type = asset.type;
    video.load();
    const promise = video.play();
    if (promise) promise.catch(() => {});
  };
  video.addEventListener('canplay', () => layer.classList.add('video-ready'), { once: true });
  video.addEventListener('error', () => layer.classList.add('video-fallback'), { once: true });
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadVideo, { timeout: 1200 });
  else window.setTimeout(loadVideo, 250);

  // Cross-fade the outgoing cinematic layer before normal multi-page navigation.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || link.target || link.href.startsWith('mailto:') || link.hash) return;
    layer.classList.add('is-leaving');
  });
})();
