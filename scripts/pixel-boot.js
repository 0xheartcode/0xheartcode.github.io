/* pixel-boot.js - the boot bar on its own. No dependencies. Same colors as the original: #101a14 cover, #8fe3a0 bar.
   Auto:   <script src="pixel-boot.js" data-auto></script>  as the FIRST thing inside <body>
           optional: data-sharpen (loading screen starts blocky and sharpens as the bar fills; add ="64" etc. for the starting block size),
                     data-exit="cut|dissolve" (default dissolve), data-label, data-cell (px), data-hold (ms),
                     data-color / data-accent (any CSS color, or "page" to read it from the page)
   Manual: PixelBoot.play(element, { fixed, sharpen, exit, label, cell, hold, duration, until }) -> Promise */
(function () {
  function bgOf(el) {
    for (var e = el; e; e = e.parentElement) {
      var c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'transparent' && !/^rgba\(.*,\s*0\)$|\/\s*0\)$/.test(c)) return c;
    }
    return '#000';
  }

  function play(host, opts) {
    var o = { fixed: false, cell: 16, hold: 1200, step: 60, label: 'LOADING', exit: 'dissolve', duration: 900, until: null, sharpen: false }, k;
    for (k in opts) if (opts[k] != null) o[k] = opts[k];
    var src = o.fixed ? (document.body || host) : host;
    var color = o.color === 'page' ? bgOf(src) : o.color || '#101a14', accent = o.accent === 'page' ? getComputedStyle(src).color : o.accent || '#8fe3a0';
    var old = host.querySelector(':scope > [data-pixel-boot]'); if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.setAttribute('data-pixel-boot', '');
    wrap.style.cssText = 'position:' + (o.fixed ? 'fixed' : 'absolute') + ';inset:0;z-index:2147483647;overflow:hidden;pointer-events:none;';
    host.appendChild(wrap);
    var w = wrap.clientWidth || window.innerWidth, h = wrap.clientHeight || window.innerHeight;
    var cols = Math.ceil(w / o.cell), rows = Math.ceil(h / o.cell), total = cols * rows, W = cols * o.cell, H = rows * o.cell;
    var sharp = !!o.sharpen, u = sharp ? o.cell : 1, family = getComputedStyle(src).fontFamily, size = Math.max(10, Math.round(o.cell * 0.8));

    // plain: one canvas pixel per cell. sharpen: full-resolution canvas, redrawn at a shrinking block size.
    var cv = document.createElement('canvas');
    cv.width = sharp ? W : cols; cv.height = sharp ? H : rows;
    cv.style.cssText = 'display:block;width:' + W + 'px;height:' + H + 'px;image-rendering:pixelated;';
    wrap.appendChild(cv);
    var ctx = cv.getContext('2d');

    var N = Math.max(3, Math.min(10, Math.floor((cols - 3) / 2))), bx = Math.floor((cols - (N * 2 - 1)) / 2), by = Math.floor(rows / 2);
    function paint(c, filled) {
      c.globalAlpha = 1; c.fillStyle = color; c.fillRect(0, 0, cols, rows);
      c.fillStyle = accent;
      for (var i = 0; i < N; i++) { c.globalAlpha = i < filled ? 1 : 0.22; c.fillRect(bx + i * 2, by, 1, 2); }
      c.globalAlpha = 1;
    }

    var label = document.createElement('div');
    label.textContent = o.label;
    label.style.cssText = 'position:absolute;left:0;right:0;top:' + (by - 1) * o.cell + 'px;transform:translateY(-100%);text-align:center;color:' + accent +
      ';font-family:' + family + ';font-size:' + size + 'px;letter-spacing:.15em;line-height:1;' + (sharp ? 'visibility:hidden;' : '');
    wrap.appendChild(label);

    var levels = [1], full, fctx, small, sctx, curF = 0, curL = 0;
    if (sharp) {
      var top = Math.pow(2, Math.max(1, Math.round(Math.log2(o.sharpen === true ? 32 : +o.sharpen || 32))));
      for (levels = []; top >= 1; top /= 2) levels.push(top);
      full = document.createElement('canvas'); full.width = W; full.height = H; fctx = full.getContext('2d');
      small = document.createElement('canvas'); sctx = small.getContext('2d');
    }
    function render(f, li) {
      curF = f; curL = li;
      if (!sharp) return paint(ctx, f);
      fctx.setTransform(o.cell, 0, 0, o.cell, 0, 0); paint(fctx, f); fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.fillStyle = accent; fctx.font = size + 'px ' + family; fctx.textAlign = 'center'; fctx.textBaseline = 'bottom';
      if ('letterSpacing' in fctx) fctx.letterSpacing = size * 0.15 + 'px';
      fctx.fillText(o.label, w / 2, (by - 1) * o.cell);
      var b = levels[li];
      ctx.imageSmoothingEnabled = false;
      if (b <= 1) return ctx.drawImage(full, 0, 0);
      small.width = Math.ceil(W / b); small.height = Math.ceil(H / b);
      sctx.imageSmoothingQuality = 'high'; sctx.fillStyle = color; sctx.fillRect(0, 0, small.width, small.height);
      sctx.drawImage(full, 0, 0, W, H, 0, 0, W / b, H / b);
      ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, small.width * b, small.height * b);
    }
    render(0, 0);
    if (sharp && document.fonts) document.fonts.ready.then(function () { if (wrap.isConnected && phase === 'bar') render(curF, curL); });

    var ord = [], i;
    for (i = 0; i < total; i++) ord.push(i);
    for (i = total - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, tmp = ord[i]; ord[i] = ord[j]; ord[j] = tmp; }
    var ready = !o.until; if (o.until) o.until.then(function () { ready = true; });
    var phase = 'bar';

    return new Promise(function (resolve) {
      var t0 = performance.now(), t1 = 0, cleared = 0;
      function frame(now) {
        if (!wrap.isConnected) return resolve();
        var t;
        if (phase === 'bar') {
          t = Math.floor((now - t0) / o.step) * o.step;
          var f = Math.min(N - 1, Math.floor(t / (o.hold / N)));
          var li = Math.min(levels.length - 1, Math.floor(t / (o.hold * 0.8) * levels.length));
          if (ready && t >= o.hold) { f = N; phase = 'pause'; t1 = now; }
          if (f !== curF || li !== curL) render(f, li);
        } else if (phase === 'pause') {
          if (now - t1 > 220) {
            if (o.exit === 'cut') { wrap.remove(); return resolve(); }
            label.remove(); phase = 'clear'; t1 = now;
          }
        } else {
          t = Math.floor((now - t1) / o.step) * o.step;
          var n = Math.min(total, Math.ceil(total * t / o.duration));
          for (; cleared < n; cleared++) { var c = ord[cleared]; ctx.clearRect(c % cols * u, ((c / cols) | 0) * u, u, u); }
          if (cleared >= total) { wrap.remove(); return resolve(); }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  window.PixelBoot = { play: play };

  var s = document.currentScript;
  var seen = false;
  try { seen = sessionStorage.getItem('pb-seen') === '1'; } catch (e) {}
  if (s && s.hasAttribute('data-auto') && !seen && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    try { sessionStorage.setItem('pb-seen', '1'); } catch (e) {}
    play(document.documentElement, { fixed: true, exit: s.dataset.exit, label: s.dataset.label, cell: +s.dataset.cell || null, hold: +s.dataset.hold || null,
      sharpen: s.hasAttribute('data-sharpen') ? +s.dataset.sharpen || true : null, color: s.dataset.color, accent: s.dataset.accent,
      until: new Promise(function (r) { document.readyState === 'complete' ? r() : window.addEventListener('load', r); setTimeout(r, 6000); }) });
  }
})();
