/* 내 정보 — 주문 내역 · 회원 정보 · 배송지 · 비밀번호 */
window.WHJ.ready(function () {
  var W = window.WHJ;
  var A = window.WHJAuth;
  if (!A) return;

  var view = document.getElementById('accountView');
  var gate = document.getElementById('acctGate');

  A.me(true).then(function (user) {
    /* 쓰지 않는 쪽은 화면에서 걷어낸다. 숨기기만 하면 제목이 문서에 둘 남는다. */
    if (!user) { gate.hidden = false; view.remove(); return; }
    gate.remove();
    view.hidden = false;
    fill(user);
    loadOrders();
    W.tabs(view);
    W.observe(view.querySelectorAll('.reveal'));
    wireForms();          // 폼은 로그인한 경우에만 문서에 있다
  });

  /* ── 화면 채우기 ─────────────────────────────────── */
  function fill(user) {
    document.getElementById('acctHello').textContent = user.name ? user.name + ' 님' : '내 정보';
    document.getElementById('p-email').value = user.email;
    document.getElementById('p-name').value = user.name || '';
    document.getElementById('p-phone').value = hyphen(user.phone || '');
    document.getElementById('p-marketing').checked = !!user.marketing;

    var a = user.address || {};
    document.getElementById('a-receiver').value = a.receiver || '';
    document.getElementById('a-zip').value = a.zip || '';
    document.getElementById('a-addr').value = a.addr || '';
    document.getElementById('a-memo').value = a.memo || '';
  }

  function hyphen(d) {
    d = String(d || '').replace(/[^0-9]/g, '');
    if (d.length < 4) return d;
    if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3);
    return d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4);
  }

  /* ── 주문 내역 ───────────────────────────────────── */
  var STATUS = {
    received: '주문 접수', ready: '발송 준비', shipped: '발송 완료', canceled: '취소 · 환불'
  };

  function loadOrders() {
    var host = document.getElementById('orderList');
    host.innerHTML = '<p class="empty-row">불러오는 중…</p>';

    A.api('/orders').then(function (j) {
      var list = j.orders || [];
      if (!list.length) {
        host.innerHTML =
          '<div class="acct-empty">' +
            '<p class="done-mark" aria-hidden="true">—</p>' +
            '<h2>아직 주문하신 것이 없습니다</h2>' +
            '<p>첫 번째 장은 나무입니다. 두 개의 향이 나와 있습니다.</p>' +
            '<div class="link-row center"><a class="link-line" href="/shop.html">SHOP →</a></div>' +
          '</div>';
        return;
      }

      host.innerHTML = list.map(function (o) {
        var sh = o.shipping || {};
        var lines = (o.lines || []).map(function (l) {
          return A.esc(l.name) + ' <span class="muted">× ' + l.qty + '</span>';
        }).join('<br>');

        return '<article class="acct-order">' +
          '<div class="acct-order-top">' +
            '<div>' +
              '<p class="acct-order-id">' + A.esc(o.id) + '</p>' +
              '<p class="acct-order-at">' + date(o.at) + '</p>' +
            '</div>' +
            '<span class="tag ' + tagClass(o.status) + '">' +
              A.esc(STATUS[o.status] || o.status) + '</span>' +
          '</div>' +
          '<div class="acct-order-body">' +
            '<div class="acct-order-lines">' + lines + '</div>' +
            '<div class="acct-order-sum">' + W.won((o.totals || {}).total || 0) + '</div>' +
          '</div>' +
          (o.invoice
            ? '<p class="acct-order-track">' + A.esc(o.courier || '택배') +
              ' <strong>' + A.esc(o.invoice) + '</strong></p>'
            : '') +
          (sh.addr ? '<p class="acct-order-addr">' + A.esc(sh.addr) + '</p>' : '') +
        '</article>';
      }).join('');
    }).catch(function () {
      host.innerHTML = '<p class="empty-row">주문 내역을 불러오지 못했습니다. 새로고침해 주세요.</p>';
    });
  }

  function tagClass(s) {
    return s === 'shipped' ? 'on' : (s === 'canceled' ? '' : 'soft');
  }
  function date(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate();
  }

  /* 로그인하지 않았으면 아래 폼들은 문서에 없다.
     그래서 함수로 묶어 두고, 로그인이 확인된 뒤에만 연결한다. */
  function wireForms() {

  /* ── 회원 정보 ───────────────────────────────────── */
  var profileForm = document.getElementById('profileForm');
  A.submit(profileForm, function (f) {
    return A.api('/me', {
      method: 'PATCH',
      body: {
        name: f.elements.name.value.trim(),
        phone: f.elements.phone.value.trim(),
        marketing: document.getElementById('p-marketing').checked
      }
    }).then(function (j) {
      fill(j.user);
      A.me(true);
      A.alert(profileForm, '저장했습니다.', 'ok');
    });
  });

  /* ── 배송지 ──────────────────────────────────────── */
  var addrForm = document.getElementById('addrForm');
  A.submit(addrForm, function (f) {
    return A.api('/me', {
      method: 'PATCH',
      body: {
        address: {
          receiver: f.elements.receiver.value.trim(),
          zip: f.elements.zip.value.trim(),
          addr: f.elements.addr.value.trim(),
          memo: f.elements.memo.value.trim()
        }
      }
    }).then(function () {
      A.me(true);
      A.alert(addrForm, '배송지를 저장했습니다. 주문서에 저절로 채워집니다.', 'ok');
    });
  });

  document.getElementById('addrClear').addEventListener('click', function () {
    if (!confirm('저장된 배송지를 지울까요?')) return;
    A.api('/me', { method: 'PATCH', body: { address: null } }).then(function () {
      ['a-receiver', 'a-zip', 'a-addr', 'a-memo'].forEach(function (id) {
        document.getElementById(id).value = '';
      });
      A.me(true);
      A.alert(addrForm, '지웠습니다.', 'ok');
    });
  });

  /* ── 비밀번호 ────────────────────────────────────── */
  var pwForm = document.getElementById('pwForm');
  A.submit(pwForm, function (f) {
    var next = f.elements.next.value;
    if (next !== f.elements.next2.value) {
      var e = new Error('두 번 적은 비밀번호가 서로 다릅니다.');
      e.field = 'next2';
      throw e;
    }
    return A.api('/password', {
      method: 'POST',
      body: { current: f.elements.current.value, next: next }
    }).then(function (j) {
      pwForm.reset();
      document.querySelectorAll('[data-strength]').forEach(function (b) {
        b.className = 'pw-strength lv0';
      });
      A.alert(pwForm, j.message || '비밀번호를 바꿨습니다.', 'ok');
    });
  });

  /* ── 로그아웃 · 탈퇴 ─────────────────────────────── */
  document.getElementById('logoutBtn').addEventListener('click', function () {
    A.api('/logout', { method: 'POST' }).then(function () { location.href = '/'; });
  });

  document.getElementById('leaveBtn').addEventListener('click', function () {
    if (!confirm('정말 탈퇴하시겠습니까?\n계정과 저장된 배송지가 지워집니다.')) return;
    var pw = prompt('확인을 위해 비밀번호를 입력해 주세요.');
    if (!pw) return;
    A.api('/me', { method: 'DELETE', body: { password: pw } })
      .then(function () { alert('탈퇴 처리했습니다. 그동안 감사했습니다.'); location.href = '/'; })
      .catch(function (e) { alert(e.message); });
  });

  }
});
