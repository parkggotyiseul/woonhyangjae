/* ?댄뼢????spaces ?섏씠吏
   CSP(script-src 'self')瑜?吏?ㅺ린 ?꾪빐 ?몃씪???ㅽ겕由쏀듃瑜??곗? ?딅뒗?? */
document.addEventListener('DOMContentLoaded', function () {
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
      '<div>' + W.bottle(p) + '</div>' +
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

  /* 공간별 · 무드별 목록 */
  document.getElementById('by-space').innerHTML = cur.spaces.map(function (s) {
    return '<li><h4>' + W.esc(s.ko) + ' · ' + W.esc(s.en) + '</h4><p>' + W.esc(s.desc) +
      '<br><span class="accent">추천 — ' +
      W.esc(s.recommend.map(name).join(' · ')) + '</span></p></li>';
  }).join('');

  document.getElementById('by-mood').innerHTML = cur.moods.map(function (m) {
    return '<li><h4>' + W.esc(m.ko) + '</h4><p>' + W.esc(m.desc) +
      '<br><span class="accent">추천 — ' +
      W.esc(m.recommend.map(name).join(' · ')) + '</span></p></li>';
  }).join('');
});
