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
  var INTERVAL = 5000;
  var current = 0;
  var timer = null;
  var userPaused = reduceMotion; // reduced motion: manual navigation only
  var holds = { hover: false, focus: false, touch: false };

  // --- Build the carousel around the existing tiles -------------------------
  var region = document.createElement('div');
  region.className = 'work-carousel';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-roledescription', 'carousel');
  region.setAttribute('aria-label', 'Examples of our work');
  region.tabIndex = 0;

  var viewport = document.createElement('div');
  viewport.className = 'work-viewport';

  grid.parentNode.insertBefore(region, grid);
  viewport.appendChild(grid);
  region.appendChild(viewport);

  grid.id = grid.id || 'work-track';
  grid.classList.remove('grid', 'grid--3');
  grid.classList.add('work-track');

  slides.forEach(function (slide, i) {
    slide.classList.remove('reveal'); // the carousel handles its own motion
    slide.classList.add('work-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    var title = slide.querySelector('h3');
    slide.setAttribute('aria-label', (i + 1) + ' of ' + n + (title ? ': ' + title.textContent.trim() : ''));
  });

  var icon = {
    prev: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>'
  };

  function makeButton(cls, label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--ghost btn--sm work-ctrl ' + cls;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-controls', grid.id);
    b.innerHTML = html;
    return b;
  }

  var controls = document.createElement('div');
  controls.className = 'work-controls';
  var prevBtn = makeButton('work-prev', 'Previous example', icon.prev);
  var pauseBtn = makeButton('work-pause', 'Pause carousel', icon.pause);
  var nextBtn = makeButton('work-next', 'Next example', icon.next);
  if (reduceMotion) pauseBtn.hidden = true;
  controls.appendChild(prevBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(nextBtn);
  region.appendChild(controls);

  var live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  region.appendChild(live);

  region.classList.add('is-ready');

  // --- Layout ---------------------------------------------------------------
  // Offset of slide i from the current slide, in the range [-floor(n/2), ceil(n/2) - 1].
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
      var off = o !== 0;
      slide.inert = off;
      if (off) slide.setAttribute('aria-hidden', 'true');
      else slide.removeAttribute('aria-hidden');
      lastOffsets[i] = o;
    });
    syncVideos();
  }

  function syncVideos() {
    slides.forEach(function (slide, i) {
      var v = slide.querySelector('video');
      if (!v) return;
      if (i === current && !reduceMotion) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
        if (v.currentTime) v.currentTime = 0;
      }
    });
  }

  function go(step, manual) {
    current = (current + step + n) % n;
    render();
    if (manual) {
      var title = slides[current].querySelector('h3');
      live.textContent = 'Example ' + (current + 1) + ' of ' + n + (title ? ': ' + title.textContent.trim() : '');
      restart();
    }
  }

  // --- Autoplay -------------------------------------------------------------
  function shouldRun() {
    return !userPaused && !holds.hover && !holds.focus && !holds.touch;
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function restart() {
    stop();
    if (shouldRun()) {
      timer = setInterval(function () {
        if (!document.hidden) go(1, false);
      }, INTERVAL);
    }
  }
  function setHold(key, on) {
    holds[key] = on;
    restart();
  }
  function setUserPaused(paused) {
    userPaused = paused;
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.innerHTML = paused ? icon.play : icon.pause;
    restart();
  }
  pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');

  // --- Inputs ---------------------------------------------------------------
  prevBtn.addEventListener('click', function () { go(-1, true); });
  nextBtn.addEventListener('click', function () { go(1, true); });
  pauseBtn.addEventListener('click', function () { setUserPaused(!userPaused); });

  region.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1, true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1, true); }
  });

  // Hover pause for real mouse pointers only (taps fire compatibility mouse
  // events with no matching leave, which would pause autoplay indefinitely).
  region.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setHold('hover', true); });
  region.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setHold('hover', false); });
  // Pause for keyboard focus only; a mouse click or tap that focuses the
  // container should not stop autoplay until the visitor clicks elsewhere.
  region.addEventListener('focusin', function (e) {
    var t = e.target;
    var keyboard = true;
    try { keyboard = t.matches(':focus-visible'); } catch (err) { keyboard = true; }
    if (keyboard) setHold('focus', true);
  });
  region.addEventListener('focusout', function (e) {
    if (!region.contains(e.relatedTarget)) setHold('focus', false);
  });

  // Horizontal wheel / trackpad: one card per gesture. Vertical scroll passes through.
  var wheelLocked = false;
  var wheelQuiet = null;
  viewport.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    clearTimeout(wheelQuiet);
    wheelQuiet = setTimeout(function () { wheelLocked = false; }, 250);
    if (wheelLocked || Math.abs(e.deltaX) < 4) return;
    wheelLocked = true;
    go(e.deltaX > 0 ? 1 : -1, true);
  }, { passive: false });

  // Touch: horizontal swipe of about 40 px moves one card; vertical swipes scroll.
  var touchStart = null;
  var touchResume = null;
  viewport.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    clearTimeout(touchResume);
    setHold('touch', true);
  }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    if (touchStart && e.changedTouches.length) {
      var dx = e.changedTouches[0].clientX - touchStart.x;
      var dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1, true);
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
  restart();
})();
