/* 로그인 */
window.WHJ.ready(function () {
  var A = window.WHJAuth;
  var form = document.getElementById('loginForm');
  if (!form || !A) return;

  /* 이미 로그인한 사람이 이 화면에 오면 되돌려 보낸다 */
  A.me().then(function (user) { if (user) location.replace(A.nextUrl()); });

  A.submit(form, function (f) {
    return A.api('/login', {
      method: 'POST',
      body: {
        email: f.elements.email.value.trim(),
        password: f.elements.password.value
      }
    }).then(function () {
      location.href = A.nextUrl();
    });
  });
});
