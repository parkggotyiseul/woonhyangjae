/* 운향재 — 제품 상세 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;
  var root = document.getElementById('product-root');
  var slug = new URLSearchParams(location.search).get('p');
  var p = slug ? W.product(slug) : null;

  if (!p) {
    root.innerHTML = '<section class="section"><div class="shell"><div class="empty">' +
      '<h1 class="sec-title">찾으시는 제품이 없습니다</h1>' +
      '<p>주소를 다시 확인해 주세요.</p>' +
      '<a class="link-line" href="/shop.html">SHOP으로 →</a></div></div></section>';
    return;
  }

  var isSet = !!p.items;
  var v = p.variants[0];
  var qty = 1;

  if (window.WHJTrack) window.WHJTrack.product(p.slug);

  /* 등록된 사진이 있으면 일러스트 대신 실제 사진을 쓴다 */
  function shot(prod, slot) {
    var ps = (prod.photoSpots || []).filter(function (x) { return x.slot === slot && x.src; })[0];
    return ps ? '<img src="' + W.esc(ps.src) + '" alt="' + W.esc(ps.alt || prod.nameKo) + '">' : null;
  }

  document.title = p.nameKo + ' — 운향재 雲香齋';
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content',
    p.nameKo + ' — ' + p.signature + (isSet ? '' : ' · ' + p.species + ' ' + p.layer + ' · 부향률 20% · 서울향료 조향'));

  /* 구조화 데이터 */
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.nameKo,
    "description": p.signature,
    "brand": { "@type": "Brand", "name": "운향재" },
    "category": isSet ? "리드 디퓨저 세트" : "리드 디퓨저",
    "material": p.species || undefined,
    "offers": {
      "@type": "Offer",
      "price": v.price,
      "priceCurrency": "KRW",
      "availability": v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": location.href
    }
  });
  document.head.appendChild(ld);

  var visuals = isSet
    ? '<div class="set-visuals-lg">' +
        p.items.map(function (id) {
          var x = W.product(id);
          return shot(x, '02') || W.bottle(x);
        }).join('') + '</div>'
    : (shot(p, '01') || shot(p, '02') || W.bottle(p));

  var stockLine = v.stock === 0 ? '다시 준비하고 있습니다'
    : (v.stock <= 5 ? '소량 남음' : '');

  root.innerHTML =
    /* D1 · D2 — 히어로 + 구매 박스 */
    '<section class="section page-top-tight"><div class="shell"><div class="detail">' +
      '<div class="detail-visual reveal">' + visuals +
        '<p class="ps-caption">PS-01 · ' + W.esc((p.photoSpots && p.photoSpots[0]) ? p.photoSpots[0].role : '제품 이미지') + '</p>' +
      '</div>' +
      '<div class="reveal" id="buy">' +
        '<p class="detail-num">' + W.esc(isSet ? 'SET' : p.number) + '</p>' +
        '<h1 class="detail-name">' + W.esc(p.nameKo) +
          (p.nameHanja ? '<span class="hanja">' + W.esc(p.nameHanja) + '</span>' : '') + '</h1>' +
        '<p class="detail-sig">' + W.esc(p.signature) + '</p>' +
        '<p class="detail-cap">' + W.esc(isSet
            ? p.items.map(function (id) { return W.product(id).nameKo; }).join(' · ')
            : p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +

        '<div class="buybox">' +
          '<div class="buybox-price">' +
            '<span class="opt-name">' +
              W.esc(v.name) + (stockLine ? ' · ' + stockLine : '') + '</span>' +
            '<strong>' + W.won(v.price) + '</strong>' +
          '</div>' +
          '<div class="field">' +
            '<label for="qty">수량</label>' +
            '<div class="qty">' +
              '<button type="button" id="minus" aria-label="수량 줄이기">−</button>' +
              '<span id="qtyval">1</span>' +
              '<button type="button" id="plus" aria-label="수량 늘리기">+</button>' +
            '</div>' +
          '</div>' +
          '<label class="check"><input type="checkbox" id="gift">' +
            '<span>기프트 포장 (무료) — 전용 리본과 메시지 카드를 함께 보내드립니다</span></label>' +
          '<div class="buy-actions">' +
            '<button class="btn" id="addcart"' + (v.stock === 0 ? ' disabled' : '') + '>장바구니에 담기</button>' +
            '<button class="btn btn-outline" id="buynow"' + (v.stock === 0 ? ' disabled' : '') + '>바로 구매하기</button>' +
          '</div>' +
          '<p class="buybox-note" id="addStatus" role="status" aria-live="polite">' +
            W.esc((W.catalog.shipping && W.catalog.shipping.notice) || '') + '</p>' +
        '</div>' +
      '</div>' +
    '</div></div></section>' +

    /* D3 · 스토리 */
    (p.story && p.story.length ?
    '<section class="statement"><div class="shell shell-narrow"><p class="reveal">' +
      p.story.map(function (l) { return W.esc(l); }).join('<br>') +
      (p.storyLast ? '<br><br><em>' + W.esc(p.storyLast) + '</em>' : '') +
    '</p></div></section>' : '') +

    /* D4 · 향 구조 */
    (isSet ? '' :
    '<section class="section"><div class="shell shell-narrow">' +
      '<div class="sec-head reveal"><span class="sec-num">01</span>' +
        '<h2 class="sec-title">향 구조</h2><span class="sec-en">NOTES</span></div>' +
      '<dl class="notes reveal">' +
        '<div><dt>TOP</dt><dd>' + W.esc(p.notes.top) + '</dd></div>' +
        '<div><dt>HEART</dt><dd>' + W.esc(p.notes.heart) + '</dd></div>' +
        '<div><dt>BASE</dt><dd>' + W.esc(p.notes.base) + '</dd></div>' +
      '</dl>' +
      '<p class="notes-hint reveal">탑 노트는 첫인사입니다. 오래 머무는 것은 베이스 노트입니다.</p>' +
    '</div></section>') +

    /* D5 · 포토 스팟 슬롯 — 이미지가 등록되면 이 자리에 들어간다 */
    '<section class="section section-warm"><div class="shell">' +
      '<div class="sec-head reveal"><span class="sec-num">02</span>' +
        '<h2 class="sec-title">디테일</h2><span class="sec-en">PHOTO SPOTS</span></div>' +
      '<div class="ps-grid reveal">' +
        (p.photoSpots || []).map(function (ps) {
          return '<div class="ps-cell">' + (ps.src
            ? '<img src="' + W.esc(ps.src) + '" alt="' + W.esc(ps.alt) + '">'
            : '<p><span>PS-' + W.esc(ps.slot) + '</span>' + W.esc(ps.role) + '<br>촬영 예정</p>') + '</div>';
        }).join('') +
      '</div>' +
    '</div></section>' +

    /* D6 · 스펙 */
    '<section class="section"><div class="shell shell-narrow">' +
      '<div class="sec-head reveal"><span class="sec-num">03</span>' +
        '<h2 class="sec-title">제품 정보</h2><span class="sec-en">SPECIFICATION</span></div>' +
      '<dl class="spec reveal">' +
        '<div><dt>용량</dt><dd>' + W.esc(v.name) + '</dd></div>' +
        '<div><dt>부향률</dt><dd>20%</dd></div>' +
        '<div><dt>조향</dt><dd>서울향료</dd></div>' +
        '<div><dt>원산지</dt><dd>Made in Korea</dd></div>' +
        (isSet ? '' : '<div><dt>수종 · 층위</dt><dd>' + W.esc(p.species + ' · ' + p.layer) + '</dd></div>') +
        (isSet ? '' : '<div><dt>무드</dt><dd>' + W.esc(p.mood) + '</dd></div>') +
        (isSet ? '' : '<div><dt>추천 공간</dt><dd>' + W.esc(p.spaces.join(' · ')) + '</dd></div>') +
        '<div><dt>구성품</dt><dd>본품 · 리드 스틱 · 싸바리 박스</dd></div>' +
        '<div><dt>SKU</dt><dd>' + W.esc(v.sku) + '</dd></div>' +
        '<div><dt>안전확인 신고번호</dt><dd>등록 후 표기</dd></div>' +
      '</dl>' +
    '</div></section>' +

    /* D7 · 패키지 */
    '<section class="statement"><div class="shell shell-narrow"><p class="reveal">' +
      '열리는 순간까지 설계했습니다.<br><br>' +
      '뚜껑은 한 번에 빠지지 않습니다.<br>공기압에 밀려 스르륵, 천천히 열립니다.<br>' +
      '<em>그 몇 초가 이 제품의 시작입니다.</em>' +
    '</p></div></section>' +

    /* D8 · FAQ */
    '<section class="section"><div class="shell shell-narrow">' +
      '<div class="sec-head reveal"><span class="sec-num">04</span>' +
        '<h2 class="sec-title">자주 묻는 질문</h2><span class="sec-en">FAQ</span></div>' +
      '<div class="faq reveal">' +
        '<details><summary>향이 너무 강합니다</summary><p>부향률 20% 제품입니다. 스틱 개수를 줄이면 발향 강도가 낮아집니다.</p></details>' +
        '<details><summary>얼마나 오래 쓸 수 있나요</summary><p>스틱 개수와 환기량, 공간 크기에 따라 달라집니다.</p></details>' +
        '<details><summary>원목 가구 위에 둬도 되나요</summary><p>원목 표면 착색 테스트를 통과했습니다. 다만 직접 접촉은 피해 주세요.</p></details>' +
        '<details><summary>기프트 포장은 어떻게 되나요</summary><p>전용 리본과 메시지 카드를 함께 보내드립니다. 주문서에서 가격이 표기되지 않은 명세서를 선택하실 수 있습니다.</p></details>' +
      '</div>' +
      '<div class="link-row"><a class="link-line" href="/craft.html">품질 기준 전체 보기 →</a></div>' +
    '</div></section>' +

    /* D9 · 함께 보기 */
    '<section class="section section-warm"><div class="shell">' +
      '<div class="sec-head reveal"><span class="sec-num">05</span>' +
        '<h2 class="sec-title">나무의 다른 층</h2><span class="sec-en">ALSO IN THIS CHAPTER</span></div>' +
      '<div class="product-grid" id="related"></div>' +
    '</div></section>';

  /* 함께 보기 — 같은 컬렉션의 다른 제품 */
  var related = document.getElementById('related');
  var others = W.byCollection(p.collectionId).filter(function (x) { return x.slug !== p.slug; });
  related.innerHTML = others.map(function (x, i) {
    var coming = x.status === 'coming';
    var pr = W.price(x);
    return '<a class="pcard reveal' + (coming ? ' pcard-coming' : '') + '" data-i="' + i + '" href="' +
      (coming ? '/shop.html#notify' : '/product.html?p=' + encodeURIComponent(x.slug)) + '">' +
      '<div class="pcard-visual">' + W.visual(x) + '</div>' +
      '<div class="pcard-body">' +
        '<p class="pcard-num">' + W.esc(x.number) + (coming ? ' · COMING SOON' : '') + '</p>' +
        '<h3 class="pcard-name">' + (coming ? '준비하고 있습니다' : W.esc(x.nameKo)) + '</h3>' +
        '<p class="pcard-sig">' + W.esc(x.signature) + '</p>' +
        '<div class="pcard-foot"><span>' + (coming ? '출시 소식 받기 →' : '자세히 보기 →') + '</span>' +
          (pr ? '<span class="pcard-price">' + W.won(pr) + '</span>' : '') + '</div>' +
      '</div></a>';
  }).join('');

  /* 수량 · 장바구니 */
  var qv = document.getElementById('qtyval');
  document.getElementById('minus').addEventListener('click', function () {
    qty = Math.max(1, qty - 1); qv.textContent = qty;
  });
  document.getElementById('plus').addEventListener('click', function () {
    qty = Math.min(99, qty + 1); qv.textContent = qty;
  });

  function addToCart() {
    W.cart.add(p.slug, v.id, qty, document.getElementById('gift').checked);
    if (window.WHJTrack) window.WHJTrack.addToCart(p.slug);
  }
  document.getElementById('addcart').addEventListener('click', function () {
    addToCart();
    document.getElementById('addStatus').textContent = '장바구니에 담았습니다.';
  });
  document.getElementById('buynow').addEventListener('click', function () {
    addToCart();
    location.href = '/checkout.html';
  });

  W.stagger(related.querySelectorAll('.pcard'));
  W.observe(document.querySelectorAll('.reveal'));
});
