/* 운향재 — 문의 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
document.addEventListener('DOMContentLoaded', function () {
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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    [['name', '성함'], ['email', '이메일'], ['message', '내용']].forEach(function (f) {
      var el = form.elements[f[0]];
      var ok = el.value.trim() !== '' &&
        (f[0] !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = el;
    });
    if (bad) { status.textContent = '성함 · 이메일 · 내용을 확인해 주세요.'; bad.focus(); return; }
    if (!form.elements.agree.checked) { status.textContent = '개인정보 수집 및 이용에 동의해 주세요.'; return; }

    var label = type.options[type.selectedIndex].text;
    var to = (type.value === 'b2b' || type.value === 'wholesale') ? b.b2bEmail : b.email;
    var body = [
      '유형: ' + label,
      '성함: ' + form.elements.name.value.trim(),
      '연락처: ' + form.elements.phone.value.trim(),
      '이메일: ' + form.elements.email.value.trim()
    ];
    if (!b2b.hidden) {
      body.push('회사명·공간명: ' + form.elements.company.value.trim());
      body.push('공간 유형: ' + form.elements.space.value);
      body.push('예상 수량: ' + form.elements.quantity.value);
    }
    body.push('', form.elements.message.value.trim());

    status.textContent = '메일 작성 창을 엽니다. 열리지 않으면 ' + to + ' 로 보내 주세요.';
    location.href = 'mailto:' + to +
      '?subject=' + encodeURIComponent('[운향재 문의] ' + label + ' — ' + form.elements.name.value.trim()) +
      '&body=' + encodeURIComponent(body.join('\n'));
  });
});
