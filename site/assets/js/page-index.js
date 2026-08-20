/* ?댄뼢????index ?섏씠吏
   CSP(script-src 'self')瑜?吏?ㅺ린 ?꾪빐 ?몃씪???ㅽ겕由쏀듃瑜??곗? ?딅뒗?? */
/* S6 · S7 — 제품 서사 섹션. 카탈로그에 제품을 추가하면 자동으로 늘어난다. */
document.addEventListener('DOMContentLoaded', function () {
  var W = window.WHJ, host = document.getElementById('stories');
  if (!W || !host) return;
  var onsale = W.byCollection('wood').filter(function (p) { return p.status === 'onsale'; });

  host.innerHTML = onsale.map(function (p, i) {
    var flip = i % 2 === 1;
    return '<section class="section' + (flip ? ' section-warm' : '') + '">' +
      '<div class="shell"><div class="detail">' +
        (flip ? '' : '<div class="detail-visual reveal">' + W.bottle(p) + '</div>') +
        '<div class="reveal">' +
          '<p class="detail-num">' + W.esc(p.number) + '</p>' +
          '<h2 class="detail-name">' + W.esc(p.nameKo) +
            (p.nameHanja ? '<span class="hanja">' + W.esc(p.nameHanja) + '</span>' : '') + '</h2>' +
          '<p class="detail-sig">' + W.esc(p.signature) + '</p>' +
          '<p class="detail-cap">' + W.esc(p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +
          '<div class="detail-story">' +
            p.story.map(function (l) { return '<p>' + W.esc(l) + '</p>'; }).join('') +
            '<p class="last">' + W.esc(p.storyLast) + '</p>' +
          '</div>' +
          '<div class="link-row">' +
            '<a class="link-line" href="/product.html?p=' + encodeURIComponent(p.slug) + '">향 구조 보기 →</a>' +
            '<a class="link-line" href="/product.html?p=' + encodeURIComponent(p.slug) + '#buy">구매하기 →</a>' +
          '</div>' +
        '</div>' +
        (flip ? '<div class="detail-visual reveal">' + W.bottle(p) + '</div>' : '') +
      '</div></div>' +
    '</section>';
  }).join('');

  W.observe(host.querySelectorAll('.reveal'));
});
