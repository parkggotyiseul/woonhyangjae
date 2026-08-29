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

  /* ── 휴대폰 본인확인 ──────────────────────────────────
     문자 발송이 연결돼 있을 때만 이 칸이 나타난다.
     아직 연결 전이면 지금처럼 번호만 받고 넘어간다. */
  var phone = document.getElementById('j-phone');
  var sendBtn = document.getElementById('sendCode');
  var codeField = document.getElementById('codeField');
  var codeInput = document.getElementById('j-code');
  var checkBtn = document.getElementById('checkCode');
  var codeHint = document.getElementById('codeHint');
  var verifyToken = '';
  var required = false;
  var timer = null;

  fetch('/api/auth/verify/state', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      required = !!(j && j.required);
      if (required) sendBtn.hidden = false;
    })
    .catch(function () {});

  function digits(v) { return String(v || '').replace(/[^0-9]/g, ''); }

  /* 번호를 고치면 앞서 받은 인증은 무효가 된다 */
  phone.addEventListener('input', function () {
    if (!verifyToken) return;
    verifyToken = '';
    phone.readOnly = false;
    codeField.hidden = true;
    sendBtn.hidden = !required;
    sendBtn.textContent = '인증번호 받기';
    sendBtn.disabled = false;
    form.classList.remove('is-verified');
  });

  sendBtn.addEventListener('click', function () {
    if (A.checkField(phone)) { phone.focus(); return; }
    sendBtn.disabled = true;
    sendBtn.textContent = '보내는 중…';

    A.api('/verify/send', { method: 'POST', body: { phone: digits(phone.value) } })
      .then(function (j) {
        codeField.hidden = false;
        codeInput.value = '';
        codeInput.focus();
        countdown((j.minutes || 5) * 60);
        sendBtn.textContent = '다시 받기';
        A.say(phone, '');
      })
      .catch(function (e) {
        A.say(phone, e.message);
        sendBtn.textContent = '인증번호 받기';
      })
      .then(function () { sendBtn.disabled = false; });
  });

  function countdown(sec) {
    clearInterval(timer);
    timer = setInterval(function () {
      sec -= 1;
      if (sec <= 0) {
        clearInterval(timer);
        codeHint.textContent = '시간이 지났습니다. 다시 받아 주세요.';
        return;
      }
      var m = Math.floor(sec / 60), r = sec % 60;
      codeHint.textContent = m + ':' + (r < 10 ? '0' : '') + r + ' 안에 입력해 주세요.';
    }, 1000);
    codeHint.textContent = '문자를 보내 드렸습니다.';
  }

  checkBtn.addEventListener('click', function () {
    var code = digits(codeInput.value);
    if (code.length !== 6) { A.say(codeInput, '여섯 자리를 넣어 주세요.'); return; }
    checkBtn.disabled = true;

    A.api('/verify/check', { method: 'POST', body: { phone: digits(phone.value), code: code } })
      .then(function (j) {
        verifyToken = j.verifyToken;
        clearInterval(timer);
        codeField.hidden = true;
        sendBtn.hidden = true;
        phone.readOnly = true;
        form.classList.add('is-verified');
        A.say(phone, '');
        A.say(codeInput, '');
      })
      .catch(function (e) { A.say(codeInput, e.message); })
      .then(function () { checkBtn.disabled = false; });
  });

  A.submit(form, function (f) {
    var pw = f.elements.password.value;

    if (pw !== f.elements.password2.value) {
      var e = new Error('두 번 적은 비밀번호가 서로 다릅니다.');
      e.field = 'password2';
      throw e;
    }
    if (required && !verifyToken) {
      var v = new Error('휴대폰 인증을 먼저 마쳐 주세요.');
      v.field = 'phone';
      throw v;
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
        verifyToken: verifyToken,
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
