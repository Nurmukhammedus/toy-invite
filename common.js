/* Общая логика для шаблонов: данные, календарь, отсчёт, анкета, музыка, .ics, появление блоков.
   Шаблон подключает ../data.js и ../common.js и задаёт window.INV_BASE = '../' до подключения. */
(function () {
  const C = CONFIG, BASE = window.INV_BASE || '';
  const WED = new Date(C.date), DAY = +C.date.slice(8, 10), MON = +C.date.slice(5, 7), YEAR = +C.date.slice(0, 4);
  const sub = s => String(s).replace(/\{groom\}/g, C.groom).replace(/\{bride\}/g, C.bride);
  const p2 = n => String(n).padStart(2, '0');
  const V = Object.assign({}, C, {
    couple: `${C.groom} & ${C.bride}`, day: DAY, year: YEAR, mon: p2(MON),
    text: sub(C.text), text2: sub(C.text2), deadline: C.rsvp.deadline,
    dateLine: `${p2(DAY)} · ${p2(MON)} · ${YEAR}`, dateShort: `${p2(DAY)}.${p2(MON)}.${YEAR}`,
    time: C.program[0] ? C.program[0][0] : ''
  });
  const HTML_KEYS = ['text', 'text2', 'dress'];

  function fill(root = document) {
    root.querySelectorAll('[data-c]').forEach(e => {
      const k = e.dataset.c;
      if (HTML_KEYS.includes(k)) e.innerHTML = V[k]; else e.textContent = V[k] ?? '';
    });
    root.querySelectorAll('[data-map]').forEach(a => { a.href = C.mapUrl; a.target = '_blank'; a.rel = 'noopener'; });
    root.querySelectorAll('[data-ics]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); ics(); }));
  }

  function calendar(el, mark) {
    const first = (new Date(Date.UTC(YEAR, MON - 1, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(YEAR, MON, 0)).getUTCDate();
    let h = ['Дш', 'Шш', 'Шр', 'Бш', 'Жм', 'Иш', 'Жк'].map(w => `<span class="wd">${w}</span>`).join('');
    h += '<span></span>'.repeat(first);
    for (let d = 1; d <= days; d++) h += d === DAY ? `<span class="hl">${d}${mark || ''}</span>` : `<span>${d}</span>`;
    el.innerHTML = h;
  }

  function ics() {
    const f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const end = new Date(WED.getTime() + 6 * 3600e3);
    const t = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//invite//KG', 'BEGIN:VEVENT', `UID:${f(WED)}@invite`, `DTSTAMP:${f(new Date())}`,
      `DTSTART:${f(WED)}`, `DTEND:${f(end)}`, `SUMMARY:${C.groom} & ${C.bride} — үйлөнүү тою`, `LOCATION:${C.venueType} ${C.venue}, ${C.address}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Эртең той!', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: 'text/calendar' })); a.download = 'toy.ics'; a.click();
  }

  function countdown(cb) {
    const tick = () => { let s = Math.max(0, Math.floor((WED - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; cb(d, h, Math.floor(s / 60), s % 60); };
    tick(); return setInterval(tick, 1000);
  }

  function music(btn) {
    const a = new Audio(BASE + C.music); a.loop = true; a.volume = .7;
    const set = on => { btn.classList.toggle('on', on); on ? a.play().catch(() => btn.classList.remove('on')) : a.pause(); };
    btn.addEventListener('click', e => { e.stopPropagation(); set(a.paused); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !a.paused) { a.pause(); btn.dataset.r = 1; }
      else if (!document.hidden && btn.dataset.r) { delete btn.dataset.r; set(true); }
    });
    return { start() { btn.hidden = false; set(true); } };
  }

  // форма: input[name=name], radio[name=attend] (value yes/no), [data-guests] с [data-minus]/[data-plus]/[data-count],
  // textarea[name=msg], [data-err], button[type=submit]
  function rsvp(form, onDone) {
    let g = 1; const cnt = form.querySelector('[data-count]'), box = form.querySelector('[data-guests]');
    form.querySelector('[data-minus]').onclick = () => { g = Math.max(1, g - 1); cnt.textContent = g; };
    form.querySelector('[data-plus]').onclick = () => { g = Math.min(20, g + 1); cnt.textContent = g; };
    form.querySelectorAll('[name=attend]').forEach(r => r.onchange = () => { box.style.display = form.elements.namedItem('attend').value === 'yes' ? '' : 'none'; });
    form.addEventListener('submit', async e => {
      e.preventDefault(); const err = form.querySelector('[data-err]'); err.textContent = '';
      const F = form.elements, nameEl = F.namedItem('name'), name = nameEl.value.trim(); if (!name) { err.textContent = 'Атыңызды жазыңыз'; nameEl.focus(); return; }
      const yes = F.namedItem('attend').value === 'yes', msg = (F.namedItem('msg') && F.namedItem('msg').value.trim()) || '';
      const attend = yes ? 'Ооба, катышам' : 'Катыша албайм';
      const btn = form.querySelector('[type=submit]'), label = btn.textContent; btn.disabled = true; btn.textContent = 'Жөнөтүлүүдө…';
      try {
        if (C.rsvp.sheetUrl) await fetch(C.rsvp.sheetUrl, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ name, attend, guests: yes ? g : 0, msg }) });
        else {
          const t = `Салам! Мен ${name}.\n${C.groom} & ${C.bride} тою: ${attend}${yes ? `, ${g} киши` : ''}.${msg ? `\n${msg}` : ''}`;
          location.href = `https://wa.me/${C.rsvp.whatsapp}?text=${encodeURIComponent(t)}`;
        }
        onDone && onDone();
      } catch (_) { err.textContent = 'Интернет байланышын текшерип, кайра аракет кылыңыз'; btn.disabled = false; btn.textContent = label; }
    });
  }

  function reveal(sel = '.rv', root) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { root: root || null, threshold: .15 });
    document.querySelectorAll(sel).forEach(e => io.observe(e));
  }

  const photo = i => C.photos && C.photos[i] ? BASE + C.photos[i] : null;

  window.INV = { C, V, WED, DAY, MON, YEAR, sub, fill, calendar, ics, countdown, music, rsvp, reveal, photo };
})();
