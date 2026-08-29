/* 운향재 — 공간 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;
  var cur = (W.catalog.curation) || { spaces: [], moods: [] };
  var pick = { space: null, mood: null, company: null };

  function name(slug) { var p = W.product(slug); return p ? p.nameKo : slug; }

  /* Q1 · Q2 는 카탈로그에서 생성된다 — 제품이 늘어도 그대로 동작한다 */
  document.getElementById('q1').innerHTML = cur.spaces.map(function (s) {
    return '<button class="choice" type="button" data-v="' + W.esc(s.id) + '">' + W.esc(s.ko) +
      '<small>' + W.esc(s.en) + '</small></button>';
  }).join('');
  document.getElementById('q2').innerHTML = cur.moods.map(function (m) {
    return '<button class="choice" type="button" data-v="' + W.esc(m.id) + '">' + W.esc(m.ko) + '</button>';
  }).join('');

  function wire(id, key) {
    var box = document.getElementById(id);
    box.addEventListener('click', function (e) {
      var btn = e.target.closest('.choice');
      if (!btn) return;
      box.querySelectorAll('.choice').forEach(function (b) { b.classList.remove('is-picked'); });
      btn.classList.add('is-picked');
      pick[key] = btn.getAttribute('data-v');
      render();
    });
  }
  wire('q1', 'space'); wire('q2', 'mood'); wire('q3', 'company');

  function render() {
    var host = document.getElementById('result');
    if (!pick.space || !pick.mood || !pick.company) {
      host.innerHTML = '';
      return;
    }
    /* 세 답의 추천이 겹치는 제품을 고른다. 겹치지 않으면 공간 추천을 우선한다. */
    var score = {};
    function add(list, w) { (list || []).forEach(function (s) { score[s] = (score[s] || 0) + w; }); }
    var sp = cur.spaces.filter(function (s) { return s.id === pick.space; })[0];
    var md = cur.moods.filter(function (m) { return m.id === pick.mood; })[0];
    add(sp && sp.recommend, 2);
    add(md && md.recommend, 1.5);
    add(pick.company === 'alone' ? ['neuru'] : ['mukhyanghun'], 1);

    var best = null, bestScore = -1;
    Object.keys(score).forEach(function (k) { if (score[k] > bestScore) { bestScore = score[k]; best = k; } });
    var p = W.product(best);
    if (!p) { host.innerHTML = ''; return; }

    var reason = sp ? sp.desc : '';
    host.innerHTML = '<div class="result">' +
      '<div>' + W.visual(p) + '</div>' +
      '<div>' +
        '<p class="detail-num">' + W.esc(p.number) + '</p>' +
        '<h3 class="detail-name mt-xs">' + W.esc(p.nameKo) +
          (p.nameHanja ? '<span class="hanja">' + W.esc(p.nameHanja) + '</span>' : '') + '</h3>' +
        '<p class="detail-sig">' + W.esc(p.signature) + '</p>' +
        '<p class="result-reason">' + W.esc(reason) + '</p>' +
        '<div class="link-row mt-3">' +
          '<a class="link-line" href="/product.html?p=' + encodeURIComponent(p.slug) + '">자세히 보기 →</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* 공간 · 분위기 · 성향 — 카드 한 장에 추천과 바로가기까지 담는다 */
  function recLinks(slugs) {
    return (slugs || []).map(function (s) {
      var p = W.product(s);
      if (!p) return W.esc(s);
      return '<a href="/product.html?p=' + encodeURIComponent(p.slug) + '">' + W.esc(p.nameKo) + '</a>';
    }).join(' · ');
  }
  function cards(list, titleFn) {
    return list.map(function (x) {
      return '<div class="pick">' +
        '<h3>' + titleFn(x) + '</h3>' +
        '<p>' + W.esc(x.desc) + '</p>' +
        '<p class="rec">추천 — ' + recLinks(x.recommend) + '</p>' +
      '</div>';
    }).join('');
  }

  document.getElementById('by-space').innerHTML =
    cards(cur.spaces, function (s) { return W.esc(s.ko) + ' <span class="opt-name">' + W.esc(s.en) + '</span>'; });

  document.getElementById('by-mood').innerHTML =
    cards(cur.moods, function (m) { return W.esc(m.ko); });

  var typeBox = document.getElementById('by-type');
  if (typeBox) {
    typeBox.innerHTML = cards(cur.types || [], function (t) { return W.esc(t.ko); });
  }
});
