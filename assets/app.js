(function () {
  'use strict';

  var deck = document.getElementById('deck');
  var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
  var total = slides.length;
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var counter = document.getElementById('counter');
  var progressBar = document.getElementById('progressBar');
  var menu = document.getElementById('menu');
  var menuBtn = document.getElementById('menuBtn');
  var menuClose = document.getElementById('menuClose');
  var menuList = document.getElementById('menuList');
  var fsBtn = document.getElementById('fsBtn');
  var current = 0;

  var BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function bn(n) {
    return String(n).replace(/\d/g, function (d) { return BN[d]; });
  }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // ---------- স্লাইড পরিবর্তন ----------

  function go(index, fromHash) {
    index = Math.max(0, Math.min(total - 1, index));
    current = index;

    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle('is-active', active);
      slide.classList.toggle('is-before', i < index);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      if ('inert' in slide) slide.inert = !active;
    });
    slides[index].scrollTop = 0;

    counter.textContent = bn(index + 1) + ' / ' + bn(total);
    progressBar.style.width = ((index + 1) / total * 100) + '%';
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;

    var items = menuList.querySelectorAll('.menu__item');
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute('aria-current', i === index ? 'true' : 'false');
    }

    if (!fromHash) {
      var hash = '#' + (index + 1);
      if (location.hash !== hash) {
        try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; }
      }
    }
  }

  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  function indexFromHash() {
    var n = parseInt(location.hash.replace('#', ''), 10);
    return isNaN(n) ? 0 : n - 1;
  }

  // ---------- স্লাইড তালিকা ----------

  slides.forEach(function (slide, i) {
    var num = slide.querySelector('.sec-num');
    var isSub = !!slide.querySelector('.sec-head--cont');
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu__item' + (isSub ? ' menu__item--sub' : '');

    var n = document.createElement('span');
    n.className = 'menu__num';
    n.textContent = isSub ? '' : (num ? num.textContent : '');
    var t = document.createElement('span');
    t.className = 'menu__title';
    t.textContent = slide.getAttribute('data-menu') || '';

    btn.appendChild(n);
    btn.appendChild(t);
    btn.addEventListener('click', function () {
      closeMenu();
      go(i);
    });
    li.appendChild(btn);
    menuList.appendChild(li);
  });

  var lastFocus = null;

  function openMenu() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    // পরের ফ্রেমে ক্লাস দিলে ট্রানজিশন চলে
    requestAnimationFrame(function () {
      menu.classList.add('is-open');
      var active = menuList.querySelector('[aria-current="true"]');
      if (active) {
        active.scrollIntoView({ block: 'center' });
        active.focus();
      }
    });
  }

  function closeMenu() {
    if (menu.hidden) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { menu.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  menuBtn.addEventListener('click', openMenu);
  counter.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menu.addEventListener('click', function (e) {
    if (e.target === menu) closeMenu();
  });

  // ---------- বাটন ও কীবোর্ড ----------

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (!menu.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      if (e.key === 'Tab') trapFocus(e);
      return;
    }

    var tag = e.target && e.target.tagName;
    var onControl = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA';

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); prev(); break;
      case ' ':
        if (onControl) return;
        e.preventDefault();
        if (e.shiftKey) prev(); else next();
        break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(total - 1); break;
      case 'f':
      case 'F':
        toggleFullscreen(); break;
      case 'm':
      case 'M':
        openMenu(); break;
    }
  });

  function trapFocus(e) {
    var focusables = menu.querySelectorAll('button');
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------- সোয়াইপ (মোবাইল/ট্যাবলেট) ----------

  var touchX = 0, touchY = 0, touchT = 0, tracking = false;

  deck.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    touchT = Date.now();
  }, { passive: true });

  deck.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX;
    var dy = t.clientY - touchY;
    var fast = Date.now() - touchT < 700;
    // অনুভূমিক সোয়াইপ হলে তবেই স্লাইড বদলাবে, উপর-নিচ স্ক্রল নয়
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && fast) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // ---------- ফুল স্ক্রিন ----------

  var root = document.documentElement;
  var canFullscreen = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  if (!canFullscreen) fsBtn.hidden = true;

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFullscreen() {
    if (!canFullscreen) return;
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = root.requestFullscreen || root.webkitRequestFullscreen;
      var result = req.call(root);
      if (result && result.catch) result.catch(function () {});
    }
  }

  function syncFullscreen() {
    var on = isFullscreen();
    fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    fsBtn.setAttribute('aria-label', on ? 'ফুল স্ক্রিন বন্ধ করুন' : 'ফুল স্ক্রিন');
  }

  fsBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);

  // ---------- চেকলিস্ট (এই ডিভাইসে মনে থাকে) ----------

  Array.prototype.forEach.call(document.querySelectorAll('.check'), function (btn) {
    var key = 'jhs-check-' + btn.getAttribute('data-key');
    if (store(key) === '1') btn.setAttribute('aria-pressed', 'true');
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      store(key, on ? '1' : '0');
    });
  });

  // ---------- বড় স্ক্রিনে কনটেন্ট এক স্ক্রিনে ফিট করা ----------
  // ল্যাপটপ/প্রজেক্টরে লেখা একটু ছোট করে পুরো স্লাইড দেখানো হয়;
  // মোবাইলে লেখা ছোট না করে স্লাইডের ভেতরে উপর-নিচ স্ক্রল হয়।

  var MIN_SCALE = 0.8;

  function fitSlide(slide) {
    var inner = slide.querySelector('.slide__inner, .cover');
    if (!inner) return;
    inner.style.fontSize = '';
    if (window.innerWidth < 900 || window.innerHeight < 520) return;
    var avail = slide.clientHeight;
    var scale = 1;
    while (inner.offsetHeight > avail && scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale - 0.025);
      inner.style.fontSize = scale + 'em';
    }
  }

  function fitAll() { slides.forEach(fitSlide); }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 150);
  });

  // ---------- শুরু ----------

  window.addEventListener('hashchange', function () { go(indexFromHash(), true); });
  go(indexFromHash(), true);
  fitAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
})();
