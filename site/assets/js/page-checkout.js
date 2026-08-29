/* 운향재 — 주문서 페이지
   CSP(script-src 'self')를 지키기 위해 인라인 스크립트를 쓰지 않는다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  if (!W) return;
  var root = document.getElementById('checkout-root');
  var t = W.cart.totals();

  if (!t.lines.length) {
    root.innerHTML = '<div class="empty"><p>주문할 상품이 없습니다.</p>' +
      '<a class="link-line" href="/shop.html">컬렉션 보러 가기 →</a></div>';
    return;
  }

  root.innerHTML = '<div class="cart-layout">' +
    '<form id="orderForm" novalidate>' +

      /* 주문자 */
      '<div class="checkout-block">' +
        '<div id="memberBar"></div>' +
        '<h2>주문자</h2>' +
        '<div class="field-row">' +
          '<div class="field"><label for="o-name">성함</label>' +
            '<input id="o-name" name="name" type="text" autocomplete="name" required></div>' +
          '<div class="field"><label for="o-phone">휴대폰</label>' +
            '<input id="o-phone" name="phone" type="tel" autocomplete="tel" inputmode="numeric" placeholder="010-0000-0000" required></div>' +
        '</div>' +
        '<div class="field"><label for="o-email">이메일 — 주문 확인 메일을 보내드립니다</label>' +
          '<input id="o-email" name="email" type="email" autocomplete="email" required></div>' +
        '<p class="buybox-note" id="memberNote">회원가입 없이 주문하실 수 있습니다.</p>' +
      '</div>' +

      /* 배송지 */
      '<div class="checkout-block">' +
        '<h2>배송지</h2>' +
        '<div class="field"><label for="o-recv">받는 분</label>' +
          '<input id="o-recv" name="receiver" type="text" required></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="o-zip">우편번호</label>' +
            '<input id="o-zip" name="zip" type="text" inputmode="numeric" required></div>' +
          '<div class="field"><label for="o-rphone">받는 분 연락처</label>' +
            '<input id="o-rphone" name="rphone" type="tel" inputmode="numeric"></div>' +
        '</div>' +
        '<div class="field"><label for="o-addr1">주소</label>' +
          '<input id="o-addr1" name="addr1" type="text" autocomplete="street-address" required></div>' +
        '<div class="field"><label for="o-addr2">상세 주소</label>' +
          '<input id="o-addr2" name="addr2" type="text"></div>' +
        '<div class="field"><label for="o-memo">배송 요청사항</label>' +
          '<select id="o-memo" name="memo">' +
            '<option>문 앞에 놓아 주세요</option>' +
            '<option>경비실에 맡겨 주세요</option>' +
            '<option>배송 전 연락 바랍니다</option>' +
            '<option>직접 입력</option>' +
          '</select></div>' +
        '<div class="field" id="memoFree" hidden><label for="o-memo2">요청사항 직접 입력</label>' +
          '<input id="o-memo2" name="memo2" type="text"></div>' +
      '</div>' +

      /* 기프트 */
      '<div class="checkout-block">' +
        '<h2>기프트 옵션</h2>' +
        '<label class="check"><input type="checkbox" id="o-gift" name="gift">' +
          '<span>선물로 보냅니다 — 전용 리본과 메시지 카드를 함께 넣어드립니다</span></label>' +
        '<div id="giftFields" hidden>' +
          '<div class="field"><label for="o-msg">메시지 카드 (40자 이내)</label>' +
            '<input id="o-msg" name="giftmsg" type="text" maxlength="40"></div>' +
          '<label class="check"><input type="checkbox" id="o-noprice" name="noprice" checked>' +
            '<span>가격이 표기되지 않은 명세서를 동봉합니다</span></label>' +
        '</div>' +
      '</div>' +

      /* 결제 수단 */
      '<div class="checkout-block">' +
        '<h2>결제 수단</h2>' +
        '<div class="pay-methods">' +
          '<label><input type="radio" id="pay-naverpay" name="pay" value="naverpay" checked><span>네이버페이</span></label>' +
          '<label><input type="radio" id="pay-kakaopay" name="pay" value="kakaopay"><span>카카오페이</span></label>' +
          '<label><input type="radio" id="pay-toss" name="pay" value="toss"><span>토스페이</span></label>' +
          '<label><input type="radio" id="pay-card" name="pay" value="card"><span>신용 · 체크카드</span></label>' +
          '<label><input type="radio" id="pay-bank" name="pay" value="bank"><span>계좌이체</span></label>' +
        '</div>' +
        '<p class="notice mt-2">' +
          '현재 결제 모듈이 연결되지 않은 상태입니다. PG 심사 통과 전까지는 이 단계에서 ' +
          '스마트스토어로 연결하거나, 주문서를 접수만 하고 별도로 결제 안내를 드리는 방식으로 운영합니다.' +
        '</p>' +
      '</div>' +

      '<div class="checkout-block no-border">' +
        '<label class="check"><input type="checkbox" id="o-agree" name="agree">' +
          '<span>주문 내용을 확인하였으며, 결제 진행에 동의합니다.</span></label>' +
        '<p class="buybox-note" id="orderStatus" role="status" aria-live="polite"></p>' +
      '</div>' +
    '</form>' +

    /* 주문 요약 */
    '<div class="summary is-sticky">' +
      '<h2>주문 요약</h2>' +
      t.lines.map(function (l) {
        return '<div class="summary-row"><span>' + W.esc(l.product.nameKo) +
          ' × ' + l.qty + (l.gift ? ' · 기프트' : '') + '</span><span>' + W.won(l.amount) + '</span></div>';
      }).join('') +
      '<div class="summary-row summary-divide">' +
        '<span>상품 금액</span><span>' + W.won(t.goods) + '</span></div>' +
      '<div class="summary-row"><span>배송비</span><span>' + (t.ship === 0 ? '무료' : W.won(t.ship)) + '</span></div>' +
      '<div class="summary-total"><span>최종 결제금액</span><strong>' + W.won(t.total) + '</strong></div>' +
      '<div class="buy-actions"><button class="btn" id="submitBtn" type="button">결제하기</button></div>' +
    '</div>' +
  '</div>';

  /* 모바일 하단 고정바 — 결제 페이지에서만 허용 */
  var bar = document.getElementById('mobileBar');
  bar.hidden = false;
  document.getElementById('mobileTotal').textContent = W.won(t.total);

  /* 배송 요청사항 직접 입력 */
  var memo = document.getElementById('o-memo');
  memo.addEventListener('change', function () {
    document.getElementById('memoFree').hidden = memo.value !== '직접 입력';
  });

  /* 기프트 옵션 */
  var gift = document.getElementById('o-gift');
  gift.addEventListener('change', function () {
    document.getElementById('giftFields').hidden = !gift.checked;
  });

  /* 휴대폰 자동 하이픈 */
  ['o-phone', 'o-rphone'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var v = el.value.replace(/\D/g, '').slice(0, 11);
      el.value = v.length < 4 ? v
        : v.length < 8 ? v.slice(0, 3) + '-' + v.slice(3)
        : v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
    });
  });

  /* 입력값 보존 — 새로고침해도 사라지지 않는다 */
  var form = document.getElementById('orderForm');
  var KEY = 'whj_checkout_draft';
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    Object.keys(saved).forEach(function (k) {
      if (form.elements[k]) {
        if (form.elements[k].type === 'checkbox') form.elements[k].checked = saved[k];
        else form.elements[k].value = saved[k];
      }
    });
    if (gift.checked) document.getElementById('giftFields').hidden = false;
  } catch (e) {}
  /* ── 회원이면 아는 것은 미리 채워 둔다 ────────────────
     이미 적어 둔 칸은 건드리지 않는다. 되살린 임시 저장이 먼저다.
     로그인하지 않았어도 주문은 그대로 된다 — 안내 한 줄만 달라진다. */
  (function () {
    var A = window.WHJAuth;
    var bar = document.getElementById('memberBar');
    var note = document.getElementById('memberNote');
    if (!A || !bar) return;

    function put(name, value) {
      var el = form.elements[name];
      if (el && !el.value && value) el.value = value;
    }

    A.me().then(function (user) {
      if (!user) {
        var next = encodeURIComponent('/checkout.html');
        bar.innerHTML =
          '<div class="member-bar">' +
            '<span>이미 회원이신가요?</span>' +
            '<a href="/login.html?next=' + next + '">로그인하고 주문하기 →</a>' +
          '</div>';
        return;
      }

      bar.innerHTML =
        '<div class="member-bar is-on">' +
          '<span>' + A.esc(user.name) + ' 님으로 주문합니다</span>' +
          '<a href="/account.html">내 정보 →</a>' +
        '</div>';
      if (note) note.textContent = '주문 내역은 내 정보에서 다시 보실 수 있습니다.';

      put('name', user.name);
      put('email', user.email);
      put('phone', hyphen(user.phone));

      var a = user.address;
      if (a) {
        put('receiver', a.receiver || user.name);
        put('zip', a.zip);
        put('addr1', a.addr);
        if (a.memo) {
          var sel = form.elements.memo;
          var known = Array.prototype.some.call(sel.options, function (o) { return o.value === a.memo || o.text === a.memo; });
          if (known) sel.value = a.memo;
          else {
            sel.value = '직접 입력';
            document.getElementById('memoFree').hidden = false;
            put('memo2', a.memo);
          }
        }
      }
    });

    function hyphen(d) {
      d = String(d || '').replace(/[^0-9]/g, '');
      if (d.length < 4) return d;
      if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3);
      return d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4);
    }
  })();

  form.addEventListener('input', function () {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  });

  function submit() {
    var status = document.getElementById('orderStatus');
    var bad = null;
    ['name', 'phone', 'email', 'receiver', 'zip', 'addr1'].forEach(function (n) {
      var el = form.elements[n];
      var ok = el.value.trim() !== '' &&
        (n !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = el;
    });
    if (bad) {
      status.textContent = '입력하지 않은 항목이 있습니다.';
      bad.focus();
      bad.scrollIntoView({ block: 'center' });
      return;
    }
    if (!form.elements.agree.checked) { status.textContent = '결제 진행에 동의해 주세요.'; return; }

    /* PG 결제가 붙기 전까지는 주문서를 접수만 하고 결제 안내를 따로 드린다.
       PG 연동 시에는 이 지점에서 결제창을 띄우고, 승인 응답을 받은 뒤
       아래 주문 생성 호출을 이어서 하면 된다. */
    var order = {
      buyer: {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim()
      },
      shipping: {
        receiver: form.elements.receiver.value.trim(),
        zip: form.elements.zip.value.trim(),
        addr: form.elements.addr1.value.trim() + ' ' + form.elements.addr2.value.trim(),
        memo: memo.value === '직접 입력' ? form.elements.memo2.value.trim() : memo.value
      },
      gift: gift.checked ? {
        message: form.elements.giftmsg.value.trim(),
        hidePrice: form.elements.noprice.checked
      } : null,
      pay: form.elements.pay.value,
      lines: t.lines.map(function (l) {
        return { slug: l.product.slug, name: l.product.nameKo, variant: l.variant.name,
                 qty: l.qty, amount: l.amount, gift: l.gift };
      }),
      totals: { goods: t.goods, ship: t.ship, total: t.total }
    };

    var btn = document.getElementById('submitBtn');
    var mbtn = document.getElementById('mobileSubmit');
    btn.disabled = mbtn.disabled = true;
    status.textContent = '주문을 접수하고 있습니다…';

    W.api('/orders', { method: 'POST', body: order, timeout: 20000 })
      .then(function (res) {
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        W.cart.clear();
        location.href = '/order.html?id=' + encodeURIComponent(res.id) +
          '&name=' + encodeURIComponent(order.buyer.name);
      })
      .catch(function (err) {
        btn.disabled = mbtn.disabled = false;
        status.textContent = '주문을 접수하지 못했습니다. ' +
          (err.message || '잠시 후 다시 시도해 주세요.');
      });
  }

  document.getElementById('submitBtn').addEventListener('click', submit);
  document.getElementById('mobileSubmit').addEventListener('click', submit);
});
