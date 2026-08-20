/* 운향재 — 주문 완료 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
document.addEventListener('DOMContentLoaded', function () {
  var W = window.WHJ;
  if (!W) return;
  var root = document.getElementById('order-root');
  var id = new URLSearchParams(location.search).get('id');
  var order = null;
  try {
    var orders = JSON.parse(localStorage.getItem('whj_orders') || '[]');
    orders.forEach(function (o) { if (o.id === id) order = o; });
  } catch (e) {}

  if (!order) {
    root.innerHTML = '<div class="empty"><h1 class="sec-title">주문 내역을 찾을 수 없습니다</h1>' +
      '<p>주문번호를 다시 확인해 주세요.</p><a class="link-line" href="/shop.html">SHOP으로 →</a></div>';
    return;
  }

  /* 배송 예정일 — 영업일 3일 기준 */
  var d = new Date(order.at);
  var added = 0;
  while (added < 3) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  var due = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';

  root.innerHTML =
    '<div class="sec-head reveal"><span class="sec-num">03</span>' +
      '<h1 class="sec-title">주문이 접수되었습니다</h1><span class="sec-en">ORDER RECEIVED</span></div>' +
    '<div class="cart-layout">' +
      '<div class="reveal">' +
        '<dl class="spec">' +
          '<div><dt>주문번호</dt><dd>' + W.esc(order.id) + '</dd></div>' +
          '<div><dt>배송 예정일</dt><dd>' + W.esc(due) + '</dd></div>' +
          '<div><dt>받는 분</dt><dd>' + W.esc(order.shipping.receiver) + '</dd></div>' +
          '<div><dt>배송지</dt><dd>(' + W.esc(order.shipping.zip) + ') ' + W.esc(order.shipping.addr) + '</dd></div>' +
          '<div><dt>요청사항</dt><dd>' + W.esc(order.shipping.memo) + '</dd></div>' +
          (order.gift ? '<div><dt>기프트</dt><dd>메시지 카드 동봉' +
            (order.gift.hidePrice ? ' · 가격 미표기 명세서' : '') + '</dd></div>' : '') +
        '</dl>' +
        '<p class="notice">주문 확인 안내를 ' + W.esc(order.buyer.email) + ' 로 보내드립니다. ' +
          '출고 시 송장번호를 다시 안내드립니다.</p>' +
      '</div>' +
      '<div class="summary">' +
        '<h3>주문 내역</h3>' +
        order.lines.map(function (l) {
          return '<div class="summary-row"><span>' + W.esc(l.name) + ' × ' + l.qty + '</span>' +
            '<span>' + W.won(l.amount) + '</span></div>';
        }).join('') +
        '<div class="summary-row summary-divide">' +
          '<span>배송비</span><span>' + (order.totals.ship === 0 ? '무료' : W.won(order.totals.ship)) + '</span></div>' +
        '<div class="summary-total"><span>결제금액</span><strong>' + W.won(order.totals.total) + '</strong></div>' +
      '</div>' +
    '</div>';

  W.observe(document.querySelectorAll('.reveal'));
});
