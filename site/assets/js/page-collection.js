/* 운향재 — 컬렉션 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
/* 진행 중인 컬렉션을 순서대로 펼친다.
   컬렉션 02 水를 열 때는 catalog.js에서 status를 active로 바꾸고 제품을 등록하면 끝이다. */
document.addEventListener('DOMContentLoaded', function () {
  var W = window.WHJ;
  if (!W) return;
  var host = document.getElementById('active-collections');
  var upcoming = document.getElementById('upcoming');

  var actives = W.collections.filter(function (c) { return c.status === 'active'; });

  host.innerHTML = actives.map(function (c) {
    var items = W.byCollection(c.id);
    var onsale = items.filter(function (p) { return p.status === 'onsale'; });

    var head =
      '<div class="sec-head reveal">' +
        '<span class="sec-num">' + W.esc(c.code) + '</span>' +
        '<h2 class="sec-title">' + W.esc(c.hanja) + ' ' + W.esc(c.ko) + ' — ' + W.esc(c.title || c.subtitle) + '</h2>' +
        '<span class="sec-en">' + W.esc(c.titleEn || c.en) + '</span>' +
      '</div>' +
      '<p class="sec-lede reveal">' + W.esc(c.description) + '</p>';

    var grid = '<div class="product-grid reveal" id="grid-' + W.esc(c.id) + '"></div>';

    /* 제품별 2화면 구조 — 감성 먼저, 정보 나중 */
    var details = onsale.map(function (p) {
      return '<section class="section"><div class="shell"><div class="detail">' +
        '<div class="detail-visual reveal">' + W.bottle(p) +
          '<p class="ps-caption">PS-01 · ' + W.esc(p.photoSpots[0] ? p.photoSpots[0].role : '') + '</p>' +
        '</div>' +
        '<div class="reveal">' +
          '<p class="detail-num">' + W.esc(p.number) + '</p>' +
          '<h3 class="detail-name">' + W.esc(p.nameKo) +
            (p.nameHanja ? '<span class="hanja">' + W.esc(p.nameHanja) + '</span>' : '') + '</h3>' +
          '<p class="detail-sig">' + W.esc(p.signature) + '</p>' +
          '<p class="detail-cap">' + W.esc(p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +
          '<div class="detail-story">' +
            p.story.map(function (l) { return '<p>' + W.esc(l) + '</p>'; }).join('') +
            '<p class="last">' + W.esc(p.storyLast) + '</p>' +
          '</div>' +
          '<dl class="notes">' +
            '<div><dt>TOP</dt><dd>' + W.esc(p.notes.top) + '</dd></div>' +
            '<div><dt>HEART</dt><dd>' + W.esc(p.notes.heart) + '</dd></div>' +
            '<div><dt>BASE</dt><dd>' + W.esc(p.notes.base) + '</dd></div>' +
          '</dl>' +
          '<p class="notes-hint">탑 노트는 첫인사입니다. 오래 머무는 것은 베이스 노트입니다.</p>' +
          '<dl class="spec">' +
            '<div><dt>무드</dt><dd>' + W.esc(p.mood) + '</dd></div>' +
            '<div><dt>추천 공간</dt><dd>' + W.esc(p.spaces.join(' · ')) + '</dd></div>' +
            '<div><dt>부향률</dt><dd>20%</dd></div>' +
            '<div><dt>조향</dt><dd>서울향료</dd></div>' +
          '</dl>' +
          '<div class="link-row">' +
            '<a class="link-line" href="/product.html?p=' + encodeURIComponent(p.slug) + '">구매하기 →</a>' +
          '</div>' +
        '</div>' +
      '</div></div></section>';
    }).join('');

    return '<section class="section"><div class="shell">' + head + grid + '</div></section>' + details;
  }).join('');

  /* 카드 그리드 채우기 */
  actives.forEach(function (c) {
    W.renderProducts(document.getElementById('grid-' + c.id), { collectionId: c.id, base: '/product.html' });
  });

  /* 아직 오지 않은 장 — 링크를 걸지 않는다 */
  upcoming.innerHTML = W.collections.filter(function (c) { return c.status !== 'active'; })
    .map(function (c) {
      return '<li><h4>' + W.esc(c.hanja) + ' ' + W.esc(c.ko) + ' — ' + W.esc(c.subtitle) + '</h4>' +
        '<p>' + W.esc(c.description) + '</p></li>';
    }).join('');

  W.observe(document.querySelectorAll('.reveal'));
});
