// Homepage "What we've worked on" carousel (progressive enhancement).
// Without JavaScript the tiles stay in the plain grid. No network access.
(function () {
  'use strict';

  var grid = document.querySelector('.work-grid');
  if (!grid) return;
  var slides = Array.prototype.slice.call(grid.children).filter(function (el) {
    return el.classList.contains('work-tile');
  });
  var n = slides.length;
  if (n < 2) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOLD = 4000;      // each card holds still this long
  var SLIDE = 800;      // slide duration (matches the CSS transition)
  var DOUBLE = 250;     // wait this long to rule out a double click/tap
  var current = 0;
  var timer = null;
  var paused = false;   // explicit visitor pause (click/tap/Space)
  var holds = { touch: false, zoom: false };

  var icon = {
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>'
  };

  // --- Build the carousel around the existing tiles -------------------------
  var region = document.createElement('div');
  region.className = 'work-carousel';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-roledescription', 'carousel');
  region.setAttribute('aria-label', 'Examples of our work. Use Left and Right to move, Space to pause or play, Enter to enlarge.');
  region.tabIndex = 0;

  var viewport = document.createElement('div');
  viewport.className = 'work-viewport';
  grid.parentNode.insertBefore(region, grid);
  viewport.appendChild(grid);
  region.appendChild(viewport);

  grid.classList.remove('grid', 'grid--3');
  grid.classList.add('work-track');

  function titleOf(slide) {
    var h = slide.querySelector('h3');
    return h ? h.textContent.trim() : '';
  }

  slides.forEach(function (slide, i) {
    slide.classList.remove('reveal'); // the carousel handles its own motion
    slide.classList.add('work-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (i + 1) + ' of ' + n + ': ' + titleOf(slide));
  });

  var live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  region.appendChild(live);

  var flash = document.createElement('div');
  flash.className = 'work-flash';
  flash.setAttribute('aria-hidden', 'true');
  var badge = document.createElement('div');
  badge.className = 'work-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = icon.pause + '<span>Paused</span>';

  region.classList.add('is-ready');

  // --- Layout ---------------------------------------------------------------
  function offsetOf(i) {
    var half = Math.floor(n / 2);
    return ((i - current + n + half) % n) - half;
  }

  var lastOffsets = slides.map(function () { return null; });

  function render() {
    slides.forEach(function (slide, i) {
      var o = offsetOf(i);
      var prev = lastOffsets[i];
      // A slide that wraps around jumps while hidden, without animating across.
      slide.classList.toggle('is-jump', prev !== null && Math.abs(prev - o) > 1);
      slide.style.setProperty('--work-offset', o);
      slide.classList.toggle('is-center', o === 0);
      slide.classList.toggle('is-side', Math.abs(o) === 1);
      slide.classList.toggle('is-hidden', Math.abs(o) > 1);
      // Side cards stay clickable (they navigate) but are hidden from assistive tech;
      // cards further out are inert.
      slide.inert = Math.abs(o) > 1;
      if (o !== 0) slide.setAttribute('aria-hidden', 'true');
      else slide.removeAttribute('aria-hidden');
      lastOffsets[i] = o;
    });
    var c = slides[current];
    c.appendChild(flash);
    c.appendChild(badge);
    badge.hidden = !paused;
    syncVideos();
  }

  function syncVideos() {
    slides.forEach(function (slide, i) {
      var v = slide.querySelector('video');
      if (!v) return;
      if (i === current && !reduceMotion && !holds.zoom) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
        if (i !== current && v.currentTime) v.currentTime = 0;
      }
    });
  }

  function announce(text) { live.textContent = text; }

  function go(step, manual) {
    current = (current + step + n) % n;
    render();
    if (manual) announce('Example ' + (current + 1) + ' of ' + n + ': ' + titleOf(slides[current]));
    schedule(SLIDE + HOLD);
  }

  // --- Autoplay -------------------------------------------------------------
  function shouldRun() {
    return !reduceMotion && !paused && !holds.touch && !holds.zoom;
  }
  function schedule(delay) {
    clearTimeout(timer);
    timer = null;
    if (!shouldRun()) return;
    timer = setTimeout(function tick() {
      if (document.hidden) { timer = setTimeout(tick, 1000); return; }
      go(1, false);
    }, delay);
  }
  function setHold(key, on) {
    if (holds[key] === on) return;
    holds[key] = on;
    schedule(HOLD);
  }

  function showFlash(kind) {
    flash.innerHTML = '<span>' + icon[kind] + '</span>';
    flash.classList.remove('is-on');
    void flash.offsetWidth; // restart the animation
    flash.classList.add('is-on');
  }

  function togglePause() {
    if (reduceMotion) return; // no autoplay to pause or resume
    paused = !paused;
    badge.hidden = !paused;
    showFlash(paused ? 'pause' : 'play');
    announce(paused ? 'Carousel paused' : 'Carousel playing');
    schedule(HOLD);
  }

  // --- Zoom view ------------------------------------------------------------
  var zoom = document.createElement('div');
  zoom.className = 'work-zoom';
  zoom.setAttribute('role', 'dialog');
  zoom.setAttribute('aria-modal', 'true');
  zoom.tabIndex = -1;
  zoom.hidden = true;
  var zoomFrame = document.createElement('div');
  zoomFrame.className = 'work-zoom-frame';
  zoom.appendChild(zoomFrame);
  document.body.appendChild(zoom);

  var zoomOpen = false;
  var zoomTouch = null;
  var savedOverflow = { html: '', body: '' };

  function openZoom() {
    if (zoomOpen) return;
    var slide = slides[current];
    var src = slide.querySelector('.work-media img, .work-media video');
    if (!src) return;
    var media = src.cloneNode(true);
    media.removeAttribute('loading');
    media.removeAttribute('width');
    media.removeAttribute('height');
    media.classList.add('work-zoom-media');
    zoomFrame.innerHTML = '';
    zoomFrame.appendChild(media);
    zoom.setAttribute('aria-label', 'Enlarged view: ' + titleOf(slide) + '. Press Escape to close.');
    zoomOpen = true;
    holds.zoom = true;
    schedule(HOLD);
    savedOverflow.html = document.documentElement.style.overflow;
    savedOverflow.body = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    zoom.hidden = false;
    if (media.tagName === 'VIDEO') {
      media.muted = true;
      if (!reduceMotion) {
        try { media.currentTime = src.currentTime || 0; } catch (err) { /* not seekable yet */ }
        var p = media.play();
        if (p && p.catch) p.catch(function () {});
      }
    }
    syncVideos(); // pauses the card's own video while the enlarged copy plays
    zoom.focus();
  }

  function closeZoom() {
    if (!zoomOpen) return;
    zoomOpen = false;
    var v = zoomFrame.querySelector('video');
    if (v) v.pause();
    zoomFrame.innerHTML = '';
    zoom.hidden = true;
    document.documentElement.style.overflow = savedOverflow.html;
    document.body.style.overflow = savedOverflow.body;
    holds.zoom = false;
    syncVideos();
    schedule(HOLD); // resumes only if the carousel was playing before
    region.focus();
  }

  zoom.addEventListener('click', function (e) {
    if (!e.target.closest('.work-zoom-media')) closeZoom();
  });
  zoom.addEventListener('wheel', function (e) { e.preventDefault(); closeZoom(); }, { passive: false });
  zoom.addEventListener('touchstart', function (e) {
    zoomTouch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  zoom.addEventListener('touchend', function (e) {
    if (!zoomTouch || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - zoomTouch.x;
    var dy = e.changedTouches[0].clientY - zoomTouch.y;
    zoomTouch = null;
    if (Math.abs(dx) >= 40 || Math.abs(dy) >= 40) closeZoom();
  }, { passive: true });
  zoom.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeZoom(); }
    else if (e.key === 'Tab') { e.preventDefault(); zoom.focus(); } // keep focus inside the dialog
  });

  // --- Clicks and taps ------------------------------------------------------
  var singleTimer = null;
  var lastCenterClick = 0;

  // Stop a double click from selecting card text.
  grid.addEventListener('mousedown', function (e) { if (e.detail > 1) e.preventDefault(); });

  grid.addEventListener('click', function (e) {
    if (suppressClick) { suppressClick = false; return; }
    var slide = e.target.closest('.work-slide');
    if (!slide) return;
    if (slide.classList.contains('is-side')) {
      clearTimeout(singleTimer);
      lastCenterClick = 0;
      go(offsetOf(slides.indexOf(slide)), true);
      return;
    }
    if (!slide.classList.contains('is-center')) return;
    var now = Date.now();
    if (now - lastCenterClick <= DOUBLE) {
      // Second click/tap within the window: double, open zoom, no toggle.
      clearTimeout(singleTimer);
      lastCenterClick = 0;
      openZoom();
      return;
    }
    lastCenterClick = now;
    clearTimeout(singleTimer);
    singleTimer = setTimeout(function () {
      lastCenterClick = 0;
      togglePause();
    }, DOUBLE);
  });

  // --- Keyboard -------------------------------------------------------------
  region.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || zoomOpen) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1, true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1, true); }
    else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); togglePause(); }
    else if (e.key === 'Enter') { e.preventDefault(); openZoom(); }
  });

  // --- Wheel and trackpad ---------------------------------------------------
  // Shift + vertical wheel, or a horizontal trackpad swipe, moves one card per
  // gesture. Plain vertical wheel scrolling passes through to the page.
  var wheelLocked = false;
  var wheelQuiet = null;
  viewport.addEventListener('wheel', function (e) {
    var horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!e.shiftKey && !horizontal) return;
    var delta = horizontal ? e.deltaX : (e.deltaY || e.deltaX);
    if (!delta) return;
    e.preventDefault();
    clearTimeout(wheelQuiet);
    wheelQuiet = setTimeout(function () { wheelLocked = false; }, 250);
    if (wheelLocked || Math.abs(delta) < 4) return;
    wheelLocked = true;
    go(delta > 0 ? 1 : -1, true);
  }, { passive: false });

  // --- Touch ----------------------------------------------------------------
  // Holding a finger on the carousel pauses autoplay; a horizontal swipe of
  // about 40 px moves one card; vertical swipes scroll the page.
  var touchStart = null;
  var touchResume = null;
  var suppressClick = false; // a long press is a hold, not a tap
  viewport.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    clearTimeout(touchResume);
    setHold('touch', true);
  }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    if (touchStart && e.changedTouches.length) {
      var dx = e.changedTouches[0].clientX - touchStart.x;
      var dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1, true);
      if (Date.now() - touchStart.t > 500) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 600);
      }
    }
    touchStart = null;
    clearTimeout(touchResume);
    touchResume = setTimeout(function () { setHold('touch', false); }, 1000);
  }, { passive: true });
  viewport.addEventListener('touchcancel', function () {
    touchStart = null;
    setHold('touch', false);
  }, { passive: true });

  render();
  schedule(HOLD);
})();
