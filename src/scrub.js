/* A film the scroll plays (Jesse, 26 Oct 2026: "a 3D scroll from plan to build, with motion, a scroll trigger").
   A canvas in a pinned .seq backdrop draws one frame of an image sequence for where the window is: scroll on and it
   plays, scroll back and it plays backwards. data-frames is the path with {n} for the three-digit frame number,
   data-count how many frames, data-knots the frame each stage rests on (one per .stage in the .seq), so the words
   and the picture always agree. Frames load as the film comes near, in passes (every 8th, then 4th, 2nd, all) and the nearest loaded frame
   is drawn meanwhile, so it plays from the first second and sharpens as it loads. Without the canvas (print, a
   phone, no script) the stills in the slides stand in. */
[].forEach.call(document.querySelectorAll('.seq canvas[data-frames]'), function (cv) {
  var seq = cv.closest('.seq'), st = [].slice.call(seq.querySelectorAll('.stage'));
  var n = +cv.getAttribute('data-count'), knots = cv.getAttribute('data-knots').split(',').map(Number);
  if (!cv.getClientRects().length) return;   // the backdrop is off (a phone, print): the stills stand in, nothing loads
  if (!n || knots.length !== st.length) return;   // a mismatch would put the words over the wrong picture: show the stills
  var pad = function (i) { return ('00' + i).slice(-3); }, src = cv.getAttribute('data-frames');
  var imgs = new Array(n), ctx = cv.getContext('2d'), shown = -1, want = 0, bar = document.getElementById('bar');
  function fit() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); shown = -1; draw();
  }
  function nearest(i) {
    for (var k = 0; k < n; k++) {
      if (i - k >= 0 && imgs[i - k] && imgs[i - k].ok) return i - k;
      if (i + k < n && imgs[i + k] && imgs[i + k].ok) return i + k;
    }
    return -1;
  }
  function draw() {
    var i = nearest(want); if (i < 0 || i === shown) return;
    var im = imgs[i], s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight);
    var w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h); shown = i;
  }
  function tick() {
    var top = seq.getBoundingClientRect().top - (bar ? bar.offsetHeight : 0);
    var p = Math.max(0, Math.min(st.length - 1, -top / (st[0].offsetHeight || 1))), k = Math.min(Math.floor(p), knots.length - 2);
    want = Math.round(knots[k] + (knots[k + 1] - knots[k]) * (p - k)); draw();
  }
  function load(i) {
    if (imgs[i]) return;
    var im = new Image(); im.decoding = 'async';
    im.onload = function () { im.ok = true; if (Math.abs(i - want) <= Math.abs(shown - want) || shown < 0) { shown = -1; draw(); } };
    im.src = src.replace('{n}', pad(i)); imgs[i] = im;
  }
  function start() { [8, 4, 2, 1].forEach(function (step) { for (var i = 0; i < n; i += step) load(i); }); }
  // nothing loads until the film is about a screen away, so the slides before it never wait on it
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '100% 0px' });
    io.observe(seq);
  } else start();
  cv.classList.add('live');
  window.addEventListener('resize', fit); window.addEventListener('scroll', function () { tick(); }, { passive: true });
  fit(); tick();
});
