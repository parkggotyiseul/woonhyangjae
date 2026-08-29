/* 새 비밀번호 정하기 — 주소에 실린 토큰이 살아 있을 때만 */
window.WHJ.ready(function () {
  var A = window.WHJAuth;
  var form = document.getElementById('resetForm');
  var bad = document.getElementById('resetBad');
  var done = document.getElementById('resetDone');
  if (!form || !A) return;

  var token = new URLSearchParams(location.search).get('t') || '';

  fetch('/api/auth/reset?t=' + encodeURIComponent(token), { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.ok) { form.hidden = false; document.getElementById('r-pw').focus(); }
      else bad.hidden = false;
    })
    .catch(function () { bad.hidden = false; });

  A.submit(form, function (f) {
    var pw = f.elements.password.value;
    if (pw !== f.elements.password2.value) {
      var e = new Error('두 번 적은 비밀번호가 서로 다릅니다.');
      e.field = 'password2';
      throw e;
    }
    return A.api('/reset', { method: 'POST', body: { token: token, password: pw } })
      .then(function () { form.hidden = true; done.hidden = false; });
  });
});
