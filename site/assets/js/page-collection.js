/* 운향재 — 컬렉션 페이지
   일곱 개의 장을 접어 두고, 누르면 그 장만 펼친다.
   처음부터 다 펼쳐 두면 어느 장이 진행 중인지 묻히기 때문이다.
   진행 중인 장은 처음부터 열려 있고, 아직 오지 않은 장은 열리지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;
  var host = document.getElementById('chapterAcc');
  if (!host) return;

  function productBlock(p) {
    if (p.status === 'coming') {
      return '<div class="pick">' +
        '<h4>' + W.esc(p.number) + ' · 준비하고 있습니다</h4>' +
        '<p>' + W.esc(p.signature) + '<br>' + W.esc(p.layer) + '</p>' +
        '<p class="rec"><a href="/shop.html#notify">출시 소식 받기 →</a></p>' +
      '</div>';
    }
    return '<div class="pick">' +
      '<h4>' + W.esc(p.number) + ' · ' + W.esc(p.nameKo) +
        (p.nameHanja ? ' <span class="opt-name">' + W.esc(p.nameHanja) + '</span>' : '') + '</h4>' +
      '<p>' + W.esc(p.signature) + '<br>' +
        W.esc(p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +
      '<p class="rec"><a href="/product.html?p=' + encodeURIComponent(p.slug) + '">자세히 보기 →</a></p>' +
    '</div>';
  }

  function detailBlock(p) {
    return '<div class="detail mt-sec">' +
      '<div class="detail-visual">' + W.visual(p, '01') + '</div>' +
      '<div>' +
        '<p class="detail-num">' + W.esc(p.number) + '</p>' +
        '<h3 class="detail-name">' + W.esc(p.nameKo) +
          (p.nameHanja ? '<span class="hanja">' + W.esc(p.nameHanja) + '</span>' : '') + '</h3>' +
        '<p class="detail-sig">' + W.esc(p.signature) + '</p>' +
        '<p class="detail-cap">' + W.esc(p.caption + ' · ' + p.species + ' · ' + p.layer) + '</p>' +
        '<div class="detail-story">' +
          (p.story || []).map(function (l) { return '<p>' + W.esc(l) + '</p>'; }).join('') +
          (p.storyLast ? '<p class="last">' + W.esc(p.storyLast) + '</p>' : '') +
        '</div>' +
        '<dl class="notes">' +
          '<div><dt>TOP</dt><dd>' + W.esc(p.notes.top) + '</dd></div>' +
          '<div><dt>HEART</dt><dd>' + W.esc(p.notes.heart) + '</dd></div>' +
          '<div><dt>BASE</dt><dd>' + W.esc(p.notes.base) + '</dd></div>' +
        '</dl>' +
        '<dl class="spec">' +
          '<div><dt>무드</dt><dd>' + W.esc(p.mood) + '</dd></div>' +
          '<div><dt>추천 공간</dt><dd>' + W.esc((p.spaces || []).join(' · ')) + '</dd></div>' +
          '<div><dt>부향률</dt><dd>20%</dd></div>' +
        '</dl>' +
        '<div class="link-row">' +
          '<a class="link-line" href="/product.html?p=' + encodeURIComponent(p.slug) + '">구매하기 →</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  host.innerHTML = W.collections.map(function (c) {
    var items = W.byCollection(c.id);
    var onsale = items.filter(function (x) { return x.status === 'onsale'; });
    var active = c.status === 'active';

    var body = active
      ? '<p class="sec-lede">' + W.esc(c.description) + '</p>' +
        '<div class="pick-list">' + items.map(productBlock).join('') + '</div>' +
        onsale.map(detailBlock).join('')
      : '<p class="sec-lede">' + W.esc(c.description) + '</p>' +
        '<p class="notice">아직 준비 중인 장입니다. 한 장을 온전히 마친 뒤에 다음 장으로 넘어갑니다.</p>';

    return '<div class="acc-item' + (active ? ' is-open' : ' is-locked') + '" data-acc="' + W.esc(c.id) + '">' +
      '<button class="acc-head" type="button" data-acc-toggle="' + W.esc(c.id) + '"' +
        ' aria-expanded="' + (active ? 'true' : 'false') + '">' +
        '<span class="acc-hanja">' + W.esc(c.hanja) + '</span>' +
        '<span>' +
          '<span class="acc-title">' + W.esc(c.code) + ' · ' + W.esc(c.ko) +
            (c.title ? ' — ' + W.esc(c.title) : '') + '</span>' +
          '<span class="acc-sub">' + W.esc(c.subtitle || '') +
            ' · ' + W.esc(active ? '진행중' : '준비 중') +
            (items.length ? ' · ' + items.length + '종' : '') + '</span>' +
        '</span>' +
        '<span class="acc-sign" aria-hidden="true">+</span>' +
      '</button>' +
      '<div class="acc-body">' + body + '</div>' +
    '</div>';
  }).join('');

  host.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-acc-toggle]');
    if (!btn) return;
    var item = btn.closest('.acc-item');
    var open = item.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
    if (open) W.observe(item.querySelectorAll('.reveal'));
  });

  W.observe(document.querySelectorAll('.reveal'));
});
