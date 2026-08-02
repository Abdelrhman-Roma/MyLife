// js/gamification-ui.js — Phase 9: XP/level-up/achievement animations.
//
// Purely reactive: listens for the DOM CustomEvents core/GamificationEngine.js
// dispatches (mylife:xp-awarded, mylife:level-up, mylife:achievement-unlocked)
// and renders a small floating overlay. Nothing here calls into Firestore —
// this file only knows how to animate an event it's told about, which is
// what makes it reusable regardless of which module eventually triggers it.

function ensureOverlayRegion() {
  let region = document.getElementById('gamification-overlay');
  if (!region) {
    region = document.createElement('div');
    region.id = 'gamification-overlay';
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

window.addEventListener('mylife:xp-awarded', (e) => {
  const { amount } = e.detail;
  if (!amount) return;
  const region = ensureOverlayRegion();
  const pop = document.createElement('div');
  pop.className = 'gami-xp-pop';
  pop.textContent = `+${amount} XP`;
  region.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove(), { once: true });
});

window.addEventListener('mylife:level-up', (e) => {
  const { level } = e.detail;
  const region = ensureOverlayRegion();
  const banner = document.createElement('div');
  banner.className = 'gami-levelup-banner';
  banner.innerHTML = `
    <div class="gami-confetti" aria-hidden="true">${Array.from({ length: 24 }).map((_, i) => `<span style="--i:${i}"></span>`).join('')}</div>
    <p class="gami-levelup-title">${typeof t === 'function' ? t('Level Up!') : 'Level Up!'}</p>
    <p class="gami-levelup-level">${typeof t === 'function' ? t('Level') : 'Level'} ${level}</p>
  `;
  region.appendChild(banner);
  banner.addEventListener('click', () => banner.remove());
  setTimeout(() => banner.remove(), 4200);
});

window.addEventListener('mylife:achievement-unlocked', (e) => {
  const { def } = e.detail;
  const region = ensureOverlayRegion();
  const card = document.createElement('div');
  card.className = 'gami-achievement-card';
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;
  card.innerHTML = `
    <span class="gami-achievement-icon" aria-hidden="true">\ud83c\udfc6</span>
    <div>
      <p class="gami-achievement-label">${def.secret ? (typeof t === 'function' ? t('Secret achievement unlocked') : 'Secret achievement unlocked') : (typeof t === 'function' ? t('Achievement unlocked') : 'Achievement unlocked')}</p>
      <p class="gami-achievement-title">${escape(def.title)}</p>
    </div>
  `;
  region.appendChild(card);
  card.addEventListener('click', () => card.remove());
  setTimeout(() => card.remove(), 5000);
});
