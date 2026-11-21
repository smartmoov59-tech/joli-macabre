/* ==========================================================================
   JOLI MACABRE — module de réservation (100 % statique, sans back-end)
   Le visiteur remplit un formulaire en 5 étapes ; le site prépare un message
   complet à envoyer au studio par message privé Instagram (copié dans le
   presse-papiers puis conversation ouverte), SMS ou e-mail si un numéro /
   une adresse est renseigné dans assets/js/config.js, + un fichier agenda
   .ics (créneau provisoire à confirmer). Aucun service tiers, aucun abonnement.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('bookForm');
  if (!form) return;
  var CFG = window.JM_CONFIG || {};
  var TZ = CFG.timezone || 'Europe/Paris';
  var HOURS = CFG.hours || { 1: [11, 18], 2: [11, 18], 3: [11, 18], 4: [11, 18], 5: [11, 18], 6: [11, 18], 0: null };
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var steps = $$('.step', form);
  var stepper = $$('#stepper li', form);
  var prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn'), nav = $('#bookNav');
  var msgBox = $('#f-msg'), toastEl = $('#toast');
  var cur = 0;
  var state = { date: null };

  /* ---------------- utilitaires ---------------- */
  function val(name) { var el = form.querySelector('[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function txt(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function todayParis() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function longDate(d) { return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
  function parseIso(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function toast(m, err) { toastEl.textContent = m; toastEl.style.color = err ? '#7a1118' : ''; }

  /* ---------------- calendrier ---------------- */
  var minDate = addDays(todayParis(), 1);
  var maxDate = addDays(todayParis(), 150);
  var view = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  var calEl = document.getElementById('cal');

  function renderCal() {
    var first = new Date(view.getFullYear(), view.getMonth(), 1);
    var last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    var offset = (first.getDay() + 6) % 7;
    var title = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(first);
    var canPrev = first > new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    var canNext = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= maxDate;
    var h = '<div class="cal__head"><button type="button" class="cal__btn" data-cal="prev" aria-label="Mois précédent"' + (canPrev ? '' : ' disabled') + '>←</button>' +
      '<p class="cal__title" id="calTitle">' + title + '</p>' +
      '<button type="button" class="cal__btn" data-cal="next" aria-label="Mois suivant"' + (canNext ? '' : ' disabled') + '>→</button></div>' +
      '<div class="cal__grid" role="group" aria-labelledby="calTitle">';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(function (d) { h += '<span class="cal__dow" aria-hidden="true">' + d + '</span>'; });
    for (var i = 0; i < offset; i++) h += '<span class="cal__day is-pad" aria-hidden="true"></span>';
    for (var day = 1; day <= last.getDate(); day++) {
      var d = new Date(view.getFullYear(), view.getMonth(), day);
      var dow = d.getDay();
      var disabled = d < minDate || d > maxDate || !HOURS[dow];
      var cls = 'cal__day' + (state.date === iso(d) ? ' is-on' : '') + (!HOURS[dow] ? ' is-closed' : '');
      h += '<button type="button" class="' + cls + '" data-date="' + iso(d) + '" aria-pressed="' + (state.date === iso(d)) + '" aria-label="' + longDate(d) + (!HOURS[dow] ? ' (studio fermé)' : '') + '"' + (disabled ? ' disabled' : '') + '>' + day + '</button>';
    }
    h += '</div>';
    calEl.innerHTML = h;
  }
  calEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.cal) { view = new Date(view.getFullYear(), view.getMonth() + (b.dataset.cal === 'next' ? 1 : -1), 1); renderCal(); return; }
    if (b.dataset.date) { state.date = b.dataset.date; $('#err-date').hidden = true; renderCal(); var on = $('.cal__day.is-on', calEl); if (on) on.focus(); }
  });
  renderCal();

  /* ---------------- type de contact ---------------- */
  var CT = {
    'Instagram': { label: 'Ton pseudo Instagram', ph: '@toi', type: 'text', mode: 'text', ac: 'off' },
    'Téléphone': { label: 'Ton numéro de téléphone', ph: '06 12 34 56 78', type: 'tel', mode: 'tel', ac: 'tel' },
    'E-mail': { label: 'Ton adresse e-mail', ph: 'toi@exemple.fr', type: 'email', mode: 'email', ac: 'email' }
  };
  function syncContact() {
    var c = CT[val('ctype')] || CT['Instagram'], inp = $('#f-contact');
    $('#contactLabel').textContent = c.label;
    inp.type = c.type; inp.placeholder = c.ph; inp.setAttribute('inputmode', c.mode); inp.setAttribute('autocomplete', c.ac);
  }
  $$('input[name="ctype"]', form).forEach(function (r) { r.addEventListener('change', syncContact); });
  syncContact();

  /* ---------------- étapes ---------------- */
  function show(n, dir, silent) {
    cur = n;
    steps.forEach(function (s, i) { s.classList.toggle('is-on', i === n); });
    stepper.forEach(function (li, i) { li.classList.toggle('is-on', i === n); li.classList.toggle('is-done', i < n); li.setAttribute('aria-current', i === n ? 'step' : 'false'); });
    prevBtn.disabled = n === 0;
    nextBtn.hidden = n === steps.length - 1;
    nextBtn.querySelector('span').textContent = n === steps.length - 2 ? 'Préparer mon message' : 'Continuer';
    if (silent) return;
    var el = steps[n];
    if (window.gsap && !RM) window.gsap.fromTo(el, { opacity: 0, x: (dir || 1) * 36 }, { opacity: 1, x: 0, duration: .7, ease: 'expo.out', clearProps: 'transform' });
    var lg = $('legend, .legend', el);
    if (lg) { lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); }
    var top = form.getBoundingClientRect().top;
    if (top < 60 && window.JM && window.JM.scrollTo) window.JM.scrollTo(form, { offset: -90, duration: 1 });
  }

  function validate(n) {
    if (n === 2) {
      if (!state.date && !$('#f-flex').checked) { var e = $('#err-date'); e.hidden = false; return false; }
    }
    if (n === 3) {
      var name = txt('f-name'), contact = txt('f-contact'), ct = val('ctype'), ok = !!name && !!contact && $('#f-adult').checked;
      if (ok && ct === 'E-mail') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      if (ok && ct === 'Téléphone') ok = contact.replace(/\D/g, '').length >= 8;
      var err = $('#err-step4'); err.hidden = ok;
      if (!ok) err.textContent = !name || !contact || !$('#f-adult').checked ? 'Indique ton prénom, un moyen de contact et confirme que tu as 18 ans ou plus.' : (ct === 'E-mail' ? 'Cette adresse e-mail ne semble pas valide.' : 'Ce numéro de téléphone ne semble pas valide.');
      return ok;
    }
    return true;
  }

  nextBtn.addEventListener('click', function () {
    if (!validate(cur)) return;
    if (cur === steps.length - 2) fillResult();
    show(Math.min(cur + 1, steps.length - 1), 1);
  });
  prevBtn.addEventListener('click', function () { show(Math.max(cur - 1, 0), -1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') { e.preventDefault(); if (!nextBtn.hidden) nextBtn.click(); }
  });

  /* ---------------- message ---------------- */
  function handle() {
    var a = val('artist'), ig = CFG.instagram || {};
    return a === 'lea' ? ig.lea : a === 'crevure' ? ig.crevure : ig.studio;
  }
  function artistName() { var a = val('artist'); return a === 'lea' ? 'Léa' : a === 'crevure' ? 'Crevure' : ''; }
  function buildMsg() {
    var a = artistName(), L = [];
    L.push('Bonjour' + (a ? ' ' + a : '') + ',');
    L.push('');
    L.push('Je souhaiterais réserver un tatouage. Voici mon projet :');
    L.push('');
    L.push('• Type de projet : ' + val('type'));
    L.push('• Tatoueuse souhaitée : ' + (a || 'peu importe, je me laisse conseiller'));
    if (txt('f-zone')) L.push('• Zone du corps : ' + txt('f-zone'));
    L.push('• Taille approximative : ' + val('size'));
    if (txt('f-idea')) L.push('• Idée / style / inspirations : ' + txt('f-idea'));
    if (txt('f-budget')) L.push('• Budget indicatif : ' + txt('f-budget'));
    var when = state.date ? longDate(parseIso(state.date)) + ', ' + val('slot') : 'à convenir ensemble';
    L.push('• Créneau souhaité : ' + when + ($('#f-flex').checked ? ' (je suis flexible sur la date)' : ''));
    L.push('• Prénom : ' + txt('f-name'));
    L.push('• Me répondre par : ' + val('ctype') + ' — ' + txt('f-contact'));
    L.push('• J’ai 18 ans ou plus : oui');
    L.push('');
    L.push('Je t’envoie mes images de référence juste après. Merci beaucoup !');
    return L.join('\n');
  }

  var sms = $('#sendSms'), mail = $('#sendMail'), igBtn = $('#sendIg');
  function refreshLinks() {
    var m = msgBox.value, phone = (CFG.phone || '').replace(/\s+/g, ''), email = CFG.email || '';
    if (phone) { sms.hidden = false; sms.href = 'sms:' + phone + '?&body=' + encodeURIComponent(m); }
    if (email) { mail.hidden = false; mail.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Demande de rendez-vous tatouage') + '&body=' + encodeURIComponent(m); }
  }
  function fillResult() {
    msgBox.value = buildMsg();
    var h = handle();
    $('#sendIgLabel').textContent = 'Copier et ouvrir Instagram (@' + h + ')';
    $('#resultHint').textContent = 'Relis-le, modifie-le si besoin, puis envoie-le au studio. Sur Instagram, le message est copié : il suffit de le coller dans la conversation.';
    toast('');
    refreshLinks();
  }
  msgBox.addEventListener('input', refreshLinks);

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      try { msgBox.focus(); msgBox.select(); document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
    });
  }
  $('#sendCopy').addEventListener('click', function () {
    copyText(msgBox.value).then(function () { toast('Message copié. Colle-le où tu veux le lui envoyer.'); }, function () { msgBox.select(); toast('Copie impossible automatiquement : le texte est sélectionné, fais Ctrl+C.', true); });
  });
  igBtn.addEventListener('click', function () {
    var url = 'https://ig.me/m/' + handle();
    copyText(msgBox.value).then(function () {
      toast('Message copié ✓ Instagram s’ouvre : colle-le dans la conversation puis envoie.');
      window.open(url, '_blank', 'noopener');
    }, function () {
      msgBox.select(); toast('Sélectionne et copie le message (Ctrl+C), puis ouvre Instagram.', true);
      window.open(url, '_blank', 'noopener');
    });
  });

  /* ---------------- fichier agenda (.ics) ---------------- */
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { var out = [], s = line; while (s.length > 73) { out.push(s.slice(0, 73)); s = ' ' + s.slice(73); } out.push(s); return out.join('\r\n'); }
  $('#sendIcs').addEventListener('click', function () {
    if (!state.date) { toast('Choisis d’abord un jour dans le calendrier (étape 3) pour créer le fichier agenda.', true); return; }
    var slot = form.querySelector('[name="slot"]:checked');
    var st = (slot.dataset.start || '11:00').replace(':', ''), en = (slot.dataset.end || '18:00').replace(':', '');
    var d = state.date.replace(/-/g, '');
    var now = new Date(), stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Joli Macabre//Demande de rendez-vous//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:jm-' + now.getTime() + '@joli-macabre', 'DTSTAMP:' + stamp,
      'DTSTART:' + d + 'T' + st + '00', 'DTEND:' + d + 'T' + en + '00',
      'SUMMARY:' + esc('Joli Macabre — rendez-vous tatouage (à confirmer)'),
      'LOCATION:' + esc((CFG.studioName || 'Joli Macabre') + ', ' + (CFG.address || '244 avenue de Strasbourg, 54000 Nancy')),
      'DESCRIPTION:' + esc('Créneau souhaité, à confirmer avec le studio.\n\n' + msgBox.value),
      'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'joli-macabre-rendez-vous.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Fichier agenda téléchargé : le créneau est marqué « provisoire ».');
  });

  /* ---------------- présélection depuis les cartes / artistes ---------------- */
  var TYPES = { projet: 0, flash: 1, lettrage: 2, conseil: 3 };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-service],[data-artist]');
    if (!a || !a.matches('a')) return;
    var svc = a.dataset.service, art = a.dataset.artist;
    if (svc && TYPES[svc] !== undefined) { var r = $$('input[name="type"]', form)[TYPES[svc]]; if (r) r.checked = true; }
    if (art) { var rr = form.querySelector('input[name="artist"][value="' + art + '"]'); if (rr) rr.checked = true; }
    if (cur !== 0) show(0, -1);
  });

  show(0, 1, true);
})();
