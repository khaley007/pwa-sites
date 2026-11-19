// Services page: enlarge work screenshots and recordings (progressive enhancement).
// Reuses the homepage zoom view styles (.work-zoom) and behaviour from work-carousel.js:
// Escape, outside click, wheel or swipe closes; focus returns to the opener. No network access.
(function () {
  'use strict';

  var triggers = Array.prototype.slice.call(document.querySelectorAll('.svc-zoom-trigger'));
  if (!triggers.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Card video: muted loop, autoplay only without reduced motion (same rule as the homepage).
  var videos = Array.prototype.slice.call(document.querySelectorAll('.svc-work-video'));
  function playCardVideos() {
    if (reduceMotion) return;
    videos.forEach(function (v) {
      v.autoplay = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }
  playCardVideos();

  var zoom = document.createElement('div');
  zoom.className = 'work-zoom';
  zoom.setAttribute('role', 'dialog');
  zoom.setAttribute('aria-modal', 'true');
  zoom.tabIndex = -1;
  zoom.hidden = true;
  var frame = document.createElement('div');
  frame.className = 'work-zoom-frame';
  zoom.appendChild(frame);
  document.body.appendChild(zoom);

  var opener = null;
  var touch = null;
  var saved = { html: '', body: '' };

  function titleOf(trigger) {
    var card = trigger.closest('.svc-work-card');
    var h = card ? card.querySelector('h3') : document.getElementById('svc-featured-title');
    return h ? h.textContent.trim() : '';
  }

  function open(trigger) {
    if (opener) return;
    var src = trigger.querySelector('img, video');
    if (!src) return;
    var media = src.cloneNode(true);
    media.removeAttribute('loading');
    media.removeAttribute('width');
    media.removeAttribute('height');
    media.className = 'work-zoom-media';
    frame.innerHTML = '';
    frame.appendChild(media);
    zoom.setAttribute('aria-label', 'Enlarged view: ' + titleOf(trigger) + '. Press Escape to close.');
    opener = trigger;
    saved.html = document.documentElement.style.overflow;
    saved.body = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    zoom.hidden = false;
    if (media.tagName === 'VIDEO') {
      media.muted = true;
      media.autoplay = false;
      src.pause(); // the enlarged copy plays instead
      if (!reduceMotion) {
        try { media.currentTime = src.currentTime || 0; } catch (err) { /* not seekable yet */ }
        var p = media.play();
        if (p && p.catch) p.catch(function () {});
      }
    }
    zoom.focus();
  }

  function close() {
    if (!opener) return;
    var v = frame.querySelector('video');
    if (v) v.pause();
    frame.innerHTML = '';
    zoom.hidden = true;
    document.documentElement.style.overflow = saved.html;
    document.body.style.overflow = saved.body;
    var back = opener;
    opener = null;
    playCardVideos();
    back.focus();
  }

  triggers.forEach(function (t) {
    t.addEventListener('click', function () { open(t); });
  });

  zoom.addEventListener('click', function (e) {
    if (!e.target.closest('.work-zoom-media')) close();
  });
  zoom.addEventListener('wheel', function (e) { e.preventDefault(); close(); }, { passive: false });
  zoom.addEventListener('touchstart', function (e) {
    touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  zoom.addEventListener('touchend', function (e) {
    if (!touch || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touch.x;
    var dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) >= 40 || Math.abs(dy) >= 40) close();
  }, { passive: true });
  zoom.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); zoom.focus(); } // keep focus inside the dialog
  });
})();
