/* ?댄뼢????shop ?섏씠吏
   CSP(script-src 'self')瑜?吏?ㅺ린 ?꾪빐 ?몃씪???ㅽ겕由쏀듃瑜??곗? ?딅뒗?? */
document.addEventListener('DOMContentLoaded', function () {
  var W = window.WHJ;
  if (!W) return;

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
          s.items.map(function (id) { return W.bottle(W.product(id)); }).join('') +
        '</div>' +
        '<div class="pcard-body">' +
          '<p class="pcard-num">SET</p>' +
          '<h3 class="pcard-name">' + W.esc(s.nameKo) + '</h3>' +
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
    /* 2단계에서 이 부분만 Subscriber API 호출로 교체한다 */
    try {
      var list = JSON.parse(localStorage.getItem('whj_notify') || '[]');
      if (list.indexOf(el.value.trim()) < 0) list.push(el.value.trim());
      localStorage.setItem('whj_notify', JSON.stringify(list));
    } catch (err) {}
    st.textContent = '신청되었습니다. 준비가 되면 알려드리겠습니다.';
    el.value = '';
  });
});
