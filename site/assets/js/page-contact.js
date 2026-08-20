/* 운향재 — 문의 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ, b = (W && W.catalog.brand) || {};

  /* 자주 묻는 질문 — 카탈로그의 faq 를 그대로 그린다 */
  var faqBox = document.getElementById('faqList');
  if (faqBox) {
    faqBox.innerHTML = (W.catalog.faq || []).map(function (f) {
      return '<details><summary>' + W.esc(f.q) + '</summary><p>' + W.esc(f.a) + '</p></details>';
    }).join('');
  }

  /* /contact.html#faq 처럼 들어오면 해당 탭을 연다 */
  var wanted = (location.hash || '').replace('#', '');
  if (wanted) {
    var btn = document.querySelector('.tabbar button[data-tab="' + wanted + '"]');
    if (btn) btn.click();
  }

  /* 사업자 정보 */
  var info = document.getElementById('bizinfo');
  if (info) {
    info.innerHTML =
      '<div><dt>상호</dt><dd>' + W.esc(b.company) + '</dd></div>' +
      '<div><dt>대표자</dt><dd>' + W.esc(b.ceo) + '</dd></div>' +
      '<div><dt>브랜드</dt><dd>운향재 雲香齋</dd></div>' +
      '<div><dt>사업자등록번호</dt><dd>' + W.esc(b.bizNumber) + '</dd></div>' +
      '<div><dt>통신판매업 신고</dt><dd>' + W.esc(b.mailOrderNumber) + '</dd></div>' +
      '<div><dt>주소</dt><dd>' + W.esc(b.address) + '</dd></div>' +
      '<div><dt>이메일</dt><dd>' + W.esc(b.email) + '</dd></div>';
  }

  /* B2B 항목 토글 — spaces.html에서 ?type=b2b 로 넘어오면 미리 선택된다 */
  var type = document.getElementById('f-type');
  var b2b = document.getElementById('b2bBlock');
  var q = new URLSearchParams(location.search).get('type');
  if (q) type.value = q;
  var sync = function () { b2b.hidden = !(type.value === 'b2b' || type.value === 'wholesale'); };
  type.addEventListener('change', sync);
  sync();

  /* 폼 — 백엔드가 붙기 전까지는 메일 클라이언트로 넘긴다.
     2단계에서 이 핸들러만 API 호출로 교체하면 된다. */
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  /* 어느 칸이 비었는지 그 칸 아래에 바로 알려 준다.
     예전에는 안내 문구가 폼 맨 아래에만 떠서, 화면 밖에 있으면
     눌러도 아무 일이 없는 것처럼 보였다. */
  function mark(name, message) {
    var input = form.elements[name];
    if (!input) return null;
    var box = input.closest('.field') || input.parentNode;
    box.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    var msg = box.querySelector('.field-msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'field-msg';
      box.appendChild(msg);
    }
    msg.textContent = message;
    return input;
  }
  function clearMarks() {
    form.querySelectorAll('.has-error').forEach(function (b) { b.classList.remove('has-error'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }
  /* 다시 입력하기 시작하면 그 칸의 경고를 지운다 */
  form.addEventListener('input', function (e) {
    var box = e.target.closest && e.target.closest('.has-error');
    if (box) {
      box.classList.remove('has-error');
      var i = box.querySelector('[aria-invalid]');
      if (i) i.removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMarks();
    status.textContent = '';

    var bad = null;
    var checks = [
      ['name', '성함을 입력해 주세요.', function (v) { return v !== ''; }],
      ['email', '연락받으실 이메일 주소를 정확히 입력해 주세요.',
        function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }],
      ['message', '문의하실 내용을 입력해 주세요.', function (v) { return v !== ''; }]
    ];
    checks.forEach(function (c) {
      var v = (form.elements[c[0]].value || '').trim();
      if (!c[2](v)) {
        var el = mark(c[0], c[1]);
        if (!bad) bad = el;
      }
    });

    if (!form.elements.agree.checked) {
      var agreeBox = form.elements.agree.closest('.check');
      if (agreeBox) agreeBox.classList.add('has-error');
      if (!bad) bad = form.elements.agree;
    }

    if (bad) {
      status.textContent = form.elements.agree.checked
        ? '입력하지 않은 칸이 있습니다.'
        : '입력 내용과 개인정보 동의를 확인해 주세요.';
      /* 문제가 있는 칸으로 화면을 옮겨 준다 */
      bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { try { bad.focus({ preventScroll: true }); } catch (err) { bad.focus(); } }, 320);
      return;
    }

    /* 문의는 서버로 접수된다. 관리자 화면의 문의 탭에서 바로 확인할 수 있다. */
    var payload = {
      type: type.value,
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim()
    };
    if (!b2b.hidden) {
      payload.company = form.elements.company.value.trim();
      payload.space = form.elements.space.value;
      payload.quantity = form.elements.quantity.value;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = '보내는 중입니다…';

    W.api('/inquiries', { method: 'POST', body: payload })
      .then(function () {
        clearMarks();
        form.reset();
        b2b.hidden = true;
        status.textContent = '문의가 접수되었습니다. 영업일 기준 2일 내에 회신드리겠습니다.';
        if (window.WHJTrack) window.WHJTrack.event('inquiry');
      })
      .catch(function (err) {
        var to = (type.value === 'b2b' || type.value === 'wholesale') ? b.b2bEmail : b.email;
        status.textContent = '접수하지 못했습니다. ' + to + ' 로 보내 주시면 확인하겠습니다.';
      })
      .then(function () { btn.disabled = false; });
  });
});
