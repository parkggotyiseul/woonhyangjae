/* 운향재 — interactions */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 스크롤 리빌 ─────────────────────────────────── */
  var revealables = document.querySelectorAll('.reveal');

  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ── 헤더: 히어로를 벗어나면 배경을 채운다 ────────── */
  var header = document.getElementById('header');
  var hero = document.querySelector('.hero');

  if (header && hero && 'IntersectionObserver' in window) {
    var headerIO = new IntersectionObserver(function (entries) {
      header.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { rootMargin: '-72px 0px 0px 0px' });
    headerIO.observe(hero);
  } else if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 72);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 모바일 메뉴 ─────────────────────────────────── */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      // 메뉴가 열리면 헤더 배경이 필요하다
      if (open && header) header.classList.add('is-stuck');
    };

    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setNav(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
  }

  /* ── 문의 폼 ─────────────────────────────────────── */
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var invalid = null;
      ['name', 'email', 'message'].forEach(function (key) {
        var field = form.elements[key];
        var ok = field.value.trim() !== '' &&
                 (key !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()));
        field.setAttribute('aria-invalid', String(!ok));
        if (!ok && !invalid) invalid = field;
      });

      if (invalid) {
        status.textContent = '성함 · 이메일 · 내용을 확인해 주세요.';
        status.classList.add('is-error');
        invalid.focus();
        return;
      }

      // 백엔드가 아직 없다. 메일 클라이언트로 넘긴다.
      var subject = '[운향재 문의] ' + form.elements.type.value +
                    ' — ' + form.elements.name.value.trim();
      var body = '성함: ' + form.elements.name.value.trim() + '\n' +
                 '이메일: ' + form.elements.email.value.trim() + '\n' +
                 '문의 종류: ' + form.elements.type.value + '\n\n' +
                 form.elements.message.value.trim();

      status.classList.remove('is-error');
      status.textContent = '메일 작성 창을 엽니다. 창이 열리지 않으면 hello@woonhyangjae.com 으로 보내주세요.';

      window.location.href = 'mailto:hello@woonhyangjae.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  }

  /* ── 푸터 연도 ───────────────────────────────────── */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
