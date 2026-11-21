/* ==========================================================================
   JOLI MACABRE — animations (GSAP + ScrollTrigger + Lenis)
   Règles : on n'anime que transform et opacity, courbes douces (expo/power3),
   stagger partout, prefers-reduced-motion respecté, animations lourdes
   simplifiées sur mobile.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var CFG = window.JM_CONFIG || {};
  var root = document.documentElement;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // Bibliothèques absentes : le site reste entièrement lisible sans animation.
    root.classList.remove('js'); root.classList.add('rm');
    return;
  }
  if (RM) root.classList.add('rm');
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  var lenis = null;
  var API = (window.JM = window.JM || {});
  API.scrollTo = function (target, opts) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el && target !== 0) return;
    if (lenis) lenis.scrollTo(target === 0 ? 0 : el, Object.assign({ duration: 1.7, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } }, opts || {}));
    else if (target === 0) window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  };
  API.stopScroll = function () { if (lenis) lenis.stop(); };
  API.startScroll = function () { if (lenis) lenis.start(); };

  /* ---------------------------------------------------------------------
     Utilitaires
     --------------------------------------------------------------------- */
  function split(el, opts) {
    opts = opts || {};
    var tmp = document.createElement('div');
    var lines = el.innerHTML.split(/<br\s*\/?>/i).map(function (l) { tmp.innerHTML = l; return tmp.textContent.replace(/\s+/g, ' ').trim(); });
    el.textContent = '';
    var chars = [];
    if (!opts.noSr) {
      var sr = document.createElement('span');
      sr.className = 'sr'; sr.textContent = lines.join(' ');
      el.appendChild(sr);
    }
    lines.forEach(function (line) {
      var ln = document.createElement('span');
      ln.className = 'ln'; ln.setAttribute('aria-hidden', 'true');
      line.split(' ').forEach(function (word, wi, arr) {
        var w = document.createElement('span'); w.className = 'w';
        Array.from(word).forEach(function (ch) {
          var c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
          w.appendChild(c); chars.push(c);
        });
        ln.appendChild(w);
        if (wi < arr.length - 1) ln.appendChild(document.createTextNode(' '));
      });
      el.appendChild(ln);
    });
    return chars;
  }

  var heroChars = [];
  var splitTargets = [];

  /* ---------------------------------------------------------------------
     Smooth scroll (Lenis)
     --------------------------------------------------------------------- */
  function initLenis() {
    if (RM || typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, wheelMultiplier: .95
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------------------------------------------------------------------
     Titres : découpage lettre par lettre (masque qui monte)
     --------------------------------------------------------------------- */
  function initSplit() {
    $$('[data-hero-split]').forEach(function (el) { heroChars = heroChars.concat(split(el, { noSr: true })); });
    $$('[data-split]').forEach(function (el) { splitTargets.push({ el: el, chars: split(el) }); });
    var g = $('#footGiant'); if (g) splitTargets.push({ el: g, chars: split(g, { noSr: true }), foot: true });
  }

  /* ---------------------------------------------------------------------
     Hero : état initial caché + vidéo
     --------------------------------------------------------------------- */
  function heroInit() {
    if (RM) return;
    gsap.set(heroChars, { yPercent: 120, rotate: 6 });
    gsap.set('#heroEyebrow, #heroLead', { opacity: 0, y: 24 });
    gsap.set('#heroCta > *', { opacity: 0, y: 30 });
    gsap.set('#heroSeal', { opacity: 0, scale: .5, rotate: -50 });
    gsap.set('.hero__status', { opacity: 0, y: -12 });
    gsap.set('.hero__glyphs span', { opacity: 0, scale: 0 });
    gsap.set('#heroMedia', { scale: 1.22 });
    gsap.set('#nav', { yPercent: -130 });
  }

  function heroVideoStart() {
    var v = $('#heroVideo'); if (!v || v.getAttribute('src') || RM) return; // mouvement réduit : l'image de secours reste fixe
    var conn = navigator.connection || {};
    var small = window.innerWidth < 900 || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    v.src = small ? v.dataset.srcSm : v.dataset.srcHd;
    v.load();
    var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if (v.readyState >= 3) play(); else v.addEventListener('canplay', play, { once: true });
  }

  function introHero() {
    if (RM) { if (lenis) lenis.start(); return; }
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('#heroMedia', { scale: 1.08, duration: 2.6, ease: 'power3.out' }, 0)
      .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.5, stagger: .05 }, .05)
      .to('#heroEyebrow', { opacity: 1, y: 0, duration: 1 }, .35)
      .to('#heroLead', { opacity: 1, y: 0, duration: 1.2 }, .65)
      .to('#heroCta > *', { opacity: 1, y: 0, duration: 1.1, stagger: .12 }, .85)
      .to('#heroSeal', { opacity: 1, scale: 1, rotate: 0, duration: 1.8 }, .6)
      .to('.hero__status', { opacity: 1, y: 0, duration: 1 }, 1)
      .to('.hero__glyphs span', { opacity: function (i, el) { return i % 2 ? .35 : .55; }, scale: 1, duration: 1.4, stagger: .1 }, .8)
      .to('#nav', { yPercent: 0, duration: 1.2 }, .9);
  }

  /* ---------------------------------------------------------------------
     Loader « cicatrisation » + transition d'entrée (la couture qui s'ouvre)
     --------------------------------------------------------------------- */
  function runLoader() {
    var loader = $('#loader');
    if (!loader) { introHero(); return; }
    if (RM) { loader.parentNode.removeChild(loader); introHero(); return; }

    var pct = $('#loaderPct'), fill = $('#loaderFill'), needle = $('#loaderNeedle'), bar = $('.loader__bar');
    var st = { v: 0 };
    function paint() {
      pct.textContent = Math.round(st.v);
      gsap.set(fill, { scaleX: st.v / 100 });
      gsap.set(needle, { x: bar.offsetWidth * st.v / 100 });
    }
    gsap.set('.loader__seam', { opacity: 0 });
    gsap.from('.loader__logo', { opacity: 0, scale: .84, duration: 1.3, ease: 'expo.out' });
    gsap.from('.loader__label, .loader__bar, .loader__pct', { opacity: 0, y: 16, duration: 1, stagger: .12, delay: .2, ease: 'expo.out' });

    var minTime = new Promise(function (res) {
      gsap.to(st, { v: 86, duration: 2.1, ease: 'power2.out', onUpdate: paint, onComplete: res });
    });
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var loaded = new Promise(function (res) { if (document.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true }); });
    var video = new Promise(function (res) {
      var v = $('#heroVideo');
      if (!v) return res();
      if (v.readyState >= 3) return res();
      v.addEventListener('canplay', res, { once: true });
      setTimeout(res, 3500);
    });
    var safety = new Promise(function (res) { setTimeout(res, 6000); });
    // filet de sécurité : quoi qu'il arrive, le loader ne bloque jamais le site plus de 12 s
    setTimeout(function () {
      if (!document.getElementById('loader')) return;
      loader.parentNode.removeChild(loader); gsap.set('#nav', { yPercent: 0 });
      if (lenis) lenis.start(); initScrollAnimations(); introHero();
    }, 12000);

    Promise.all([minTime, Promise.race([Promise.all([fonts, loaded, video]), safety])]).then(function () {
      initScrollAnimations();
      gsap.to(st, { v: 100, duration: .55, ease: 'power1.inOut', onUpdate: paint, onComplete: exitLoader });
    });

    function exitLoader() {
      var tl = gsap.timeline({
        onComplete: function () {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
          if (lenis) lenis.start();
          ScrollTrigger.refresh();
        }
      });
      tl.to('.loader__inner', { opacity: 0, scale: 1.1, duration: .7, ease: 'power2.in' })
        .to('.loader__seam', { opacity: 1, duration: .3 }, '-=.35')
        .to('.loader__half--l', { xPercent: -102, duration: 1.5, ease: 'expo.inOut' }, '>-.05')
        .to('.loader__half--r', { xPercent: 102, duration: 1.5, ease: 'expo.inOut' }, '<')
        .to('.loader__seam', { opacity: 0, duration: .35 }, '<+.1')
        .add(introHero, '<+.45');
    }
  }

  /* ---------------------------------------------------------------------
     Animations liées au scroll
     --------------------------------------------------------------------- */
  var scrollInit = false;
  function initScrollAnimations() {
    if (scrollInit) return; scrollInit = true;
    initProgressAndNav();
    initSplitReveal();
    initReveals();
    initMarquee();
    initCounters();
    initFooter();
    initHeroVideoPause();

    var mm = gsap.matchMedia();
    mm.add({
      desktop: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      mobile: '(max-width: 899px) and (prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var desktop = ctx.conditions.desktop;
      initHeroParallax(desktop);
      initFrameParallax();
      if (desktop) { initStoryPin(); initServicesHorizontal(); }
      else { initMobileStory(); }
    });
    ScrollTrigger.refresh();
  }

  function initProgressAndNav() {
    var bar = $('#progressBar'), nav = $('#nav'), fab = $('#fab'), book = $('#reserver');
    var hidden = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        nav.classList.toggle('is-solid', y > 60);
        if (!document.body.classList.contains('menu-open') && !RM) {
          if (self.direction === 1 && y > 260 && !hidden) { hidden = true; gsap.to(nav, { yPercent: -120, duration: .6, ease: 'power3.out', overwrite: true }); }
          else if ((self.direction === -1 || y < 260) && hidden) { hidden = false; gsap.to(nav, { yPercent: 0, duration: .6, ease: 'power3.out', overwrite: true }); }
        }
        if (fab && book) {
          var r = book.getBoundingClientRect();
          var inBook = r.top < window.innerHeight * .6 && r.bottom > 0;
          fab.classList.toggle('is-hidden', y < 500 || inBook);
        }
      }
    });
  }

  function initSplitReveal() {
    splitTargets.forEach(function (t) {
      if (RM) return;
      if (t.foot) {
        gsap.set(t.chars, { yPercent: 110 });
        ScrollTrigger.create({ trigger: t.el, start: 'top 95%', once: true, onEnter: function () { gsap.to(t.chars, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: .045 }); } });
        return;
      }
      gsap.set(t.chars, { yPercent: 120, rotate: 5 });
      ScrollTrigger.create({
        trigger: t.el, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(t.chars, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: .022 }); }
      });
    });
  }

  function initReveals() {
    if (RM) return;
    // fondu + montée groupés (stagger)
    var sel = [
      '.sec-head .label', '.story__left > .label', '.artist__body > *', '.services__head > *:not(h2)', '.timeline li', '.faq__list details',
      '.find__card > *', '.find__map', '.book__intro > *:not(h2)', '.events__next', '.gallery__more', '.stats li', '.rev', '.filters', '.rev__ctrl'
    ].join(',');
    var els = $$(sel);
    gsap.set(els, { opacity: 0, y: 44 });
    ScrollTrigger.batch(els, {
      start: 'top 92%', once: true,
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: .1, overwrite: true }); }
    });

    // images révélées par rideau (masque) + zoom progressif
    $$('.rv').forEach(function (el) {
      var c = document.createElement('span'); c.className = 'rv__c'; c.setAttribute('aria-hidden', 'true'); el.appendChild(c);
      var img = $('img', el);
      gsap.set(img, { scale: 1.45 });
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: function () {
          gsap.to(c, { scaleY: 0, duration: 1.5, ease: 'expo.inOut' });
          gsap.to(img, { scale: 1.12, duration: 2.2, ease: 'expo.out' });
        }
      });
    });

    // billets d'événements : entrée en tournant
    $$('.ticket').forEach(function (t, i) {
      var tilt = t.classList.contains('ticket--a') ? -2.2 : 2.4;
      var desk = window.matchMedia('(min-width: 900px)').matches;
      gsap.set(t, { opacity: 0, y: 90, rotate: desk ? tilt * 3 : 0 });
      ScrollTrigger.create({
        trigger: t, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(t, { opacity: 1, y: 0, rotate: desk ? tilt : 0, duration: 1.5, ease: 'expo.out' }); }
      });
    });
    // galerie : apparition échelonnée
    var gal = $$('.gal__item');
    gsap.set(gal, { opacity: 0, y: 60, scale: .96 });
    ScrollTrigger.batch(gal, {
      start: 'top 94%', once: true,
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'expo.out', stagger: .08, overwrite: true }); }
    });

    // timeline : le fil de couture se tisse
    $$('.timeline li').forEach(function (li) {
      gsap.set(li, { '--w': 0 });
      gsap.to(li, { '--w': 1, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 85%', once: true } });
    });
  }

  function initMarquee() {
    var tweens = [];
    $$('.marquee__row').forEach(function (row) {
      var track = $('.marquee__track', row);
      var clone = track.cloneNode(true); clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
      var dir = parseFloat(row.dataset.dir) || -1;
      tweens.push(gsap.fromTo([track, clone], { xPercent: dir < 0 ? 0 : -100 }, { xPercent: dir < 0 ? -100 : 0, duration: 34, ease: 'none', repeat: -1 }));
    });
    if (RM) { tweens.forEach(function (t) { t.pause(); }); return; }
    var boost = 0, dirn = 1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) { boost = Math.min(Math.abs(self.getVelocity()) / 260, 9); dirn = self.direction || dirn; }
    });
    gsap.ticker.add(function () {
      boost *= .93;
      var ts = dirn * (1 + boost);
      tweens.forEach(function (t) { t.timeScale(ts); });
    });
    // le bandeau se redresse légèrement quand on le traverse
    gsap.fromTo('#marquee', { rotate: -1.8 }, { rotate: 1.2, ease: 'none', scrollTrigger: { trigger: '#marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function initCounters() {
    $$('[data-count]').forEach(function (b) {
      var target = parseFloat(b.dataset.count), dec = parseInt(b.dataset.dec || '0', 10);
      var fmt = function (v) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); };
      if (RM) { b.textContent = fmt(target); return; }
      var o = { v: 0 }; b.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: b, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: function () { b.textContent = fmt(o.v); } }); }
      });
    });
    var st = $('.stats__stitch');
    if (st && !RM) {
      gsap.fromTo(st, { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: 'expo.out', scrollTrigger: { trigger: st, start: 'top 92%', once: true } });
    }
  }

  function initFooter() {
    var g = $('#footGiant'); if (!g || RM) return;
    gsap.fromTo(g, { y: 0 }, { y: -30, ease: 'none', scrollTrigger: { trigger: '#footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  function initHeroVideoPause() {
    var v = $('#heroVideo'); if (!v) return;
    ScrollTrigger.create({
      trigger: '#hero', start: 'top top', end: 'bottom top',
      onLeave: function () { v.pause(); },
      onEnterBack: function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }

  function initHeroParallax(desktop) {
    var st = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('#heroMedia', { yPercent: desktop ? 16 : 10, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__title', { yPercent: desktop ? -22 : -10, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__lead, .hero__cta', { yPercent: desktop ? -12 : -6, ease: 'none', scrollTrigger: st });
    gsap.to('#heroSeal', { yPercent: desktop ? -80 : -30, ease: 'none', scrollTrigger: st });
    if (desktop) {
      $$('.hero__glyphs span').forEach(function (s) {
        gsap.to(s, { y: parseFloat(s.dataset.speed) * 3, ease: 'none', scrollTrigger: st });
      });
    }
  }

  // images qui bougent à l'intérieur de leur cadre
  function initFrameParallax() {
    $$('.artist__arch, .ticket__img').forEach(function (frame) {
      var img = $('img', frame);
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // « Le lieu » : section épinglée, storytelling étape par étape
  function initStoryPin() {
    var wrap = $('#storySticky'); if (!wrap) return;
    var chaps = $$('.chap'), imgs = $$('.story__img'), dots = $$('.story__dots i'), plate = $('#storyPlate');
    var plates = ['Pl. I — Étagère aux curiosités', 'Pl. II — Léa à l’ouvrage', 'Pl. III — Deux univers, un miroir', 'Pl. IV — Le cocon du 244'];
    var N = chaps.length, idx = 0;
    gsap.set(chaps, { autoAlpha: 0, y: 40 }); gsap.set(chaps[0], { autoAlpha: 1, y: 0 });
    gsap.set(imgs, { autoAlpha: 0, scale: 1.22 }); gsap.set(imgs[0], { autoAlpha: 1, scale: 1.06 });

    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    // zoom lent permanent sur l'image visible
    for (var i = 0; i < N; i++) {
      tl.to(imgs[i], { scale: 1, duration: 1 }, i);
    }
    for (var j = 1; j < N; j++) {
      tl.to(chaps[j - 1], { autoAlpha: 0, y: -40, duration: .3, ease: 'power2.in' }, j - .3)
        .to(chaps[j], { autoAlpha: 1, y: 0, duration: .4, ease: 'power2.out' }, j - .02)
        .to(imgs[j - 1], { autoAlpha: 0, duration: .45, ease: 'power1.inOut' }, j - .25)
        .fromTo(imgs[j], { autoAlpha: 0, scale: 1.22 }, { autoAlpha: 1, scale: 1.04, duration: .55, ease: 'power2.out' }, j - .25);
    }
    tl.to({}, { duration: .2 }, N - .2); // temps de lecture de la dernière étape
    ScrollTrigger.create({
      animation: tl, trigger: wrap, start: 'top top', end: '+=' + (N * 85) + '%', pin: true, scrub: .8, anticipatePin: 1,
      onUpdate: function (self) {
        var k = Math.min(N - 1, Math.floor(self.progress * N * 1.02 + .06));
        if (k !== idx) {
          idx = k;
          dots.forEach(function (d, n) { d.classList.toggle('is-on', n === k); });
          chaps.forEach(function (c, n) { c.classList.toggle('is-on', n === k); });
          gsap.fromTo(plate, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .6, ease: 'power2.out' });
          plate.textContent = plates[k];
        }
      }
    });
  }

  function initMobileStory() {
    $$('.chap').forEach(function (c) {
      var fig = $('.chap__fig img', c);
      if (!fig) return;
      gsap.fromTo(fig, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // Prestations : défilement horizontal piloté par le scroll vertical
  function initServicesHorizontal() {
    var pin = $('#servicesPin'), track = $('#servicesTrack'), vp = $('.services__viewport');
    if (!pin || !track || !vp) return;
    function dist() { return Math.max(0, track.scrollWidth - (vp.clientWidth - 24)); }
    var h = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .9, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    // chaque carte se redresse en entrant dans le champ (piloté par le défilement horizontal)
    $$('.card', track).forEach(function (card, i) {
      gsap.fromTo(card, { rotate: i % 2 ? 3 : -3, y: i % 2 ? 40 : -40 }, {
        rotate: 0, y: 0, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: h, start: 'left 98%', end: 'left 58%', scrub: true }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Micro-interactions : tilt 3D + reflet, boutons magnétiques, curseur
     --------------------------------------------------------------------- */
  function initTilt() {
    if (!FINE || RM) return;
    function tilt(el, max) {
      var rx = gsap.quickTo(el, 'rotationX', { duration: .7, ease: 'power3' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: .7, ease: 'power3' });
      gsap.set(el, { transformPerspective: 1000 });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - .5) * max * 2); rx(-(py - .5) * max * 2);
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () { rx(0); ry(0); });
    }
    $$('.card').forEach(function (el) { tilt(el, 9); });
    $$('.artist').forEach(function (el) { tilt(el, 2.2); });
    $$('.gal__item').forEach(function (el) { tilt(el, 4); });
  }

  function initMagnetic() {
    if (!FINE || RM) return;
    $$('.magnetic').forEach(function (b) {
      var xt = gsap.quickTo(b, 'x', { duration: .8, ease: 'elastic.out(1, .45)' });
      var yt = gsap.quickTo(b, 'y', { duration: .8, ease: 'elastic.out(1, .45)' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        xt((e.clientX - (r.left + r.width / 2)) * .32); yt((e.clientY - (r.top + r.height / 2)) * .42);
      });
      b.addEventListener('pointerleave', function () { xt(0); yt(0); });
    });
  }

  function initCursor() {
    var cur = $('#cursor'); if (!cur || !FINE || RM) return;
    var cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerover', function (e) { cur.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a, button, summary, label, .gal__item'))); });
    document.documentElement.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); });
  }

  /* ---------------------------------------------------------------------
     Navigation : ancres, menu mobile
     --------------------------------------------------------------------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var h = a.getAttribute('href');
      if (h === '#' || h.length < 2) { e.preventDefault(); return; }
      var tgt = h === '#top' ? 0 : $(h);
      if (tgt === null || tgt === undefined) return;
      e.preventDefault();
      var wasOpen = document.body.classList.contains('menu-open');
      closeMenu();
      setTimeout(function () { API.scrollTo(tgt === 0 ? 0 : tgt, tgt === 0 ? {} : { offset: -10 }); }, wasOpen ? 650 : 0);
      if (tgt !== 0 && tgt.id) { history.replaceState(null, '', h); }
    });
  }

  var menu, burger;
  function openMenu() {
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false'); document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu');
    if (lenis) lenis.stop();
    if (!RM) gsap.fromTo('.menu__links a', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: .06, delay: .35 });
    gsap.to('#nav', { yPercent: 0, duration: .3, overwrite: true });
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu');
    if (lenis) lenis.start();
  }
  function initMenu() {
    menu = $('#menu'); burger = $('#burger'); if (!menu || !burger) return;
    burger.addEventListener('click', function () { menu.classList.contains('is-open') ? closeMenu() : openMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) closeMenu(); });
  }

  /* ---------------------------------------------------------------------
     Galerie : filtres + lightbox accessible
     --------------------------------------------------------------------- */
  function initGallery() {
    var items = $$('.gal__item'), chips = $$('.filters .chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.dataset.filter;
        chips.forEach(function (c) { var on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        var show = items.filter(function (i) { return f === 'all' || i.dataset.cat === f; });
        var hide = items.filter(function (i) { return show.indexOf(i) < 0 && i.style.display !== 'none'; });
        var swap = function () {
          hide.forEach(function (h) { h.style.display = 'none'; });
          show.forEach(function (s) { s.style.display = ''; });
          if (RM) { ScrollTrigger.refresh(); return; }
          gsap.fromTo(show, { opacity: 0, y: 50, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: .9, stagger: .05, ease: 'expo.out', overwrite: true, onComplete: function () { ScrollTrigger.refresh(); } });
        };
        if (RM || !hide.length) swap(); else gsap.to(hide, { opacity: 0, scale: .9, duration: .35, ease: 'power2.in', onComplete: swap });
      });
    });

    var lb = $('#lb'), img = $('#lbImg'), cap = $('#lbCap'), closeBtn = $('#lbClose'), prev = $('#lbPrev'), next = $('#lbNext');
    var cur = 0, opener = null;
    function list() { return items.filter(function (i) { return i.style.display !== 'none'; }); }
    function show(i) {
      var l = list(); if (!l.length) return;
      cur = (i + l.length) % l.length;
      var it = l[cur], im = $('img', it);
      img.src = im.currentSrc || im.src; img.alt = im.alt; cap.textContent = it.dataset.cap || '';
      if (!RM) gsap.fromTo(img, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .6, ease: 'expo.out' });
    }
    function open(i) {
      opener = document.activeElement;
      lb.hidden = false; show(i);
      requestAnimationFrame(function () { lb.classList.add('is-on'); });
      closeBtn.focus(); API.stopScroll();
    }
    function close() {
      lb.classList.remove('is-on');
      setTimeout(function () { lb.hidden = true; }, 300);
      API.startScroll(); if (opener && opener.focus) opener.focus();
    }
    items.forEach(function (it) { it.addEventListener('click', function () { open(list().indexOf(it)); }); });
    closeBtn.addEventListener('click', close);
    prev.addEventListener('click', function () { show(cur - 1); });
    next.addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'Tab') {
        var f = [closeBtn, prev, next], k = f.indexOf(document.activeElement);
        e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------------------------------------------------------------------
     Avis : carrousel (scroll-snap) + glisser à la souris
     --------------------------------------------------------------------- */
  function initReviews() {
    var track = $('#revTrack'); if (!track) return;
    var step = function () { var c = $('.rev', track); return c ? c.getBoundingClientRect().width + 24 : 400; };
    $('#revPrev').addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: RM ? 'auto' : 'smooth' }); });
    $('#revNext').addEventListener('click', function () { track.scrollBy({ left: step(), behavior: RM ? 'auto' : 'smooth' }); });
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; track.style.scrollSnapType = 'none'; track.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; track.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; track.style.scrollSnapType = ''; track.style.cursor = ''; });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  /* ---------------------------------------------------------------------
     FAQ : un seul volet ouvert à la fois
     --------------------------------------------------------------------- */
  function initFaq() {
    var ds = $$('#faqList details');
    ds.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) ds.forEach(function (o) { if (o !== d) o.open = false; }); }); });
  }

  /* ---------------------------------------------------------------------
     Horaires : « ouvert maintenant ? » + ligne du jour
     --------------------------------------------------------------------- */
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function parisNow() {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: CFG.timezone || 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false });
    var o = {}; f.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[o.weekday], h: (parseInt(o.hour, 10) % 24) + parseInt(o.minute, 10) / 60 };
  }
  function hh(n) { return (n === Math.floor(n)) ? n + 'h' : Math.floor(n) + 'h' + String(Math.round((n % 1) * 60)).padStart(2, '0'); }
  function updateStatus() {
    var hours = CFG.hours; if (!hours) return;
    var n = parisNow(), today = hours[n.day], txt, open = false;
    if (today && n.h >= today[0] && n.h < today[1]) { open = true; txt = 'Ouvert · ferme à ' + hh(today[1]); }
    else {
      var d = n.day, k = 0, nextTxt = '';
      if (today && n.h < today[0]) nextTxt = 'aujourd’hui à ' + hh(today[0]);
      else {
        for (k = 1; k <= 7; k++) { var dd = (n.day + k) % 7; if (hours[dd]) { nextTxt = (k === 1 ? 'demain' : DAYS[dd]) + ' à ' + hh(hours[dd][0]); break; } }
      }
      txt = 'Fermé · ouvre ' + nextTxt;
    }
    var st = $('#openStatus');
    if (st) { $('span', st).textContent = txt; $('.dot', st).classList.toggle('is-off', !open); }
    $$('#hours tr').forEach(function (tr) { tr.classList.toggle('is-today', parseInt(tr.dataset.d, 10) === n.day); });
  }

  /* ---------------------------------------------------------------------
     Carte Google Maps : chargée seulement quand la section est vraiment visible
     (ou au clic) pour ne pas alourdir la page ni contacter Google trop tôt
     --------------------------------------------------------------------- */
  function initMap() {
    var box = $('#mapBox'); if (!box) return;
    var loaded = false;
    function load() {
      if (loaded) return; loaded = true;
      var f = document.createElement('iframe');
      f.title = box.dataset.title; f.src = box.dataset.src; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
      f.addEventListener('load', function () { box.classList.add('is-loaded'); });
      box.insertBefore(f, box.firstChild);
    }
    $('#mapLoad').addEventListener('click', load);
    var conn = navigator.connection || {};
    if ('IntersectionObserver' in window && !conn.saveData) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(load, 400); } }, { threshold: .35 });
      io.observe(box);
    }
  }

  // les images des cartes de prestations sont chargées avant d'arriver à l'écran (pas d'effet « pop-in »)
  function initCardImages() {
    var sec = $('#prestations'); if (!sec || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io.disconnect();
      $$('.card img', sec).forEach(function (i) { i.loading = 'eager'; });
    }, { rootMargin: '120% 0px' });
    io.observe(sec);
  }

  /* ---------------------------------------------------------------------
     Contacts configurables (téléphone / e-mail)
     --------------------------------------------------------------------- */
  function initContacts() {
    var phone = (CFG.phone || '').replace(/\s+/g, ''), mail = CFG.email || '';
    if (phone) {
      var pb = $('#phoneBtn'); if (pb) { pb.hidden = false; pb.href = 'tel:' + phone; }
      var fab = $('#fab'); if (fab) { fab.href = 'tel:' + phone; $('#fabLabel').textContent = 'Appeler'; }
      var cp = $('#contactPhone'); if (cp) { cp.hidden = false; cp.innerHTML = '<a class="link-u" href="tel:' + phone + '">' + (CFG.phone) + '</a><br>'; }
    }
    if (mail) {
      var cm = $('#contactMail'); if (cm) { cm.hidden = false; cm.innerHTML = '<a class="link-u" href="mailto:' + mail + '">' + mail + '</a>'; }
    }
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------------------
     Démarrage
     --------------------------------------------------------------------- */
  function boot() {
    initLenis();
    initSplit();
    heroInit();
    initContacts();
    initAnchors();
    initMenu();
    initTilt();
    initMagnetic();
    initCursor();
    initGallery();
    initReviews();
    initFaq();
    initMap();
    initCardImages();
    updateStatus(); setInterval(updateStatus, 60000);
    heroVideoStart();
    if (RM) { initScrollAnimations(); }
    runLoader();
    window.addEventListener('load', function () { setTimeout(function () { ScrollTrigger.refresh(); }, 400); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
