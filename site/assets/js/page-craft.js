/* 운향재 — 품질 페이지
   전문가 그룹(조향 · 충전 · 패키지)을 카탈로그에서 그린다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;
  var host = document.getElementById('makersGrid');
  if (!host) return;

  var list = W.catalog.partners || [];
  host.innerHTML = list.map(function (m) {
    return '<div class="maker">' +
      '<p class="maker-step">' + W.esc(m.step) + ' · ' + W.esc(m.ko) + '</p>' +
      '<h3>' + W.esc(m.title) + '</h3>' +
      '<p class="lead">' + W.esc(m.lead) + '</p>' +
      '<p class="body">' + W.esc(m.body) + '</p>' +
    '</div>';
  }).join('');
});
