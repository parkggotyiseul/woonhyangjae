/* 운향재 — 장바구니 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;
  var root = document.getElementById('cart-root');

  function draw() {
    var t = W.cart.totals();

    if (!t.lines.length) {
      root.innerHTML = '<div class="empty">' +
        '<p>아직 담긴 것이 없습니다.</p>' +
        '<a class="link-line" href="/shop.html">컬렉션 보러 가기 →</a>' +
      '</div>';
      return;
    }

    var ship = W.catalog.shipping || {};
    var remain = Math.max(0, (ship.freeThreshold || 0) - t.goods);

    root.innerHTML = '<div class="cart-layout">' +
      '<div>' + t.lines.map(function (l, i) {
        return '<div class="cart-line">' +
          '<div class="cart-line-visual">' + W.visual(l.product) + '</div>' +
          '<div>' +
            '<h4>' + W.esc(l.product.nameKo) + '</h4>' +
            '<p class="opt">' + W.esc(l.variant.name) + (l.gift ? ' · 기프트 포장' : '') + '</p>' +
            '<div class="qty mt-sm">' +
              '<button type="button" data-act="dec" data-i="' + i + '" aria-label="수량 줄이기">−</button>' +
              '<span>' + l.qty + '</span>' +
              '<button type="button" data-act="inc" data-i="' + i + '" aria-label="수량 늘리기">+</button>' +
            '</div>' +
            '<button class="rm" data-act="rm" data-i="' + i + '">삭제</button>' +
          '</div>' +
          '<div class="line-amount">' + W.won(l.amount) + '</div>' +
        '</div>';
      }).join('') +
      '<div class="notice mt-4">' +
        (remain > 0
          ? W.won(remain) + ' 더 담으시면 배송비가 무료입니다.'
          : '무료 배송이 적용됩니다.') +
      '</div>' +
      '</div>' +

      '<div class="summary">' +
        '<h3>주문 요약</h3>' +
        '<div class="summary-row"><span>상품 금액</span><span>' + W.won(t.goods) + '</span></div>' +
        '<div class="summary-row"><span>배송비</span><span>' + (t.ship === 0 ? '무료' : W.won(t.ship)) + '</span></div>' +
        '<div class="summary-total"><span>총 결제금액</span><strong>' + W.won(t.total) + '</strong></div>' +
        '<div class="buy-actions"><a class="btn" href="/checkout.html">주문하기</a>' +
          '<a class="btn btn-outline" href="/shop.html">계속 둘러보기</a></div>' +
      '</div>' +
    '</div>';
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var i = Number(b.getAttribute('data-i'));
    var act = b.getAttribute('data-act');
    var items = W.cart.read();
    if (act === 'rm') W.cart.remove(i);
    else if (act === 'inc') W.cart.setQty(i, items[i].qty + 1);
    else if (act === 'dec') W.cart.setQty(i, items[i].qty - 1);
    draw();
  });

  draw();
});
