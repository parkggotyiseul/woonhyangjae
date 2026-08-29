/* 운향재 — 컬렉션 페이지

   화면은 두 덩어리다.
     1) 지금 열린 장      — 접었다 펴는 목록. 진행 중인 장만 처음부터 열려 있다.
     2) 아직 오지 않은 장 — 다음 차례 예고 둘과, 비워 둔 자리들.

   비워 둔 장(reveal:"veiled")은 목록에 넣지 않는다. 이름도 한자도 내보내지
   않고, 아래 '아직 오지 않은 장'에서 빈 인장으로만 자리를 지킨다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;

  /* ── 1. 지금 열린 장 ─────────────────────────────── */

  function productBlock(p) {
    if (p.status === 'coming') {
      return '<div class="pick">' +
        '<h3>' + W.esc(p.number) + ' · 준비하고 있습니다</h3>' +
        '<p>' + W.esc(p.signature) + '<br>' + W.esc(p.layer) + '</p>' +
        '<p class="rec"><a href="/shop.html#notify">출시 소식 받기 →</a></p>' +
      '</div>';
    }
    return '<div class="pick">' +
      '<h3>' + W.esc(p.number) + ' · ' + W.esc(p.nameKo) +
        (p.nameHanja ? ' <span class="opt-name">' + W.esc(p.nameHanja) + '</span>' : '') + '</h3>' +
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

  var acc = document.getElementById('chapterAcc');
  if (acc) {
    acc.innerHTML = W.namedChapters().map(function (c) {
      var open = W.revealOf(c) === 'open';
      var items = open ? W.byCollection(c.id) : [];
      var onsale = items.filter(function (x) { return x.status === 'onsale'; });

      var body = open
        ? '<p class="sec-lede">' + W.esc(c.description) + '</p>' +
          '<div class="pick-list">' + items.map(productBlock).join('') + '</div>' +
          onsale.map(detailBlock).join('')
        : '<p class="sec-lede">' + W.esc(c.description) + '</p>' +
          '<p class="notice">향은 아직 짓지 않았습니다. 한 장을 온전히 마친 뒤에 다음 장으로 넘어갑니다.</p>' +
          '<div class="link-row"><a class="link-line" href="/shop.html#notify">이 장이 열릴 때 알려드립니다 →</a></div>';

      return '<div class="acc-item' + (open ? ' is-open' : '') + '" data-acc="' + W.esc(c.id) + '">' +
        '<button class="acc-head" type="button" data-acc-toggle="' + W.esc(c.id) + '"' +
          ' aria-expanded="' + (open ? 'true' : 'false') + '">' +
          '<span class="acc-hanja">' + W.esc(c.hanja) + '</span>' +
          '<span>' +
            '<span class="acc-title">' + W.esc(c.code) + ' · ' + W.esc(c.ko) +
              (c.title ? ' — ' + W.esc(c.title) : '') + '</span>' +
            '<span class="acc-sub">' + W.esc(c.subtitle || '') +
              ' · ' + W.esc(c.statusLabel || (open ? '진행중' : '준비 중')) +
              (items.length ? ' · ' + items.length + '종' : '') + '</span>' +
          '</span>' +
          '<span class="acc-sign" aria-hidden="true">+</span>' +
        '</button>' +
        '<div class="acc-body">' + body + '</div>' +
      '</div>';
    }).join('');

    acc.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-acc-toggle]');
      if (!btn) return;
      var item = btn.closest('.acc-item');
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      if (open) W.observe(item.querySelectorAll('.reveal'));
    });
  }

  /* ── 2. 아직 오지 않은 장 ────────────────────────── */

  var NUM = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱'];
  function ko(n) { return NUM[n - 1] || String(n); }

  /* 조사는 앞 글자에 받침이 있는지로 갈린다. 하나"가" / 둘"이", 하나"는" / 둘"은".
     장의 수가 바뀌어도 문장이 어색해지지 않도록 여기서 고른다. */
  function josa(word, withBatchim, withoutBatchim) {
    var last = word.charCodeAt(word.length - 1) - 0xAC00;
    var has = last >= 0 && last <= 11171 && last % 28 !== 0;
    return word + (has ? withBatchim : withoutBatchim);
  }

  var next = W.namedChapters().filter(function (c) { return W.revealOf(c) === 'named'; });
  var veiled = W.veiledChapters();

  var nextHost = document.getElementById('nextChapters');
  if (nextHost) {
    nextHost.innerHTML = next.map(function (c, i) {
      return '<article class="ahead' + (i === 0 ? ' is-next' : '') + '">' +
        '<p class="ahead-num">' + W.esc(c.code) + ' · ' + W.esc(c.en) + '</p>' +
        '<div class="ahead-hanja" aria-hidden="true">' + W.esc(c.hanja) + '</div>' +
        '<h3 class="ahead-name">' + W.esc(c.ko) +
          (c.title ? '<span class="ahead-title">' + W.esc(c.title) + '</span>' : '') + '</h3>' +
        '<p class="ahead-desc">' + W.esc(c.description || c.teaser || '') + '</p>' +
        '<p class="ahead-state">' + W.esc(c.statusLabel || '준비 중') + '</p>' +
      '</article>';
    }).join('');
  }

  var veilHost = document.getElementById('veiledRow');
  if (veilHost) {
    veilHost.innerHTML = veiled.map(function () {
      return '<div class="veil"><span class="veil-seal" aria-hidden="true"></span></div>';
    }).join('');
    veilHost.setAttribute('aria-label', '아직 이름을 붙이지 않은 ' + veiled.length + '개의 장');
  }

  /* 문장 속 숫자는 데이터에서 뽑는다. 장을 하나 열면 문장도 따라 바뀐다. */
  var countLine = document.getElementById('chapterCount');
  if (countLine) {
    var named = W.namedChapters().length;
    countLine.textContent = veiled.length
      ? '일곱 개의 장 가운데 ' + josa(ko(named), '이', '가') + ' 이름을 얻었습니다. ' +
        '나머지 ' + josa(ko(veiled.length), '은', '는') + ' 비워 두었습니다.'
      : '일곱 개의 장이 모두 이름을 얻었습니다.';
  }

  W.observe(document.querySelectorAll('.reveal'));
});
