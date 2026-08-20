/* 운향재 — 공통 런타임
   카탈로그 렌더링 · 장바구니 · 네비게이션 · 리빌
   모션은 페이드만. 슬라이드·바운스·패럴랙스는 쓰지 않는다. */
(function () {
  'use strict';

  var C = window.WHJ_CATALOG || {};
  var W = window.WHJ = {};

  /* ── 조회 헬퍼 ────────────────────────────────────── */
  W.catalog = C;
  W.products = C.products || [];
  W.collections = (C.collections || []).slice().sort(function (a, b) { return a.order - b.order; });
  W.sets = C.sets || [];

  W.product = function (slug) {
    var all = W.products.concat(W.sets);
    for (var i = 0; i < all.length; i++) if (all[i].slug === slug) return all[i];
    return null;
  };
  W.byCollection = function (id) {
    return W.products.filter(function (p) { return p.collectionId === id; })
      .sort(function (a, b) { return a.number.localeCompare(b.number); });
  };
  W.price = function (p) {
    return (p.variants && p.variants.length) ? p.variants[0].price : null;
  };
  W.won = function (n) {
    return '₩' + Number(n || 0).toLocaleString('ko-KR');
  };

  /* ── 병 일러스트 ──────────────────────────────────────
     황금비율 직육면체 베이스 · 이너 베벨 · 클린 컷 기둥 · 리얼 우드 캡.
     용액은 마호가니 브라운 단일 수색으로 전 제품 공통이다. */
  W.bottle = function (p, opts) {
    opts = opts || {};
    var accent = (p && p.accent) || '#6B4A2F';
    var dim = opts.dim || (p && p.status === 'coming');
    var uid = 'g' + Math.random().toString(36).slice(2, 8);
    var label = opts.label || (p && p.nameKo) || '';
    return '' +
      '<svg viewBox="0 0 240 320" role="img" aria-label="' + esc(label ? label + ' 리드 디퓨저' : '준비 중인 제품') + '">' +
        '<defs>' +
          '<linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="' + (dim ? '#2A2622' : '#8C5A33') + '"/>' +
            '<stop offset="55%" stop-color="' + (dim ? '#211E1A' : '#5E3620') + '"/>' +
            '<stop offset="100%" stop-color="' + (dim ? '#1A1714' : '#3B2114') + '"/>' +
          '</linearGradient>' +
        '</defs>' +
        // 리드 스틱
        '<g stroke="' + (dim ? '#4A443C' : '#BFAE8F') + '" stroke-width="2.4" stroke-linecap="round" fill="none">' +
          '<path d="M120 168 L 97 30"/><path d="M120 168 L 110 18"/><path d="M120 168 L 127 23"/>' +
          '<path d="M120 168 L 141 34"/><path d="M120 168 L 86 55"/><path d="M120 168 L 155 59"/>' +
        '</g>' +
        // 우드 캡 — 관(冠)의 정서
        '<rect x="105" y="136" width="30" height="28" rx="2" fill="' + accent + '" stroke="#1E150E" stroke-width="1.5"/>' +
        // 클린 컷 기둥 — 줄기의 정서
        '<rect x="99" y="162" width="42" height="12" rx="1.5" fill="' + shade(accent) + '" stroke="#1E150E" stroke-width="1.4"/>' +
        // 직육면체 베이스 — 뿌리의 정서
        '<path d="M77 176 q0 -5 5 -5 h76 q5 0 5 5 v122 q0 7 -7 7 h-72 q-7 0 -7 -7 z" ' +
          'fill="url(#' + uid + ')" stroke="#1E150E" stroke-width="1.8"/>' +
        // 이너 베벨
        '<rect x="87" y="186" width="66" height="102" fill="none" stroke="#F7F3EE" stroke-opacity="' + (dim ? '.08' : '.2') + '" stroke-width="1.2"/>' +
        // 라벨 — 블라인드 형압
        '<rect x="77" y="236" width="86" height="27" fill="#F7F3EE" fill-opacity="' + (dim ? '.12' : '.93') + '"/>' +
        '<rect x="77" y="236" width="86" height="3" fill="' + accent + '"/>' +
        // 유리 굴절
        '<path d="M92 200 q-4 44 0 86" stroke="#FFFFFF" stroke-opacity="' + (dim ? '.1' : '.34') + '" stroke-width="3.5" stroke-linecap="round" fill="none"/>' +
      '</svg>';
  };

  function shade(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, (n >> 16) - 26), g = Math.max(0, ((n >> 8) & 255) - 22), b = Math.max(0, (n & 255) - 18);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  W.esc = esc;

  /* ── 제품 표식 ────────────────────────────────────────
     BEST / DESIGNER'S PICK 처럼 카탈로그의 badges 를 그대로 그린다. */
  W.badges = function (p) {
    var list = (p && p.badges) || [];
    if (!list.length) return '<div class="badges"></div>';
    return '<div class="badges">' + list.map(function (b) {
      var cls = /best/i.test(b) ? ' badge-best' : (/pick|choice/i.test(b) ? ' badge-pick' : '');
      return '<span class="badge' + cls + '">' + esc(b) + '</span>';
    }).join('') + '</div>';
  };

  /* ── 탭 ───────────────────────────────────────────────
     [data-tabs] 안의 버튼(data-tab)과 패널(data-panel)을 연결한다. */
  W.tabs = function (root) {
    if (!root) return;
    var bar = root.querySelector('.tabbar');
    if (!bar) return;
    var show = function (key) {
      bar.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-tab') === key);
      });
      root.querySelectorAll('[data-panel]').forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== key;
      });
      observe(root.querySelectorAll('.reveal'));
    };
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (b) show(b.getAttribute('data-tab'));
    });
    var first = bar.querySelector('button[data-tab]');
    if (first) show(first.getAttribute('data-tab'));
  };

  /* ── 八章 렌더링 ──────────────────────────────────────
     상태(active/upcoming/done)만 바꾸면 글자 밝기가 자동으로 반영된다.
     아직 오지 않은 장에는 링크를 걸지 않는다. */
  W.renderChapters = function (el) {
    if (!el) return;
    el.innerHTML = W.collections.map(function (c) {
      return '<div class="chapter' + (c.status === 'active' ? ' is-active' : '') + '">' +
        '<div class="chapter-hanja">' + esc(c.hanja) + '</div>' +
        '<div class="chapter-en">' + esc(c.en) + '</div>' +
      '</div>';
    }).join('');
  };

  /* ── 제품 카드 그리드 ─────────────────────────────── */
  W.renderProducts = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    var list = opts.collectionId ? W.byCollection(opts.collectionId) : W.products;
    var html = list.map(function (p, i) {
      var coming = p.status === 'coming';
      var price = W.price(p);
      var href = coming ? '#notify' : (opts.base || 'product.html') + '?p=' + encodeURIComponent(p.slug);
      return '<a class="pcard reveal" data-i="' + i + '"' + (coming ? ' data-coming="1"' : '') + ' href="' + href + '">' +
        '<div class="pcard-visual">' + W.bottle(p) + '</div>' +
        '<div class="pcard-body">' +
          '<p class="pcard-num">' + esc(p.number) + (coming ? ' · COMING SOON' : '') + '</p>' +
          W.badges(p) +
          '<h3 class="pcard-name">' + (coming ? '준비하고 있습니다' : esc(p.nameKo) +
            (p.nameHanja ? '<span class="hanja">' + esc(p.nameHanja) + '</span>' : '')) + '</h3>' +
          '<p class="pcard-sig">' + esc(p.signature) + '</p>' +
          '<p class="pcard-cap">' + esc(coming ? p.layer : p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +
          '<div class="pcard-foot">' +
            '<span>' + esc(coming ? '출시 소식 받기 →' : '자세히 보기 →') + '</span>' +
            (price ? '<span class="pcard-price">' + W.won(price) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</a>';
    }).join('');
    el.innerHTML = html;
    // 인라인 style 속성은 CSP 에 막히므로 삽입 후 CSSOM 으로 지연을 준다
    W.stagger(el.querySelectorAll('.pcard'));
    el.querySelectorAll('[data-coming]').forEach(function (n) { n.classList.add('pcard-coming'); });
    observe(el.querySelectorAll('.reveal'));
  };

  /* 스크롤 리빌 지연을 순서대로 부여한다.
     인라인 스타일은 CSP 가 막으므로 미리 정의된 d1~d6 클래스를 붙인다. */
  W.stagger = function (nodes) {
    Array.prototype.forEach.call(nodes || [], function (n, i) {
      var k = n.getAttribute('data-i');
      var idx = Math.min(6, (k == null ? i : Number(k)) + 1);
      if (idx > 0) n.classList.add('d' + idx);
    });
  };

  /* ── 장바구니 ─────────────────────────────────────── */
  var KEY = 'whj_cart_v1';
  W.cart = {
    read: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    },
    write: function (items) {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
      W.cart.paint();
    },
    add: function (slug, variantId, qty, gift) {
      var items = W.cart.read();
      var hit = null;
      items.forEach(function (it) {
        if (it.slug === slug && it.variantId === variantId && it.gift === !!gift) hit = it;
      });
      if (hit) hit.qty += qty; else items.push({ slug: slug, variantId: variantId, qty: qty, gift: !!gift });
      W.cart.write(items);
    },
    remove: function (idx) {
      var items = W.cart.read();
      items.splice(idx, 1);
      W.cart.write(items);
    },
    setQty: function (idx, qty) {
      var items = W.cart.read();
      if (!items[idx]) return;
      items[idx].qty = Math.max(1, qty);
      W.cart.write(items);
    },
    clear: function () { W.cart.write([]); },
    count: function () {
      return W.cart.read().reduce(function (n, it) { return n + it.qty; }, 0);
    },
    lines: function () {
      return W.cart.read().map(function (it) {
        var p = W.product(it.slug);
        if (!p) return null;
        var v = null;
        (p.variants || []).forEach(function (x) { if (x.id === it.variantId) v = x; });
        if (!v) v = (p.variants || [])[0];
        if (!v) return null;
        return { product: p, variant: v, qty: it.qty, gift: it.gift, amount: v.price * it.qty };
      }).filter(Boolean);
    },
    totals: function () {
      var lines = W.cart.lines();
      var goods = lines.reduce(function (n, l) { return n + l.amount; }, 0);
      var ship = C.shipping || { fee: 0, freeThreshold: 0 };
      var fee = (goods === 0 || goods >= ship.freeThreshold) ? 0 : ship.fee;
      return { goods: goods, ship: fee, total: goods + fee, lines: lines };
    },
    paint: function () {
      var dot = document.querySelector('.cart-dot');
      if (dot) dot.classList.toggle('is-on', W.cart.count() > 0);
    }
  };

  /* ── 리빌 ─────────────────────────────────────────── */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;
  function observe(nodes) {
    if (!nodes || !nodes.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    }
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }
  W.observe = observe;

  /* ── 부팅 ─────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    observe(document.querySelectorAll('.reveal'));
    W.cart.paint();

    // 헤더 : 히어로를 벗어나면 크림 배경으로 고정
    var header = document.getElementById('header');
    var hero = document.querySelector('.hero');
    if (header && hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        header.classList.toggle('is-stuck', !e[0].isIntersecting);
      }, { rootMargin: '-72px 0px 0px 0px' }).observe(hero);
    } else if (header) {
      if (!hero) header.classList.add('is-stuck');
      var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 72 || !hero); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // 모바일 메뉴
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('nav');
    if (toggle && nav) {
      var setNav = function (open) {
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
        if (open && header) header.classList.add('is-stuck');
      };
      toggle.addEventListener('click', function () {
        setNav(toggle.getAttribute('aria-expanded') !== 'true');
      });
      nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setNav(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
    }

    // 탭 · 八章 · 제품 그리드 자동 렌더링
    document.querySelectorAll('[data-tabs]').forEach(function (el) { W.tabs(el); });
    W.renderChapters(document.querySelector('[data-chapters]'));
    document.querySelectorAll('[data-products]').forEach(function (el) {
      W.renderProducts(el, {
        collectionId: el.getAttribute('data-products') || null,
        base: el.getAttribute('data-base') || 'product.html'
      });
    });

    // 푸터 연도 · 사업자 정보
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
    var biz = document.getElementById('bizline');
    if (biz && C.brand) {
      biz.textContent = C.brand.company + ' · 대표 ' + C.brand.ceo +
        ' · 사업자등록번호 ' + C.brand.bizNumber +
        ' · 통신판매업 신고 ' + C.brand.mailOrderNumber;
    }
  });
})();
