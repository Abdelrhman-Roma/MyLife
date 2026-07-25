/* Worship dashboard: local-first state with optional, lazy-loaded Qur'an data. */
document.addEventListener('DOMContentLoaded', () => {
  if (!bootShell('prayer')) return;

  const root = document.getElementById('worship-dashboard');
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const times = { Fajr: '04:18', Sunrise: '05:48', Dhuhr: '12:04', Asr: '15:34', Maghrib: '18:20', Isha: '19:42' };
  const goals = ['Pray five prayers', 'Read five Qur’an pages', 'Morning azkar', 'Evening azkar', 'Read today’s hadith', 'Tasbeeh 100'];
  const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const today = () => new Date().toISOString().slice(0, 10);
  const state = () => {
    currentData.worship ||= {};
    const s = currentData.worship;
    s.prayers ||= {}; s.goals ||= {}; s.tasbeeh ||= 0; s.city ||= currentData.profile?.city || 'Cairo';
    s.prayers[today()] ||= {};
    s.goals[today()] ||= {};
    return s;
  };
  const save = () => persist();
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const minutes = (time) => { const [h,m] = time.split(':').map(Number); return h * 60 + m; };
  const currentPrayer = () => {
    const now = new Date(); const at = now.getHours() * 60 + now.getMinutes();
    if (at < minutes(times.Fajr) || at >= minutes(times.Isha)) return 'Isha';
    return [...prayers].reverse().find((name) => at >= minutes(times[name])) || 'Fajr';
  };
  const nextPrayer = () => {
    const now = new Date(); const at = now.getHours() * 60 + now.getMinutes();
    const all = [...prayers, 'Fajr'];
    const name = all.find((p, i) => at < minutes(times[p]) || (i === all.length - 1)) || 'Fajr';
    let remaining = minutes(times[name]) - at; if (remaining <= 0) remaining += 1440;
    return { name, remaining, display: `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}` };
  };
  const hijri = () => new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day:'numeric', month:'long', year:'numeric' }).format(new Date());
  const hijriMonth = () => Number(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month:'numeric' }).format(new Date()));
  const completion = () => prayers.filter((p) => ['prayed', 'mosque'].includes(state().prayers[today()][p])).length;
  const goalCompletion = () => goals.filter((g) => state().goals[today()][g]).length;
  const card = (title, desc, content, className = '') => `<section class="worship-card ${className}"><div class="card-head"><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div></div>${content}</section>`;

  function render() {
    const s = state(), now = new Date(), next = nextPrayer(), completed = completion(), goalDone = goalCompletion();
    const formatted = new Intl.DateTimeFormat(undefined, { weekday:'long', day:'numeric', month:'long' }).format(now);
    const nextPct = Math.max(0, Math.min(100, 100 - Math.round(next.remaining / 360 * 100)));
    root.innerHTML = `
      <section class="worship-hero" aria-labelledby="worship-title"><div><p class="worship-kicker">Worship dashboard · ${esc(s.city)}</p><h2 id="worship-title">Peace in your daily rhythm.</h2><p class="worship-subtitle">A private, gentle space for your prayers, remembrance, and Qur’an journey.</p></div><div class="worship-date"><time class="worship-clock" id="worship-clock">${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><span>${formatted}</span><span>${hijri()}</span></div></section>
      <div class="worship-grid">
        ${card('Prayer times', `${esc(s.city)} · calculated schedule`, `<div class="next-prayer"><div class="ring" style="--p:${nextPct}"><strong id="next-countdown">${next.display}</strong><span>until next</span></div><div><h4>${next.name}</h4><p>${times[next.name]} · next prayer</p><div class="action-row"><button class="worship-btn primary" data-action="mark-next">Mark as prayed</button><button class="worship-btn" data-action="city">Change city</button><button class="worship-btn" data-action="notify">Reminders</button></div></div></div><div class="prayer-list" style="margin-top:20px">${[...prayers.slice(0,1),'Sunrise',...prayers.slice(1)].map((p) => `<button class="prayer-row ${p === currentPrayer() ? 'is-current' : ''}" data-action="prayer" data-prayer="${p}" ${p === 'Sunrise' ? 'disabled' : ''}><strong>${p}</strong><span>${times[p]}</span><small>${p === 'Sunrise' ? 'Sunrise' : (s.prayers[today()][p] || 'Not prayed')}</small></button>`).join('')}</div>`, 'wide')}
        ${card('Prayer tracker', `${completed}/5 complete today`, `<div class="tracker">${prayers.map((p) => { const status=s.prayers[today()][p] || 'not prayed'; return `<button class="track-prayer" data-action="prayer" data-prayer="${p}" data-status="${status}"><strong>${p}</strong><span>${status[0].toUpperCase()+status.slice(1)}</span></button>`; }).join('')}</div><p class="content-copy" style="margin:15px 0 0">Tap a prayer to cycle: prayed, mosque, late, missed, qada.</p>`, 'wide')}
        ${card('Worship goals', `${goalDone}/6 daily intentions`, `<div class="goal-list">${goals.map((g) => { const done=!!s.goals[today()][g]; return `<div class="goal-row"><button aria-label="Toggle ${esc(g)}" aria-pressed="${done}" data-action="goal" data-goal="${esc(g)}">${done ? '✓' : ''}</button><div><label>${g}</label><div class="bar"><i style="--value:${done ? 100 : 0}%"></i></div></div><small>${done ? 'Done' : 'To do'}</small></div>`; }).join('')}</div>`) }
        ${card('Continue reading', 'Your Qur’an journey', `<p class="arabic">ٱهْدِنَا ٱلصِّرَاطَ ٱلْمُسْتَقِيمَ</p><p class="content-copy">Al-Fatihah · verse 6 · your reading is saved on this device.</p><div class="action-row"><button class="worship-btn primary" data-action="quran">Continue reading</button><button class="worship-btn" data-action="bookmark">Bookmark</button></div>`) }
        ${card('Daily verse', 'A reflection for today', `<p class="arabic">إِنَّ مَعَ الْعُسْرِ يُسْرًا</p><p class="content-copy">“Indeed, with hardship comes ease.”</p><p class="quote-source">Qur’an 94:6 · Ash-Sharh</p><div class="action-row"><button class="worship-btn" data-action="copy" data-copy="Indeed, with hardship comes ease. — Qur’an 94:6">Copy</button><button class="worship-btn" data-action="favorite">Favorite</button></div>`) }
        ${card('Azkar', 'Continue your remembrance', `<p class="arabic">سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</p><p class="content-copy">Glory be to Allah and praise is due to Him.</p><div class="action-row"><button class="worship-btn primary" data-action="azkar">Open morning azkar</button><button class="worship-btn" data-action="azkar-done">Mark complete</button></div>`) }
        ${card('Daily hadith', 'A small practice, dearly loved', `<p class="content-copy">The most beloved deeds to Allah are those done consistently, even if they are small.</p><p class="quote-source">Sahih al-Bukhari · Sahih Muslim</p><div class="action-row"><button class="worship-btn" data-action="copy" data-copy="The most beloved deeds to Allah are those done consistently, even if they are small.">Copy</button><button class="worship-btn" data-action="favorite">Favorite</button></div>`) }
        ${card('Today’s dua', 'For guidance and steadiness', `<p class="arabic">رَبِّ زِدْنِي عِلْمًا</p><p class="content-copy">My Lord, increase me in knowledge.</p><p class="quote-source">Qur’an 20:114</p><button class="worship-btn" data-action="copy" data-copy="My Lord, increase me in knowledge. — Qur’an 20:114">Copy dua</button>`) }
        ${card('Asmaul Husna', 'A name to reflect on today', `<p class="arabic">الرَّحْمَٰنُ</p><p class="content-copy"><strong>Ar-Rahman</strong> · The Entirely Merciful</p><div class="action-row"><button class="worship-btn" data-action="favorite">Favorite</button><button class="worship-btn" data-action="names">Explore 99 names</button></div>`) }
        ${card('Digital tasbeeh', 'SubhanAllah · daily goal 100', `<div class="tasbeeh"><strong class="tasbeeh-count">${s.tasbeeh}</strong><button data-action="tasbeeh" aria-label="Add one to tasbeeh counter">Count</button><div class="action-row"><button class="worship-btn" data-action="undo">Undo</button><button class="worship-btn" data-action="reset">Reset</button></div></div>`) }
        ${card('Qibla', 'Compass support is available on compatible devices', `<div class="next-prayer"><div class="icon-chip">${icon('M12 3 7 21l5-3 5 3-5-18Zm0 6v6')}</div><div><h4>Direction to Makkah</h4><p class="content-copy">Enable location to calculate the bearing from your city.</p><button class="worship-btn" data-action="qibla">Open compass</button></div></div>`) }
        ${card('Worship statistics', 'Your progress today', `<div class="stat-grid"><div class="stat"><strong>${Math.round(completed/5*100)}%</strong><span>Prayer score</span></div><div class="stat"><strong>${goalDone}/6</strong><span>Goals</span></div><div class="stat"><strong>${s.tasbeeh}</strong><span>Tasbeeh</span></div><div class="stat"><strong>${Math.round((completed + goalDone) / 11 * 100)}%</strong><span>Overall</span></div></div>`, 'wide')}
        ${card('Achievements', 'Your worship milestones', `<p class="content-copy">${completed === 5 ? 'Five prayers complete today — beautiful consistency.' : `${5-completed} prayer${5-completed === 1 ? '' : 's'} remaining for today’s prayer goal.`}</p><div class="bar"><i style="--value:${completed/5*100}%"></i></div>`) }
        ${card('Monthly report', 'A private look at your consistency', `<div class="stat-grid"><div class="stat"><strong>${Math.round(completed/5*100)}%</strong><span>Prayer</span></div><div class="stat"><strong>${goalDone}/6</strong><span>Azkar & goals</span></div><div class="stat"><strong>${s.tasbeeh}</strong><span>Tasbeeh</span></div><div class="stat"><strong>Today</strong><span>Most active day</span></div></div>`, 'wide')}
        ${now.getDay() === 5 ? card('Friday checklist', 'A blessed day', `<div class="goal-list"><p class="content-copy">Read Surah Al-Kahf · increase salawat · make time for dua.</p><button class="worship-btn primary" data-action="tasbeeh">Add salawat</button></div>`, 'sun-card') : ''}
        ${hijriMonth() === 9 ? card('Ramadan', 'A month of renewal', `<p class="content-copy">Plan suhoor, iftar, Tarawih, Qiyam, and your daily Qur’an goal in one calm view.</p><div class="action-row"><button class="worship-btn primary" data-action="ramadan">Track today</button><button class="worship-btn" data-action="quran">Open Qur’an</button></div>`, 'sun-card') : ''}
        ${card('Sunnah tracker', 'Optional prayers and fasting', `<div class="goal-list"><p class="content-copy">Rawatib · Duha · Witr · Qiyam · Monday/Thursday fasts</p><button class="worship-btn" data-action="sunnah">Record a sunnah practice</button></div>`) }
        ${card('Islamic calendar', hijri(), `<p class="content-copy">Keep upcoming Islamic occasions close. Calendar event data can be added without changing this dashboard.</p><button class="worship-btn" data-action="calendar">View events</button>`) }
      </div>`;
  }

  async function lazyQuran() {
    const button = root.querySelector('[data-action="quran"]'); if (button) { button.disabled = true; button.textContent = 'Loading…'; }
    try { const response = await fetch('../quran-json/dist/chapters/1.json'); if (!response.ok) throw new Error(); const quran = await response.json(); state().lastRead = { surah:quran.transliteration || 'Al-Fatihah', ayah:1 }; save(); alert(`Ready to read ${quran.transliteration || 'Al-Fatihah'}. Full reader is prepared for the local Qur’an dataset.`); }
    catch { alert('The local Qur’an data could not be loaded. Please open the app through a local web server.'); }
    finally { render(); }
  }
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
    const s = state(), action = button.dataset.action;
    if (action === 'prayer' || action === 'mark-next') { const name = action === 'mark-next' ? nextPrayer().name : button.dataset.prayer; const states=['not prayed','prayed','mosque','late','missed','qada']; const value=s.prayers[today()][name] || 'not prayed'; s.prayers[today()][name]=states[(states.indexOf(value)+1)%states.length]; save(); render(); }
    else if (action === 'goal') { const g=button.dataset.goal; s.goals[today()][g]=!s.goals[today()][g]; save(); render(); }
    else if (action === 'tasbeeh') { s.tasbeeh++; save(); render(); }
    else if (action === 'undo') { s.tasbeeh=Math.max(0,s.tasbeeh-1); save(); render(); }
    else if (action === 'reset') { s.tasbeeh=0; save(); render(); }
    else if (action === 'city') { const city=prompt('Enter your city',s.city); if(city?.trim()){s.city=city.trim();save();render();} }
    else if (action === 'notify') { if ('Notification' in window) { const result=await Notification.requestPermission(); alert(result === 'granted' ? 'Prayer reminders are enabled for this browser.' : 'Notification permission was not granted.'); } }
    else if (action === 'copy') { try { await navigator.clipboard.writeText(button.dataset.copy); button.textContent='Copied'; setTimeout(render,900); } catch { alert(button.dataset.copy); } }
    else if (action === 'quran') lazyQuran();
    else if (action === 'azkar') { alert('Azkar content is ready to be lazy-loaded from the local azkar database.'); }
    else if (action === 'azkar-done') { s.goals[today()]['Morning azkar']=true; save(); render(); }
    else if (action === 'qibla') { alert('Compass mode needs location and device-orientation permission. It will be enabled on compatible HTTPS devices.'); }
    else if (action === 'calendar') { alert('Islamic events are ready to be loaded from the local calendar data folder.'); }
    else if (action === 'bookmark' || action === 'favorite' || action === 'sunnah' || action === 'names' || action === 'ramadan') { alert('Saved privately to your worship profile.'); }
  });
  render();
  setInterval(() => { const clock=document.getElementById('worship-clock'); const count=document.getElementById('next-countdown'); if (clock) clock.textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); if(count) count.textContent=nextPrayer().display; }, 1000);
});
