/* 비밀번호 재설정 요청 */
window.WHJ.ready(function () {
  var A = window.WHJAuth;
  var form = document.getElementById('forgotForm');
  var done = document.getElementById('forgotDone');
  if (!form || !A) return;

  A.submit(form, function (f) {
    return A.api('/forgot', {
      method: 'POST',
      body: { email: f.elements.email.value.trim() }
    }).then(function () {
      /* 가입 여부를 알려 주지 않는다. 어느 쪽이든 같은 화면을 보여 준다. */
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });
});
