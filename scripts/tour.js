/* tour.js - cross-page guided tour. Loaded on the SPA (index.html) and on project detail pages.
   Walks: main -> projects -> Flightdeck (full) -> counter-index (full) -> skills -> about -> contact -> main.
   State persists across page loads in sessionStorage. Any key pauses/resumes, a click stops.
   Needs: window.__tourShowScreen(page) defined on the SPA to switch screens; reuses #tour-banner / #tour-progress CSS. */
(function () {
  var PLAN = [
    { spa: 'main', d: 3000 },
    { spa: 'projects', d: 3500 },
    { page: '/projects/flightdeck.html', d: 6000 },
    { page: '/projects/counter-index.html', d: 6000 },
    { spa: 'skills', d: 3500 },
    { spa: 'about', d: 3500 },
    { spa: 'contact', d: 4000 },
    { spa: 'main', d: 2500 }
  ];
  var K_ACTIVE = 'gt', K_STEP = 'gt-step', K_PAUSE = 'gt-pause';
  var timer = null, paused = false;

  function ss(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  function onSPA() { return typeof window.__tourShowScreen === 'function'; }
  function active() { return ss(K_ACTIVE) === '1'; }

  function label(step) {
    var where = step.page ? step.page.split('/').pop().replace('.html', '').toUpperCase() : step.spa.toUpperCase();
    return paused
      ? '❚❚ TOUR PAUSED · ' + where + ' · any key = resume, click = stop'
      : '▶ GUIDED TOUR · ' + where + ' · any key = pause, click = stop';
  }
  function ui(on, step) {
    var b = document.getElementById('tour-banner'), p = document.getElementById('tour-progress');
    var fab = document.getElementById('view-fab');
    if (on) {
      if (!b) { b = document.createElement('div'); b.id = 'tour-banner'; document.body.appendChild(b); }
      if (!p) { p = document.createElement('div'); p.id = 'tour-progress'; p.innerHTML = '<div id="tour-progress-fill"></div>'; document.body.appendChild(p); }
      b.textContent = label(step);
      if (fab) fab.classList.add('tour-hidden');
    } else {
      if (b) b.remove();
      if (p) p.remove();
      if (fab) fab.classList.remove('tour-hidden');
    }
  }
  function prog(frac) { var f = document.getElementById('tour-progress-fill'); if (f) f.style.width = (Math.max(0, Math.min(1, frac)) * 100) + '%'; }

  function dwell(ms, done) {
    var elapsed = 0;
    prog(0);
    clearInterval(timer);
    timer = setInterval(function () {
      if (!active()) { clearInterval(timer); return; }
      if (paused) return;
      elapsed += 50;
      prog(elapsed / ms);
      if (elapsed >= ms) { clearInterval(timer); done(); }
    }, 50);
  }

  function goto(idx) {
    if (idx >= PLAN.length) { end(); return; }
    sset(K_STEP, String(idx));
    var step = PLAN[idx];
    if (step.page) {
      if (location.pathname.split('/').pop() === step.page.split('/').pop()) { runHere(idx); }
      else { window.location.href = step.page; }
    } else {
      if (onSPA()) { runHere(idx); }
      else { window.location.href = '/index.html#' + step.spa; }
    }
  }

  function runHere(idx) {
    var step = PLAN[idx];
    ui(true, step);
    if (step.spa) { if (onSPA()) window.__tourShowScreen(step.spa); }
    else { document.body.classList.remove('detail-simple'); } // detail page shown in FULL
    dwell(step.d || 3500, function () { goto(idx + 1); });
  }

  function start() {
    sset(K_ACTIVE, '1'); sdel(K_PAUSE); paused = false;
    if (window.umami) { try { umami.track('guide_tour'); } catch (e) {} }
    goto(0);
  }
  function end() {
    clearInterval(timer);
    sdel(K_ACTIVE); sdel(K_STEP); sdel(K_PAUSE); paused = false;
    ui(false);
  }
  function togglePause() {
    paused = !paused; sset(K_PAUSE, paused ? '1' : '0');
    var i = parseInt(ss(K_STEP) || '0', 10);
    var b = document.getElementById('tour-banner'); if (b && PLAN[i]) b.textContent = label(PLAN[i]);
  }

  document.addEventListener('keydown', function (e) { if (active()) { togglePause(); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener('click', function () { if (active()) end(); }, true);

  window.GuidedTour = { start: start, stop: end };

  // Resume on page load if a tour is in progress (wait for app.js / project.js init first)
  function resume() {
    if (!active()) return;
    paused = ss(K_PAUSE) === '1';
    var i = parseInt(ss(K_STEP) || '0', 10);
    if (i >= 0 && i < PLAN.length) setTimeout(function () { runHere(i); }, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resume);
  else resume();
})();
