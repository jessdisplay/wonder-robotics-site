/* The WONDER ROBOTICS mark, drawn. Ported verbatim from the airtree footer
   (rise-stories/app/public/site/mark.js) with the sector device from the
   brand site (wonder-brand app/src/routes/index.tsx, deviceRobot): the
   WonderBot face cut into the moon. RULE (Jesse, 12 Aug 2026): sector assets
   carry the sector's own mark, never the parent moon.

   Usage: <canvas data-wonder-mark data-ink="#131316" data-sub="ROBOTICS"
                  data-w="150"></canvas> */
(function () {
  "use strict";
  var CRESCENT = { cut: 0.5, rx: 0.7, ry: 0.76, rise: -0.06 };
  function setTrack(g, px) { try { g.letterSpacing = px + "px"; } catch (e) {} }
  function crescentRound(g, cx, cy, R, ink) {
    var C = CRESCENT;
    g.fillStyle = ink; g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2, false);
    g.moveTo(cx + R * C.cut + R * C.rx, cy + R * C.rise);
    g.arc(cx + R * C.cut, cy + R * C.rise, R * C.rx, 0, Math.PI * 2, true);
    g.fill("evenodd"); g.restore();
  }
  function deviceRobot(g, cx, cy, R, ink) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    var w = R * 1.3, h = R * 1.42, x0 = cx + R * 0.44 - w / 2, y0 = cy + R * 0.04 - h / 2;
    g.beginPath(); g.roundRect(x0, y0, w, h, R * 0.3); g.fill();
    g.restore();
    g.fillStyle = ink;
    var s = R * 0.19, ey = cy - R * 0.1;
    [0.2, 0.7].forEach(function (dx) {
      g.beginPath(); g.roundRect(cx + R * dx - s / 2, ey - s / 2, s, s, s * 0.26); g.fill();
    });
  }
  function sectorORobot(g, cx, cy, RX, RY, ink) {
    var R0 = 100;
    g.save(); g.translate(cx, cy); g.scale(RX / R0, RY / R0);
    crescentRound(g, 0, 0, R0, ink);
    deviceRobot(g, 0, 0, R0, ink);
    g.restore();
  }
  function measure(g, wt, px, track) {
    g.font = wt + " " + px + "px 'UnboundedW'";
    setTrack(g, track);
    var om = g.measureText("o");
    var xh = om.actualBoundingBoxAscent + om.actualBoundingBoxDescent;
    var ow = ((om.actualBoundingBoxLeft || 0) + (om.actualBoundingBoxRight || 0)) || om.width;
    return { wA: g.measureText("w").width, wB: g.measureText("nder").width, xh: xh, asc: om.actualBoundingBoxAscent, ow: ow };
  }
  function drawLockup(canvas, W, H, px, ink, sub) {
    var dpr = Math.min(3, window.devicePixelRatio || 2);
    if (!(W >= 2 && H >= 2)) return;   // an occluded pane reports a 0px viewport; never draw into nothing
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    var g = canvas.getContext("2d"); if (!g) return;
    g.scale(dpr, dpr);
    var wt = 700, track = 0;
    var m = measure(g, wt, px, track);
    var bear = px * 0.04 + track;
    var w = m.wA + m.wB + m.ow + bear * 2;
    var x = (W - w) / 2;
    var baseline = sub ? H * 0.58 : H * 0.68;
    g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = ink;
    g.fillText("w", x, baseline);
    var cur = x + m.wA + bear;
    var ocx = cur + m.ow / 2, ocy = baseline - m.asc + m.xh / 2;
    // the sector o: the face is punched out with destination-out, so draw it on
    // its own layer or it would punch the letters too
    var layer = document.createElement("canvas");
    layer.width = canvas.width; layer.height = canvas.height;
    var lg = layer.getContext("2d"); lg.scale(dpr, dpr);
    sectorORobot(lg, ocx, ocy, m.ow / 2, m.xh / 2, ink);
    g.drawImage(layer, 0, 0, W, H);
    cur += m.ow + bear;
    g.fillStyle = ink;
    g.fillText("nder", cur, baseline);
    if (sub) {
      var sp = px * 0.155, st = sp * 0.62;
      g.font = "400 " + sp + "px 'UnboundedW'";
      setTrack(g, st);
      g.textAlign = "center"; g.fillStyle = ink; g.globalAlpha = 0.85;
      g.fillText(sub, W / 2 - st / 2, baseline + px * 0.36);
      g.globalAlpha = 1;
    }
  }
  function paintAll() {
    document.querySelectorAll("canvas[data-wonder-mark]").forEach(function (cv) {
      var W = +cv.dataset.w || 680;
      if (cv.dataset.fit === "vw") W = Math.min(W, Math.round(Math.min(Math.max(window.innerWidth, 320), 1400) * (+cv.dataset.vw || 0.86)));
      var px = Math.round(W * (+cv.dataset.pxr || 0.118));
      var H = Math.round(W * (+cv.dataset.hr || (cv.dataset.sub ? 0.30 : 0.26)));
      drawLockup(cv, W, H, px, cv.dataset.ink || "#F4F1EA", cv.dataset.sub || "");
    });
  }
  var ready = function () { paintAll(); };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load("700 84px UnboundedW"),
      document.fonts.load("400 20px UnboundedW")
    ]).then(ready, ready);
    setTimeout(ready, 1200);
  } else { setTimeout(ready, 400); }
  var rsz; window.addEventListener("resize", function () { clearTimeout(rsz); rsz = setTimeout(paintAll, 180); });
  window.WonderMark = { drawLockup: drawLockup, sectorORobot: sectorORobot, paintAll: paintAll };
})();
