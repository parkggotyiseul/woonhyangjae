/* 운향재 — SHOP 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;

  /* ── 제품 목록 · 정렬 ─────────────────────────────────
     Coming Soon 은 어떤 정렬에서도 항상 마지막에 둔다. */
  var grid = document.getElementById('shopGrid');
  var sortBar = document.querySelector('.sortbar');
  var sortKey = 'popular';

  function sorted() {
    var list = W.byCollection('wood').slice();
    return list.sort(function (a, b) {
      var ac = a.status === 'coming', bc = b.status === 'coming';
      if (ac !== bc) return ac ? 1 : -1;
      if (sortKey === 'popular') return (b.soldCount || 0) - (a.soldCount || 0);
      if (sortKey === 'recent') return String(b.releasedAt || '').localeCompare(String(a.releasedAt || ''));
      return String(a.number).localeCompare(String(b.number));
    });
  }

  function drawGrid() {
    if (!grid) return;
    var list = sorted();
    grid.innerHTML = list.map(function (p, i) {
      var coming = p.status === 'coming';
      var price = W.price(p);
      var href = coming ? '#notify' : '/product.html?p=' + encodeURIComponent(p.slug);
      return '<a class="pcard reveal' + (coming ? ' pcard-coming' : '') + '" data-i="' + i + '" href="' + href + '">' +
        '<div class="pcard-visual">' + W.visual(p) + '</div>' +
        '<div class="pcard-body">' +
          '<p class="pcard-num">' + W.esc(p.number) + (coming ? ' · COMING SOON' : '') + '</p>' +
          W.badges(p) +
          '<h2 class="pcard-name">' + (coming ? '준비하고 있습니다' : W.esc(p.nameKo) +
            (p.nameHanja ? '<span class="hanja">' + W.esc(p.nameHanja) + '</span>' : '')) + '</h2>' +
          '<p class="pcard-sig">' + W.esc(p.signature) + '</p>' +
          '<p class="pcard-cap">' + W.esc(coming ? p.layer : p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +
          '<div class="pcard-foot">' +
            '<span>' + (coming ? '출시 소식 받기 →' : '자세히 보기 →') + '</span>' +
            (price ? '<span class="pcard-price">' + W.won(price) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</a>';
    }).join('');
    W.stagger(grid.querySelectorAll('.pcard'));
    W.observe(grid.querySelectorAll('.reveal'));
  }

  if (sortBar) {
    sortBar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sort]');
      if (!b) return;
      sortKey = b.getAttribute('data-sort');
      sortBar.querySelectorAll('button').forEach(function (x) {
        x.classList.toggle('is-on', x === b);
      });
      drawGrid();
    });
  }
  drawGrid();

  /* 배송 안내 */
  var ship = W.catalog.shipping || {};
  document.getElementById('shipNotice').textContent =
    (ship.notice || '') + ' ' + W.won(ship.freeThreshold) + ' 이상 구매 시 배송비는 무료입니다.';

  /* 세트 — 할인이 아니라 전용 기프트 박스라는 부가가치로 판다 */
  var sets = W.sets || [];
  document.getElementById('sets').innerHTML = sets.length ? (
    '<h2 class="sec-title reveal sub-title">세트</h2>' +
    '<div class="product-grid">' + sets.map(function (s) {
      var v = s.variants[0];
      var items = s.items.map(function (id) { var p = W.product(id); return p ? p.nameKo : id; });
      return '<a class="pcard reveal" href="/product.html?p=' + encodeURIComponent(s.slug) + '">' +
        '<div class="pcard-visual set-visuals">' +
          s.items.map(function (id) { return W.visual(W.product(id)); }).join('') +
        '</div>' +
        '<div class="pcard-body">' +
          '<p class="pcard-num">SET</p>' +
          W.badges(s) +
          '<h2 class="pcard-name">' + W.esc(s.nameKo) + '</h2>' +
          '<p class="pcard-sig">' + W.esc(s.signature) + '</p>' +
          '<p class="pcard-cap">' + W.esc(items.join(' · ')) + '</p>' +
          '<div class="pcard-foot"><span>자세히 보기 →</span>' +
            '<span class="pcard-price">' + W.won(v.price) + '</span></div>' +
        '</div></a>';
    }).join('') + '</div>'
  ) : '';

  W.observe(document.querySelectorAll('.reveal'));

  /* Coming Soon 알림 모달 */
  var modal = document.getElementById('notifyModal');
  var open = function () { modal.classList.add('is-open'); document.getElementById('n-email').focus(); };
  var close = function () { modal.classList.remove('is-open'); };

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#notify"]');
    if (a) { e.preventDefault(); open(); }
  });

  /* 다른 페이지에서 /shop.html#notify 로 건너온 경우.
     그 주소에 해당하는 요소가 없으므로 브라우저는 아무것도 하지 않는다.
     여기서 직접 열어 준다. */
  if (location.hash === '#notify') open();
  window.addEventListener('hashchange', function () {
    if (location.hash === '#notify') open();
  });
  document.getElementById('notifyClose').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  document.getElementById('notifyForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var el = document.getElementById('n-email');
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
    el.setAttribute('aria-invalid', String(!ok));
    var st = document.getElementById('notifyStatus');
    if (!ok) { st.textContent = '이메일 주소를 확인해 주세요.'; return; }

    st.textContent = '신청하고 있습니다…';
    W.api('/subscribe', {
      method: 'POST',
      body: { email: el.value.trim(), target: 'wood-003' }
    }).then(function () {
      st.textContent = '신청되었습니다. 준비가 되면 알려드리겠습니다.';
      el.value = '';
      if (window.WHJTrack) window.WHJTrack.event('subscribe');
    }).catch(function (err) {
      st.textContent = err.message || '신청하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    });
  });
});
