/* 회원가입

   동의 항목은 한국의 관행대로 필수와 선택을 갈라 둔다.
   "모두 동의"는 편의일 뿐이라, 아래에서 하나를 풀면 위도 같이 풀린다. */
window.WHJ.ready(function () {
  var A = window.WHJAuth;
  var form = document.getElementById('joinForm');
  if (!form || !A) return;

  A.me().then(function (user) { if (user) location.replace('/account.html'); });

  var all = document.getElementById('j-all');
  var boxes = ['j-terms', 'j-privacy', 'j-marketing'].map(function (id) {
    return document.getElementById(id);
  });
  var must = [document.getElementById('j-terms'), document.getElementById('j-privacy')];
  var agreeMsg = document.getElementById('agreeMsg');

  function sync() {
    all.checked = boxes.every(function (b) { return b.checked; });
    if (must.every(function (b) { return b.checked; })) {
      agreeMsg.textContent = '';
      agreeMsg.parentNode.classList.remove('has-error');
    }
  }
  all.addEventListener('change', function () {
    boxes.forEach(function (b) { b.checked = all.checked; });
    sync();
  });
  boxes.forEach(function (b) { b.addEventListener('change', sync); });

  A.submit(form, function (f) {
    var pw = f.elements.password.value;

    if (pw !== f.elements.password2.value) {
      var e = new Error('두 번 적은 비밀번호가 서로 다릅니다.');
      e.field = 'password2';
      throw e;
    }
    if (!must.every(function (b) { return b.checked; })) {
      agreeMsg.textContent = '필수 항목에 동의해 주셔야 가입할 수 있습니다.';
      agreeMsg.parentNode.classList.add('has-error');
      agreeMsg.scrollIntoView({ block: 'center', behavior: 'smooth' });
      throw new Error('');
    }

    return A.api('/join', {
      method: 'POST',
      body: {
        name: f.elements.name.value.trim(),
        email: f.elements.email.value.trim(),
        phone: f.elements.phone.value.trim(),
        password: pw,
        agreeTerms: must[0].checked,
        agreePrivacy: must[1].checked,
        marketing: document.getElementById('j-marketing').checked
      }
    }).then(function () {
      /* 가입과 동시에 로그인된 상태다. 담아 둔 것이 있으면 장바구니로 보낸다. */
      var cart = window.WHJ && window.WHJ.cart ? window.WHJ.cart.read() : [];
      location.href = cart.length ? '/cart.html' : '/account.html';
    });
  });

  /* 빈 메시지는 화면에 띄우지 않는다 (위에서 이미 안내했을 때) */
  var origAlert = A.alert;
  A.alert = function (f, msg, kind) { if (msg) origAlert(f, msg, kind); };
});
