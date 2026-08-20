/* 운향재 — 자체 분석 수집
   쿠키를 쓰지 않는다. 세션 식별자는 브라우저의 sessionStorage 에만 살고
   탭을 닫으면 사라진다. 이름·이메일 같은 개인정보는 절대 보내지 않는다.
   서버도 IP 를 저장하지 않는다.

   수집 항목
     page          방문한 경로 · 유입 출처 · 디바이스 · 머문 시간
     scroll        25 / 50 / 75 / 100% 도달
     funnel        사이트 방문 → 제품 조회 → 담기 → 주문서 → 주문 완료
     product_view  제품 상세 조회
     add_to_cart   장바구니 담기 */
(function () {
  'use strict';

  var KEY = 'whj_sid';
  var sid;
  try {
    sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, sid);
    }
  } catch (e) { sid = 'nostore'; }

  var startedAt = Date.now();
  var isMobile = window.matchMedia('(max-width: 767px)').matches;
  var sent = {};

  function send(payload, useBeacon) {
    payload.sid = sid;
    payload.path = location.pathname + (location.search || '');
    payload.mobile = isMobile;
    var body = JSON.stringify(payload);
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  var T = window.WHJTrack = {
    funnel: function (step) {
      if (sent['f:' + step]) return;
      sent['f:' + step] = true;
      send({ type: 'funnel', step: step });
    },
    product: function (slug) {
      if (sent['p:' + slug]) return;
      sent['p:' + slug] = true;
      send({ type: 'product_view', slug: slug });
      T.funnel('view_product');
    },
    addToCart: function (slug) {
      send({ type: 'add_to_cart', slug: slug });
      T.funnel('add_to_cart');
    },
    event: function (type, extra) {
      send(Object.assign({ type: type }, extra || {}));
    }
  };

  /* 페이지 진입 — 유입 출처는 최초 진입에서만 의미가 있다 */
  send({ type: 'page', ref: document.referrer || '' });

  var p = location.pathname;
  if (p === '/' || p === '/index.html') T.funnel('view_home');
  if (/checkout\.html$/.test(p)) T.funnel('begin_checkout');
  if (/order\.html$/.test(p)) T.funnel('purchase');

  /* 스크롤 도달 깊이 */
  var marks = [25, 50, 75, 100];
  var hit = {};
  function onScroll() {
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    var pct = (window.scrollY / scrollable) * 100;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (pct >= m - 1 && !hit[m]) {
        hit[m] = true;
        send({ type: 'scroll', depth: m });
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 머문 시간 — 페이지를 떠날 때 한 번만 보낸다 */
  var dwellSent = false;
  function sendDwell() {
    if (dwellSent) return;
    dwellSent = true;
    send({ type: 'page', dwell: Math.round((Date.now() - startedAt) / 1000) }, true);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendDwell();
  });
  window.addEventListener('pagehide', sendDwell);
})();
