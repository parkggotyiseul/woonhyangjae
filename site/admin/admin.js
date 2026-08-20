/* 운향재 관리자
   운영자가 매일 실제로 하는 일 순서로 화면을 짰다.
   오늘 할 일 → 주문 → 배송 → 상품 · 사진 → 문의 → 고객 → 분석 → 설정

   데이터는 전부 서버(/api/admin/*)에 있다. 브라우저를 바꿔도, 다른 사람이 봐도
   같은 화면이 뜬다. 인증은 nginx Basic 인증이 앞단에서 처리한다. */
(function () {
  'use strict';

  /* ── 유틸 ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function won(n) { return '₩' + Number(n || 0).toLocaleString('ko-KR'); }
  function el(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dstr(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function today() { return new Date().toISOString().slice(0, 10); }

  var toastTimer;
  function toast(msg, isErr) {
    var t = el('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }

  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET' };
    if (opts.body instanceof FormData) {
      init.body = opts.body;
    } else if (opts.body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(opts.body);
    }
    return fetch('/api/admin' + path, init).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.message || ('요청 실패 (' + r.status + ')'));
        });
      }
      return r.status === 204 ? null : r.json();
    });
  }

  /* ── 상태 ─────────────────────────────────────────── */
  var S = {
    catalog: null, orders: [], inquiries: [], subscribers: [],
    uploads: [], summary: null, analytics: null,
    orderTab: 'received', analyticsDays: 30, pickTarget: null
  };

  var ORDER_STATUS = {
    received: '신규 주문', ready: '발송 준비', shipped: '발송 완료', canceled: '취소 · 환불'
  };

  /* ── 뷰 ───────────────────────────────────────────── */
  var views = {};

  /* 1. 오늘 할 일 ─────────────────────────────────────── */
  views.dashboard = function () {
    var s = S.summary || {};
    var p = s.pending || {};

    return head('오늘 할 일', '아침에 이 화면만 보시면 됩니다.') +
      '<div class="panel"><h2>지금 처리해야 할 것</h2>' +
        '<div class="todo">' +
          todo('새로 들어온 주문', p.newOrders, '#orders', '확인하고 발송 준비로 넘기세요') +
          todo('발송해야 할 주문', p.toShip, '#shipping', '송장번호를 넣으면 완료됩니다') +
          todo('답변 안 한 문의', p.openInquiries, '#inquiries', '영업일 2일 안에 답장') +
          todo('재고 부족', p.lowStock, '#products', '5개 이하로 남은 상품') +
        '</div>' +
        (!p.newOrders && !p.toShip && !p.openInquiries && !p.lowStock
          ? '<p class="note mt-1">지금은 처리할 일이 없습니다.</p>' : '') +
      '</div>' +

      '<div class="grid grid-4 mb-3">' +
        stat('오늘 매출', won((s.today || {}).revenue), (s.today || {}).orders + '건') +
        stat('이번 달 매출', won((s.month || {}).revenue), (s.month || {}).orders + '건') +
        stat('출시 알림 신청', (s.subscribers || 0) + '명', '세 번째 향 대기자') +
        stat('전체 주문', S.orders.length + '건', '누적') +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>최근 주문</h2>' +
          ((s.recentOrders || []).length
            ? '<div class="table-wrap"><table><thead><tr><th>주문</th><th>주문자</th><th class="num">금액</th><th>상태</th></tr></thead><tbody>' +
              s.recentOrders.map(function (o) {
                return '<tr><td>' + esc(o.id) + '<br><span class="muted-xs">' + dstr(o.at) + '</span></td>' +
                  '<td>' + esc(o.buyer.name) + '</td>' +
                  '<td class="num">' + won(o.totals.total) + '</td>' +
                  '<td>' + statusTag(o.status) + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : '<p class="empty-row">아직 주문이 없습니다.</p>') +
          '<div class="btn-row"><button class="b ghost" data-go="#orders">주문 전체 보기</button></div>' +
        '</div>' +

        '<div class="panel"><h2>재고 부족</h2>' +
          ((s.lowStock || []).length
            ? '<div class="table-wrap"><table><thead><tr><th>상품</th><th>옵션</th><th class="num">남은 수량</th></tr></thead><tbody>' +
              s.lowStock.map(function (x) {
                return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.option) + '</td>' +
                  '<td class="num"><span class="tag warn">' + x.stock + '</span></td></tr>';
              }).join('') + '</tbody></table></div>'
            : '<p class="empty-row">재고가 넉넉합니다.</p>') +
        '</div>' +
      '</div>';
  };

  function todo(label, n, href, hint) {
    n = n || 0;
    return '<button type="button" data-go="' + href + '">' +
      (n > 0 ? '<span class="dot"></span>' : '') + esc(label) +
      '<strong>' + n + '</strong>' +
      '<span class="muted-xs">' + esc(hint) + '</span></button>';
  }
  function stat(label, val, sub) {
    return '<div class="stat"><span>' + esc(label) + '</span><strong>' + esc(val) + '</strong>' +
      (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }
  function statusTag(s) {
    var cls = s === 'received' ? 'warn' : (s === 'shipped' ? 'on' : (s === 'ready' ? 'soft' : ''));
    return '<span class="tag ' + cls + '">' + esc(ORDER_STATUS[s] || s) + '</span>';
  }

  /* 2. 주문 ───────────────────────────────────────────── */
  views.orders = function () {
    var counts = {};
    Object.keys(ORDER_STATUS).forEach(function (k) {
      counts[k] = S.orders.filter(function (o) { return o.status === k; }).length;
    });
    var list = S.orders.filter(function (o) { return o.status === S.orderTab; });

    return head('주문', '주문 확인 → 발송 준비 → 송장 입력 순으로 처리합니다.',
        '<button class="b ghost" data-act="exportOrders">엑셀로 내보내기</button>') +

      '<div class="tabs">' +
        Object.keys(ORDER_STATUS).map(function (k) {
          return '<button class="' + (S.orderTab === k ? 'is-on' : '') + '" data-act="orderTab" data-a="' + k + '">' +
            ORDER_STATUS[k] + ' ' + counts[k] + '</button>';
        }).join('') +
      '</div>' +

      '<div class="filters">' +
        '<input id="orderSearch" placeholder="주문번호 · 이름 · 연락처로 찾기">' +
      '</div>' +

      '<div id="orderList">' + orderCards(list) + '</div>';
  };

  function orderCards(list) {
    if (!list.length) return '<p class="empty-row">해당하는 주문이 없습니다.</p>';
    return list.map(function (o) {
      var items = (o.lines || []).map(function (l) { return l.name + ' × ' + l.qty; }).join(', ');
      return '<div class="order-card" data-order="' + esc(o.id) + '">' +
        '<div class="order-head" data-act="toggleOrder" data-a="' + esc(o.id) + '">' +
          '<div><span class="who">' + esc(o.buyer.name) + '</span>' +
            (o.gift ? ' <span class="tag soft">선물</span>' : '') +
            '<div class="sub">' + esc(o.id) + ' · ' + dstr(o.at) + '</div></div>' +
          '<div><div>' + esc(items) + '</div>' +
            '<div class="sub">' + esc(o.shipping.addr || '') + '</div></div>' +
          '<div class="order-amt"><strong>' + won(o.totals.total) + '</strong><br>' + statusTag(o.status) + '</div>' +
        '</div>' +
        '<div class="order-body" hidden>' +
          '<dl class="kv">' +
            '<dt>연락처</dt><dd><span class="copyable" data-act="copy" data-a="' + esc(o.buyer.phone) + '">' + esc(o.buyer.phone) + '</span></dd>' +
            '<dt>이메일</dt><dd>' + esc(o.buyer.email) + '</dd>' +
            '<dt>받는 분</dt><dd>' + esc(o.shipping.receiver || '') + '</dd>' +
            '<dt>주소</dt><dd><span class="copyable" data-act="copy" data-a="' +
              esc('(' + (o.shipping.zip || '') + ') ' + (o.shipping.addr || '')) + '">(' +
              esc(o.shipping.zip || '') + ') ' + esc(o.shipping.addr || '') + '</span></dd>' +
            '<dt>요청사항</dt><dd>' + esc(o.shipping.memo || '—') + '</dd>' +
            (o.gift ? '<dt>선물 메시지</dt><dd>' + esc(o.gift.message || '(없음)') +
              (o.gift.hidePrice ? ' · 가격 미표기 명세서' : '') + '</dd>' : '') +
            '<dt>결제 수단</dt><dd>' + esc(o.pay || '—') + '</dd>' +
            '<dt>송장</dt><dd>' + (o.invoice ? esc(o.courier + ' ' + o.invoice) : '—') + '</dd>' +
          '</dl>' +
          '<div class="btn-row">' +
            (o.status === 'received' ? '<button class="b" data-act="setStatus" data-a="' + esc(o.id) + '" data-b="ready">발송 준비로 넘기기</button>' : '') +
            (o.status === 'ready' ? '<button class="b" data-act="ship" data-a="' + esc(o.id) + '">송장 입력하고 발송 완료</button>' : '') +
            (o.status !== 'canceled' && o.status !== 'shipped'
              ? '<button class="b ghost" data-act="setStatus" data-a="' + esc(o.id) + '" data-b="canceled">주문 취소</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* 3. 배송 ───────────────────────────────────────────── */
  views.shipping = function () {
    var ready = S.orders.filter(function (o) { return o.status === 'ready'; });
    var shipped = S.orders.filter(function (o) { return o.status === 'shipped'; }).slice(0, 20);
    var ship = (S.catalog.shipping) || {};

    return head('배송', '발송할 주문을 모아 송장번호를 한 번에 넣습니다.') +

      '<div class="panel"><h2>발송 대기 ' + ready.length + '건</h2>' +
        (ready.length
          ? '<div class="table-wrap"><table><thead><tr>' +
            '<th>주문번호</th><th>받는 분</th><th>주소</th><th>상품</th><th>택배사</th><th>송장번호</th>' +
            '</tr></thead><tbody>' +
            ready.map(function (o) {
              return '<tr>' +
                '<td>' + esc(o.id) + '</td>' +
                '<td>' + esc(o.shipping.receiver || o.buyer.name) + '<br><span class="muted-xs">' + esc(o.buyer.phone) + '</span></td>' +
                '<td>(' + esc(o.shipping.zip || '') + ') ' + esc(o.shipping.addr || '') +
                  (o.shipping.memo ? '<br><span class="muted-xs">' + esc(o.shipping.memo) + '</span>' : '') + '</td>' +
                '<td>' + (o.lines || []).map(function (l) { return esc(l.name) + ' × ' + l.qty; }).join('<br>') +
                  (o.gift ? '<br><span class="tag soft">선물포장</span>' : '') + '</td>' +
                '<td><input class="sel-sm" data-courier="' + esc(o.id) + '" placeholder="CJ대한통운" value="' + esc(o.courier || '') + '"></td>' +
                '<td><input class="sel-sm" data-invoice="' + esc(o.id) + '" placeholder="송장번호" value="' + esc(o.invoice || '') + '"></td>' +
              '</tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="btn-row">' +
              '<button class="b" data-act="saveInvoices">입력한 송장 저장하고 발송 완료</button>' +
              '<button class="b ghost" data-act="exportShipping">택배사 양식으로 내보내기</button>' +
            '</div>'
          : '<p class="empty-row">발송 대기 중인 주문이 없습니다.</p>') +
      '</div>' +

      '<div class="panel"><h2>배송 정책</h2>' +
        '<div class="frow-3">' +
          f('기본 배송비 (원)', '<input id="s-fee" type="number" value="' + Number(ship.fee || 0) + '">') +
          f('무료배송 기준 (원)', '<input id="s-free" type="number" value="' + Number(ship.freeThreshold || 0) + '">') +
          f('출고 안내 문구', '<input id="s-notice" value="' + esc(ship.notice || '') + '">') +
        '</div>' +
        '<div class="btn-row"><button class="b" data-act="saveShipping">저장</button></div>' +
      '</div>' +

      '<div class="panel"><h2>최근 발송 완료</h2>' +
        (shipped.length
          ? '<div class="table-wrap"><table><thead><tr><th>주문번호</th><th>받는 분</th><th>택배사</th><th>송장번호</th><th>발송일</th></tr></thead><tbody>' +
            shipped.map(function (o) {
              return '<tr><td>' + esc(o.id) + '</td><td>' + esc(o.shipping.receiver || o.buyer.name) + '</td>' +
                '<td>' + esc(o.courier || '—') + '</td><td>' + esc(o.invoice || '—') + '</td>' +
                '<td>' + dstr(o.updatedAt || o.at) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="empty-row">아직 발송한 주문이 없습니다.</p>') +
      '</div>';
  };

  /* 4. 상품 ───────────────────────────────────────────── */
  views.products = function () {
    var C = S.catalog;
    return head('상품', '가격 · 재고 · 사진을 여기서 바꿉니다.') +

      '<div class="panel"><h2>판매 중인 상품</h2>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>사진</th><th>상품</th><th class="num">가격</th><th class="num">재고</th><th>표식</th><th>상태</th><th></th>' +
        '</tr></thead><tbody>' +
        (C.products || []).map(function (p) {
          var v = (p.variants || [])[0] || {};
          var thumb = (p.photoSpots || []).filter(function (x) { return x.src; })[0];
          return '<tr>' +
            '<td>' + (thumb
              ? '<img src="' + esc(thumb.src) + '" alt="" class="thumb">'
              : '<span class="muted-xs">사진 없음</span>') + '</td>' +
            '<td><strong>' + esc(p.nameKo || '(이름 없음)') + '</strong>' +
              '<br><span class="muted-xs">' + esc(p.number + ' · ' + (p.species || '') + ' ' + (p.layer || '')) + '</span></td>' +
            '<td class="num">' + (v.price ? won(v.price) : '—') + '</td>' +
            '<td class="num">' + (v.stock != null
              ? (v.stock <= 5 ? '<span class="tag warn">' + v.stock + '</span>' : v.stock) : '—') + '</td>' +
            '<td>' + (p.badges || []).map(function (b) { return '<span class="tag soft">' + esc(b) + '</span>'; }).join(' ') + '</td>' +
            '<td>' + esc(p.statusLabel || p.status) + '</td>' +
            '<td><button class="b sm ghost" data-act="edit" data-a="' + esc(p.slug) + '">편집</button></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div class="btn-row"><button class="b ghost" data-act="newProduct">+ 새 상품 추가</button></div>' +
      '</div>' +

      '<div class="panel"><h2>컬렉션</h2>' +
        '<p class="note mb-1">상태를 <strong>진행중</strong>으로 바꾸면 사이트에 그 컬렉션이 나타납니다.</p>' +
        '<div class="table-wrap"><table><thead><tr><th>요소</th><th>부제</th><th class="num">상품 수</th><th>상태</th></tr></thead><tbody>' +
        (C.collections || []).map(function (c) {
          var n = (C.products || []).filter(function (p) { return p.collectionId === c.id; }).length;
          return '<tr><td><strong>' + esc(c.hanja + ' ' + c.ko) + '</strong></td>' +
            '<td>' + esc(c.subtitle || '') + '</td><td class="num">' + n + '</td>' +
            '<td><select class="sel-sm" data-col="' + esc(c.id) + '">' +
              ['active:진행중', 'upcoming:예정', 'done:완료'].map(function (o) {
                var val = o.split(':')[0], t = o.split(':')[1];
                return '<option value="' + val + '"' + (c.status === val ? ' selected' : '') + '>' + t + '</option>';
              }).join('') + '</select></td></tr>';
        }).join('') +
        '</tbody></table></div>' +
      '</div>' +

      '<div id="editor"></div>';
  };

  function editor(p) {
    var v = (p.variants || [])[0] || { name: '200ml', sku: '', price: 0, stock: 0 };
    var ROLES = ['요소 클로즈업', '제품 단독', '공간 배치', '디테일 매크로', '언박싱'];

    return '<div class="panel" id="editorPanel">' +
      '<h2>' + esc(p.nameKo || '새 상품') + '</h2>' +

      '<h3>사진</h3>' +
      '<p class="note mb-1">칸을 눌러 사진을 올리세요. 첫 번째와 두 번째 사진이 목록과 상세 화면에 쓰입니다.</p>' +
      '<div class="slots">' +
        ROLES.map(function (role, i) {
          var slot = pad(i + 1);
          var ps = (p.photoSpots || []).filter(function (x) { return x.slot === slot; })[0] || { slot: slot, role: role, src: '', alt: '' };
          return '<div class="pslot" data-slot="' + slot + '">' +
            '<div class="head"><span>PS-' + slot + '</span><b>' + esc(role) + '</b></div>' +
            '<div class="body">' + (ps.src
              ? '<img src="' + esc(ps.src) + '" alt="">'
              : '<p>비어 있음<br>눌러서 올리기</p>') + '</div>' +
            '<div class="acts">' +
              '<button type="button" data-act="slotUpload" data-a="' + slot + '">올리기</button>' +
              '<button type="button" data-act="slotPick" data-a="' + slot + '">보관함</button>' +
              (ps.src ? '<button type="button" data-act="slotClear" data-a="' + slot + '">비우기</button>' : '') +
            '</div>' +
            '<input type="hidden" data-src="' + slot + '" value="' + esc(ps.src) + '">' +
            '<input type="hidden" data-alt="' + slot + '" value="' + esc(ps.alt) + '">' +
          '</div>';
        }).join('') +
      '</div>' +

      '<h3 class="mt-2">기본 정보</h3>' +
      '<div class="frow-3">' +
        f('컬렉션', '<select id="e-col">' + (S.catalog.collections || []).map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (p.collectionId === c.id ? ' selected' : '') + '>' +
              esc(c.hanja + ' ' + c.ko) + '</option>';
          }).join('') + '</select>') +
        f('상품 번호', '<input id="e-number" value="' + esc(p.number) + '">') +
        f('판매 상태', '<select id="e-status">' +
            ['onsale:판매중', 'soldout:품절', 'coming:출시 예정', 'hidden:숨김'].map(function (o) {
              var val = o.split(':')[0], t = o.split(':')[1];
              return '<option value="' + val + '"' + (p.status === val ? ' selected' : '') + '>' + t + '</option>';
            }).join('') + '</select>') +
      '</div>' +
      '<div class="frow-3">' +
        f('상품명', '<input id="e-nameKo" value="' + esc(p.nameKo) + '">') +
        f('한자 (선택)', '<input id="e-nameHanja" value="' + esc(p.nameHanja) + '">') +
        f('영문 캡션', '<input id="e-caption" value="' + esc(p.caption) + '">') +
      '</div>' +

      '<h3 class="mt-2">가격과 재고</h3>' +
      '<div class="frow-3">' +
        f('가격 (원)', '<input id="e-price" type="number" value="' + Number(v.price || 0) + '">') +
        f('재고 수량', '<input id="e-stock" type="number" value="' + Number(v.stock || 0) + '">') +
        f('용량 · 옵션명', '<input id="e-vname" value="' + esc(v.name) + '">') +
      '</div>' +
      '<div class="frow-3">' +
        f('표식 (쉼표로 구분)', '<input id="e-badges" value="' + esc((p.badges || []).join(', ')) + '" placeholder="BEST, DESIGNER\'S PICK">') +
        f('누적 판매 수 · 인기순 기준', '<input id="e-sold" type="number" value="' + Number(p.soldCount || 0) + '">') +
        f('출시일 · 최신순 기준', '<input id="e-released" type="date" value="' + esc(p.releasedAt || '') + '">') +
      '</div>' +

      '<h3 class="mt-2">소개 문구</h3>' +
      '<div class="f" id="sigWrap">' +
        '<label>한 줄 카피 <span class="count" id="sigCount"></span></label>' +
        '<input id="e-signature" value="' + esc(p.signature) + '" maxlength="40">' +
        '<p class="hint">15자 이내를 권합니다. 휴대폰에서 한 줄에 들어가야 합니다.</p>' +
      '</div>' +
      f('이야기 (한 줄에 한 문장)', '<textarea id="e-story" rows="5">' + esc((p.story || []).join('\n')) + '</textarea>') +
      f('마지막 한 문장', '<input id="e-storyLast" value="' + esc(p.storyLast) + '">') +

      '<h3 class="mt-2">향</h3>' +
      '<div class="frow-3">' +
        f('TOP', '<input id="e-top" value="' + esc(p.notes ? p.notes.top : '') + '">') +
        f('HEART', '<input id="e-heart" value="' + esc(p.notes ? p.notes.heart : '') + '">') +
        f('BASE', '<input id="e-base" value="' + esc(p.notes ? p.notes.base : '') + '">') +
      '</div>' +
      '<div class="frow-3">' +
        f('수종', '<input id="e-species" value="' + esc(p.species) + '">') +
        f('층위', '<input id="e-layer" value="' + esc(p.layer) + '">') +
        f('무드', '<input id="e-mood" value="' + esc(p.mood) + '">') +
      '</div>' +
      '<div class="frow">' +
        f('추천 공간 (쉼표로 구분)', '<input id="e-spaces" value="' + esc((p.spaces || []).join(', ')) + '">') +
        f('주소 slug', '<input id="e-slug" value="' + esc(p.slug) + '">') +
      '</div>' +

      '<div class="btn-row">' +
        '<button class="b" data-act="save" data-a="' + esc(p.slug) + '">저장하기</button>' +
        '<button class="b ghost" data-act="closeEditor">닫기</button>' +
      '</div>' +
    '</div>';
  }
  function f(label, control) { return '<div class="f"><label>' + esc(label) + '</label>' + control + '</div>'; }

  /* 5. 사진 보관함 ────────────────────────────────────── */
  views.photos = function () {
    return head('사진', '제품컷과 연출컷을 여기에 모아 둡니다. 상품 편집에서 골라 쓸 수 있습니다.') +
      '<div class="panel">' +
        '<label class="drop" id="dropZone">' +
          '<strong>사진을 끌어다 놓거나 눌러서 고르세요</strong>' +
          '<span>JPG · PNG · WebP · AVIF · 한 장에 12MB 까지 · 한 번에 10장</span>' +
          '<input type="file" id="fileInput" accept="image/*" multiple>' +
        '</label>' +
        '<p class="note mt-1">가로로 긴 사진보다 정사각형에 가까운 사진이 목록에서 잘 보입니다. 촬영본 원본을 그대로 올리셔도 됩니다.</p>' +
      '</div>' +

      '<div class="panel"><h2>보관함 ' + S.uploads.length + '장</h2>' +
        (S.uploads.length
          ? '<div class="photos">' + S.uploads.map(function (u) {
              return '<div class="photo">' +
                '<img src="' + esc(u.url) + '" alt="">' +
                '<div class="meta">' + Math.round(u.size / 1024) + 'KB · ' + esc(u.at.slice(5, 10)) + '</div>' +
                '<div class="acts">' +
                  '<button data-act="copy" data-a="' + esc(u.url) + '">주소 복사</button>' +
                  '<button data-act="delPhoto" data-a="' + esc(u.name) + '">삭제</button>' +
                '</div></div>';
            }).join('') + '</div>'
          : '<p class="empty-row">아직 올린 사진이 없습니다.</p>') +
      '</div>';
  };

  /* 6. 문의 ───────────────────────────────────────────── */
  var TYPE_LABEL = {
    product: '제품 문의', order: '주문 · 배송', b2b: '공간 향 제안',
    wholesale: '도매 · 입점', etc: '기타'
  };
  views.inquiries = function () {
    var open = S.inquiries.filter(function (q) { return q.status === 'open'; });
    var done = S.inquiries.filter(function (q) { return q.status !== 'open'; });

    return head('문의', '영업일 기준 2일 안에 답장하는 것이 원칙입니다.') +
      '<div class="panel"><h2>답변 대기 ' + open.length + '건</h2>' + inqTable(open, true) + '</div>' +
      '<div class="panel"><h2>처리 완료 ' + done.length + '건</h2>' + inqTable(done.slice(0, 30), false) + '</div>';
  };
  function inqTable(list, isOpen) {
    if (!list.length) return '<p class="empty-row">' + (isOpen ? '답변할 문의가 없습니다.' : '없습니다.') + '</p>';
    return '<div class="table-wrap"><table><thead><tr>' +
      '<th>받은 시각</th><th>유형</th><th>보낸 분</th><th>내용</th><th></th>' +
      '</tr></thead><tbody>' +
      list.map(function (q) {
        return '<tr>' +
          '<td>' + dstr(q.at) + '</td>' +
          '<td><span class="tag">' + esc(TYPE_LABEL[q.type] || q.type) + '</span>' +
            (q.company ? '<br><span class="muted-xs">' + esc(q.company) + '</span>' : '') + '</td>' +
          '<td>' + esc(q.name) + '<br><span class="muted-xs">' + esc(q.email) + '<br>' + esc(q.phone || '') + '</span></td>' +
          '<td>' + esc(q.message).replace(/\n/g, '<br>') +
            (q.quantity ? '<br><span class="muted-xs">예상 수량 ' + esc(q.quantity) + '</span>' : '') + '</td>' +
          '<td>' +
            '<a class="b sm ghost" href="mailto:' + esc(q.email) + '?subject=' +
              encodeURIComponent('[운향재] 문의 답변드립니다') + '">메일 쓰기</a>' +
            (isOpen ? '<button class="b sm mt-xs" data-act="closeInquiry" data-a="' + esc(q.id) + '">처리 완료</button>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* 7. 고객 ───────────────────────────────────────────── */
  views.customers = function () {
    var buyers = {};
    S.orders.forEach(function (o) {
      var k = o.buyer.email || o.buyer.phone;
      buyers[k] = buyers[k] || { name: o.buyer.name, email: o.buyer.email, phone: o.buyer.phone, count: 0, amount: 0, last: o.at };
      buyers[k].count++;
      buyers[k].amount += o.totals.total || 0;
      if (o.at > buyers[k].last) buyers[k].last = o.at;
    });
    var keys = Object.keys(buyers).sort(function (a, b) { return buyers[b].amount - buyers[a].amount; });

    return head('고객', '구매하신 분과 출시를 기다리는 분을 모아 봅니다.',
        '<button class="b ghost" data-act="exportSubscribers">알림 신청자 내보내기</button>') +

      '<div class="panel"><h2>구매 고객 ' + keys.length + '명</h2>' +
        (keys.length
          ? '<div class="table-wrap"><table><thead><tr><th>이름</th><th>연락처</th>' +
            '<th class="num">주문 수</th><th class="num">누적 구매액</th><th>마지막 주문</th><th></th></tr></thead><tbody>' +
            keys.map(function (k) {
              var b = buyers[k];
              return '<tr><td>' + esc(b.name) + '</td>' +
                '<td>' + esc(b.email) + '<br><span class="muted-xs">' + esc(b.phone) + '</span></td>' +
                '<td class="num">' + b.count + '</td><td class="num">' + won(b.amount) + '</td>' +
                '<td>' + dstr(b.last) + '</td>' +
                '<td>' + (b.count > 1 ? '<span class="tag on">재구매</span>' : '') + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="empty-row">아직 주문이 없습니다.</p>') +
      '</div>' +

      '<div class="panel"><h2>출시 알림 신청 ' + S.subscribers.length + '명</h2>' +
        '<p class="note mb-1">세 번째 향이 나오면 이분들께 가장 먼저 알리시면 됩니다. 첫 매출이 여기서 나옵니다.</p>' +
        (S.subscribers.length
          ? '<div class="table-wrap"><table><thead><tr><th>이메일</th><th>신청일</th></tr></thead><tbody>' +
            S.subscribers.map(function (s) {
              return '<tr><td>' + esc(s.email) + '</td><td>' + dstr(s.at) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="empty-row">아직 신청자가 없습니다.</p>') +
      '</div>';
  };

  /* 8. 분석 ───────────────────────────────────────────── */
  views.analytics = function () {
    var a = S.analytics;
    if (!a) return head('분석', '불러오는 중…') + '<p class="empty-row">잠시만 기다려 주세요.</p>';

    var t = a.totals;
    var maxDaily = Math.max.apply(null, a.daily.map(function (d) { return d.sessions; }).concat([1]));
    var maxHour = Math.max.apply(null, a.hours.map(function (h) { return h.count; }).concat([1]));

    return head('분석', '마케팅 판단에 쓰는 숫자만 모았습니다.',
        '<div class="range">' +
          [7, 30, 90].map(function (d) {
            return '<button data-act="setDays" data-a="' + d + '"' +
              (S.analyticsDays === d ? ' class="is-on"' : '') + '>' + d + '일</button>';
          }).join('') +
        '</div>') +

      '<div class="grid grid-4 mb-3">' +
        stat('방문자', t.sessions.toLocaleString('ko-KR') + '명', a.range.from + ' ~ ' + a.range.to) +
        stat('페이지 조회', t.pageViews.toLocaleString('ko-KR') + '회', '') +
        stat('주문', t.orders + '건', won(t.revenue)) +
        stat('구매 전환율', t.conversion + '%', '방문자 대비 주문') +
      '</div>' +

      '<div class="panel"><h2>날짜별 방문자</h2>' +
        '<div class="chart">' + a.daily.map(function (d) {
          return '<div title="' + d.date + ' · ' + d.sessions + '명"><i data-h="' +
            Math.round(d.sessions / maxDaily * 100) + '"></i></div>';
        }).join('') + '</div>' +
        '<div class="chart-x"><span>' + a.daily[0].date.slice(5) + '</span>' +
          '<span>' + a.daily[a.daily.length - 1].date.slice(5) + '</span></div>' +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>구매까지 가는 길</h2>' +
          '<p class="note mb-1">어느 단계에서 가장 많이 빠지는지 보세요. 그 화면부터 고치면 됩니다.</p>' +
          '<div class="funnel">' + a.funnel.map(function (s) {
            return '<div class="funnel-row"><span>' + esc(s.label) + '</span>' +
              '<span class="funnel-bar"><i data-w="' + s.rate + '"></i></span>' +
              '<span class="n">' + s.sessions + '명 · ' + s.rate + '%</span></div>';
          }).join('') + '</div>' +
        '</div>' +

        '<div class="panel"><h2>어디서 들어오나</h2>' +
          (a.sources.length
            ? a.sources.map(function (s) {
                var pct = Math.round(s.count / a.sources[0].count * 100);
                return '<div class="meter"><span>' + esc(s.name) + '</span>' +
                  '<span class="bar"><i data-w="' + pct + '"></i></span>' +
                  '<span class="v">' + s.count + '</span></div>';
              }).join('')
            : '<p class="empty-row">아직 데이터가 없습니다.</p>') +
          '<h3 class="mt-2">기기</h3>' +
          a.devices.map(function (d) {
            var total = a.devices.reduce(function (n, x) { return n + x.count; }, 0) || 1;
            return '<div class="meter"><span>' + esc(d.name) + '</span>' +
              '<span class="bar"><i data-w="' + Math.round(d.count / total * 100) + '"></i></span>' +
              '<span class="v">' + Math.round(d.count / total * 100) + '%</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="panel"><h2>상품별 성과</h2>' +
        '<p class="note mb-1">안 팔리는 상품이 아니라 <strong>많이 봤는데 안 사는 상품</strong>을 찾으세요. 사진이나 설명을 고쳐야 한다는 뜻입니다.</p>' +
        (a.products.length
          ? '<div class="table-wrap"><table><thead><tr><th>상품</th><th class="num">조회</th>' +
            '<th class="num">담기</th><th class="num">구매</th><th class="num">담기 전환</th>' +
            '<th class="num">구매 전환</th><th class="num">매출</th></tr></thead><tbody>' +
            a.products.map(function (p) {
              var prod = (S.catalog.products || []).concat(S.catalog.sets || [])
                .filter(function (x) { return x.slug === p.slug; })[0];
              return '<tr><td>' + esc(prod ? prod.nameKo : p.slug) + '</td>' +
                '<td class="num">' + p.views + '</td><td class="num">' + p.carts + '</td>' +
                '<td class="num">' + p.purchased + '</td>' +
                '<td class="num">' + p.cartRate + '%</td>' +
                '<td class="num">' + p.buyRate + '%</td>' +
                '<td class="num">' + won(p.revenue) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="empty-row">아직 데이터가 없습니다.</p>') +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>어느 화면을 보나</h2>' +
          (a.pages.length
            ? '<div class="table-wrap"><table><thead><tr><th>화면</th><th class="num">조회</th><th class="num">머문 시간</th></tr></thead><tbody>' +
              a.pages.map(function (p) {
                return '<tr><td>' + esc(p.path) + '</td><td class="num">' + p.views + '</td>' +
                  '<td class="num">' + (p.avgDwell ? p.avgDwell + '초' : '—') + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : '<p class="empty-row">아직 데이터가 없습니다.</p>') +
        '</div>' +

        '<div class="panel"><h2>얼마나 읽고 가나</h2>' +
          '<p class="note mb-1">아래로 끝까지 내려간 비율입니다. 이야기를 끝까지 읽었다는 뜻이라 이 브랜드에서는 매출보다 먼저 보는 숫자입니다.</p>' +
          a.scroll.map(function (s) {
            return '<div class="meter"><span>' + s.depth + '%</span>' +
              '<span class="bar"><i data-w="' + s.rate + '"></i></span>' +
              '<span class="v">' + s.rate + '%</span></div>';
          }).join('') +
          '<h3 class="mt-2">시간대별 방문</h3>' +
          '<div class="chart">' + a.hours.map(function (h) {
            return '<div title="' + h.hour + '시 · ' + h.count + '"><i data-h="' +
              Math.round(h.count / maxHour * 100) + '"></i></div>';
          }).join('') + '</div>' +
          '<div class="chart-x"><span>0시</span><span>12시</span><span>23시</span></div>' +
        '</div>' +
      '</div>';
  };

  /* 9. 설정 ───────────────────────────────────────────── */
  views.settings = function () {
    var b = S.catalog.brand || {};
    return head('설정', '사업자 정보와 연락처를 관리합니다.') +
      '<div class="panel"><h2>사업자 정보</h2>' +
        '<div class="frow">' +
          f('상호 (법인명)', '<input id="s-company" value="' + esc(b.company) + '">') +
          f('대표자', '<input id="s-ceo" value="' + esc(b.ceo) + '">') +
        '</div>' +
        '<div class="frow">' +
          f('사업자등록번호', '<input id="s-biz" value="' + esc(b.bizNumber) + '">') +
          f('통신판매업 신고번호', '<input id="s-mail" value="' + esc(b.mailOrderNumber) + '">') +
        '</div>' +
        '<div class="frow">' +
          f('사업장 주소', '<input id="s-addr" value="' + esc(b.address) + '">') +
          f('대표 전화', '<input id="s-phone" value="' + esc(b.phone) + '">') +
        '</div>' +
        '<div class="frow">' +
          f('문의 이메일', '<input id="s-email" value="' + esc(b.email) + '">') +
          f('도매 · 제휴 이메일', '<input id="s-b2b" value="' + esc(b.b2bEmail) + '">') +
        '</div>' +
        '<div class="btn-row"><button class="b" data-act="saveBrand">저장</button></div>' +
        '<div class="note warn mt-1">사업자등록번호 · 통신판매업 신고번호 · 주소는 법으로 표기가 의무입니다. 판매 시작 전에 반드시 실제 값으로 채워 주세요.</div>' +
      '</div>' +

      '<div class="panel"><h2>백업</h2>' +
        '<p class="note mb-1">상품 정보와 주문 내역을 파일로 내려받아 둘 수 있습니다. 서버에도 저장되지만, 중요한 시점마다 한 번씩 받아 두시면 안전합니다.</p>' +
        '<div class="btn-row">' +
          '<button class="b ghost" data-act="exportCatalog">상품 정보 내려받기</button>' +
          '<button class="b ghost" data-act="exportOrders">주문 내역 내려받기</button>' +
        '</div>' +
      '</div>';
  };

  /* ── 공통 렌더링 ──────────────────────────────────── */
  function head(title, desc, right) {
    return '<div class="page-head"><h1>' + esc(title) + '</h1><p>' + esc(desc) + '</p>' +
      (right ? '<div class="right">' + right + '</div>' : '') + '</div>';
  }

  function paintBars(root) {
    root.querySelectorAll('[data-w]').forEach(function (n) {
      n.style.width = Math.max(1, Number(n.getAttribute('data-w'))) + '%';
    });
    root.querySelectorAll('[data-h]').forEach(function (n) {
      n.style.height = Math.max(1, Number(n.getAttribute('data-h'))) + '%';
    });
  }

  function render() {
    var hash = (location.hash || '#dashboard').slice(1);
    if (!views[hash]) hash = 'dashboard';
    var view = el('view');
    view.innerHTML = views[hash]();
    document.querySelectorAll('#nav a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + hash);
    });
    paintBars(view);
    paintBadges();
    afterRender(hash);
    window.scrollTo(0, 0);
  }

  function paintBadges() {
    var p = (S.summary && S.summary.pending) || {};
    var pairs = [
      ['nav-todo', (p.newOrders || 0) + (p.toShip || 0) + (p.openInquiries || 0) + (p.lowStock || 0)],
      ['nav-orders', p.newOrders || 0],
      ['nav-ship', p.toShip || 0],
      ['nav-ask', p.openInquiries || 0]
    ];
    pairs.forEach(function (x) {
      var n = el(x[0]);
      if (!n) return;
      n.hidden = !x[1];
      n.textContent = x[1];
    });
  }

  function afterRender(hash) {
    if (hash === 'products') {
      document.querySelectorAll('[data-col]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var id = sel.getAttribute('data-col');
          S.catalog.collections.forEach(function (c) {
            if (c.id !== id) return;
            c.status = sel.value;
            c.statusLabel = { active: '진행중', upcoming: '예정', done: '완료' }[sel.value];
          });
          saveCatalog('컬렉션 상태를 바꿨습니다.');
        });
      });
    }
    if (hash === 'photos') setupDrop();
    if (hash === 'orders') {
      var search = el('orderSearch');
      if (search) {
        search.addEventListener('input', function () {
          var q = search.value.trim().toLowerCase();
          var list = S.orders.filter(function (o) { return o.status === S.orderTab; });
          if (q) {
            list = list.filter(function (o) {
              return (o.id + ' ' + o.buyer.name + ' ' + o.buyer.phone).toLowerCase().indexOf(q) >= 0;
            });
          }
          el('orderList').innerHTML = orderCards(list);
        });
      }
    }
    var sig = el('e-signature');
    if (sig) {
      var upd = function () {
        el('sigCount').textContent = sig.value.length + ' / 15자';
        el('sigWrap').classList.toggle('over', sig.value.length > 15);
      };
      sig.addEventListener('input', upd);
      upd();
    }
  }

  /* ── 사진 업로드 ──────────────────────────────────── */
  function setupDrop() {
    var zone = el('dropZone');
    var input = el('fileInput');
    if (!zone || !input) return;

    input.addEventListener('change', function () {
      if (input.files.length) uploadFiles(input.files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });
  }

  function uploadFiles(files, onDone) {
    var fd = new FormData();
    Array.prototype.forEach.call(files, function (f) { fd.append('files', f); });
    toast(files.length + '장 올리는 중…');
    return api('/uploads', { method: 'POST', body: fd })
      .then(function (res) {
        toast(res.files.length + '장 올렸습니다.');
        return refreshUploads().then(function () {
          if (onDone) onDone(res.files);
          else render();
        });
      })
      .catch(function (e) { toast(e.message, true); });
  }

  /* ── 저장 ─────────────────────────────────────────── */
  function saveCatalog(msg) {
    return api('/catalog', { method: 'PUT', body: S.catalog })
      .then(function () { toast(msg || '저장했습니다. 사이트에 바로 반영됩니다.'); })
      .catch(function (e) { toast(e.message, true); });
  }

  /* ── 내려받기 ─────────────────────────────────────── */
  function download(name, text, type) {
    var blob = new Blob(['﻿' + text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function csv(name, rows) {
    download(name, rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n'), 'text/csv');
  }

  /* ── 동작 ─────────────────────────────────────────── */
  var actions = {
    orderTab: function (k) { S.orderTab = k; render(); },

    toggleOrder: function (id) {
      var card = document.querySelector('[data-order="' + id + '"] .order-body');
      if (card) card.hidden = !card.hidden;
    },

    setStatus: function (id, status) {
      if (status === 'canceled' && !confirm('이 주문을 취소 처리할까요?')) return;
      api('/orders/' + id, { method: 'PATCH', body: { status: status } })
        .then(function () { return refreshOrders(); })
        .then(function () { toast('처리했습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    ship: function (id) {
      var courier = prompt('택배사를 입력해 주세요.', 'CJ대한통운');
      if (courier === null) return;
      var invoice = prompt('송장번호를 입력해 주세요.');
      if (!invoice) return;
      api('/orders/' + id, {
        method: 'PATCH',
        body: { status: 'shipped', courier: courier.trim(), invoice: invoice.trim() }
      }).then(function () { return refreshOrders(); })
        .then(function () { toast('발송 완료로 바꿨습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    saveInvoices: function () {
      var rows = [];
      document.querySelectorAll('[data-invoice]').forEach(function (inp) {
        var id = inp.getAttribute('data-invoice');
        var no = inp.value.trim();
        if (!no) return;
        var c = document.querySelector('[data-courier="' + id + '"]');
        rows.push({ id: id, invoice: no, courier: c ? c.value.trim() : '' });
      });
      if (!rows.length) { toast('입력된 송장번호가 없습니다.', true); return; }
      api('/orders/invoices', { method: 'POST', body: rows })
        .then(function (res) { return refreshOrders().then(function () { return res; }); })
        .then(function (res) { toast(res.updated + '건 발송 완료 처리했습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    exportShipping: function () {
      var ready = S.orders.filter(function (o) { return o.status === 'ready'; });
      var rows = [['주문번호', '받는분', '연락처', '우편번호', '주소', '상품', '수량', '배송메시지', '선물포장']];
      ready.forEach(function (o) {
        (o.lines || []).forEach(function (l) {
          rows.push([o.id, o.shipping.receiver || o.buyer.name, o.buyer.phone,
            o.shipping.zip, o.shipping.addr, l.name, l.qty, o.shipping.memo,
            o.gift ? 'O' : '']);
        });
      });
      csv('발송목록_' + today() + '.csv', rows);
    },

    exportOrders: function () {
      var rows = [['주문번호', '주문일시', '상태', '주문자', '연락처', '이메일',
        '받는분', '우편번호', '주소', '배송메시지', '상품', '수량', '금액', '결제수단',
        '택배사', '송장번호', '선물메시지']];
      S.orders.forEach(function (o) {
        (o.lines || []).forEach(function (l) {
          rows.push([o.id, o.at, ORDER_STATUS[o.status] || o.status,
            o.buyer.name, o.buyer.phone, o.buyer.email,
            o.shipping.receiver, o.shipping.zip, o.shipping.addr, o.shipping.memo,
            l.name, l.qty, l.amount, o.pay, o.courier, o.invoice,
            o.gift ? o.gift.message : '']);
        });
      });
      csv('주문내역_' + today() + '.csv', rows);
    },

    exportSubscribers: function () {
      csv('알림신청자_' + today() + '.csv',
        [['이메일', '신청일']].concat(S.subscribers.map(function (s) { return [s.email, s.at]; })));
    },

    exportCatalog: function () {
      download('상품정보_' + today() + '.json', JSON.stringify(S.catalog, null, 2), 'application/json');
    },

    saveShipping: function () {
      S.catalog.shipping = S.catalog.shipping || {};
      S.catalog.shipping.fee = Number(el('s-fee').value) || 0;
      S.catalog.shipping.freeThreshold = Number(el('s-free').value) || 0;
      S.catalog.shipping.notice = el('s-notice').value.trim();
      saveCatalog('배송 정책을 저장했습니다.');
    },

    saveBrand: function () {
      var b = S.catalog.brand = S.catalog.brand || {};
      b.company = el('s-company').value.trim();
      b.ceo = el('s-ceo').value.trim();
      b.bizNumber = el('s-biz').value.trim();
      b.mailOrderNumber = el('s-mail').value.trim();
      b.address = el('s-addr').value.trim();
      b.phone = el('s-phone').value.trim();
      b.email = el('s-email').value.trim();
      b.b2bEmail = el('s-b2b').value.trim();
      saveCatalog('사업자 정보를 저장했습니다.');
    },

    edit: function (slug) {
      var p = (S.catalog.products || []).concat(S.catalog.sets || [])
        .filter(function (x) { return x.slug === slug; })[0];
      if (!p) return;
      el('editor').innerHTML = editor(p);
      afterRender('products');
      el('editorPanel').scrollIntoView({ block: 'start' });
    },

    closeEditor: function () { el('editor').innerHTML = ''; },

    newProduct: function () {
      var n = (S.catalog.products || []).length + 1;
      var p = {
        id: 'new-' + Date.now(), slug: 'new-' + n,
        collectionId: (S.catalog.collections[0] || {}).id,
        number: pad(n), nameKo: '', nameHanja: '', caption: '', signature: '',
        species: '', layer: '', badges: [], soldCount: 0, releasedAt: '',
        story: [], storyLast: '', notes: { top: '', heart: '', base: '' },
        mood: '', spaces: [], status: 'hidden', statusLabel: '숨김', accent: '#6B4A2F',
        photoSpots: [],
        variants: [{ id: 'v-' + Date.now(), name: '200ml', sku: '', price: 150000, stock: 0 }]
      };
      S.catalog.products.push(p);
      saveCatalog('새 상품을 만들었습니다. 내용을 채워 주세요.').then(function () {
        render();
        actions.edit(p.slug);
      });
    },

    save: function (slug) {
      var p = (S.catalog.products || []).concat(S.catalog.sets || [])
        .filter(function (x) { return x.slug === slug; })[0];
      if (!p) return;
      var ROLES = ['요소 클로즈업', '제품 단독', '공간 배치', '디테일 매크로', '언박싱'];

      p.collectionId = el('e-col').value;
      p.number = el('e-number').value.trim();
      p.status = el('e-status').value;
      p.statusLabel = { onsale: '판매중', soldout: '품절', coming: 'Coming Soon', hidden: '숨김' }[p.status];
      p.nameKo = el('e-nameKo').value.trim();
      p.nameHanja = el('e-nameHanja').value.trim();
      p.caption = el('e-caption').value.trim();
      p.species = el('e-species').value.trim();
      p.layer = el('e-layer').value.trim();
      p.signature = el('e-signature').value.trim();
      p.story = el('e-story').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      p.storyLast = el('e-storyLast').value.trim();
      p.notes = { top: el('e-top').value.trim(), heart: el('e-heart').value.trim(), base: el('e-base').value.trim() };
      p.mood = el('e-mood').value.trim();
      p.spaces = el('e-spaces').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      p.badges = el('e-badges').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      p.soldCount = Number(el('e-sold').value) || 0;
      p.releasedAt = el('e-released').value;
      p.photoSpots = [0, 1, 2, 3, 4].map(function (i) {
        var slot = pad(i + 1);
        return {
          slot: slot, role: ROLES[i],
          src: (document.querySelector('[data-src="' + slot + '"]') || {}).value || '',
          alt: (document.querySelector('[data-alt="' + slot + '"]') || {}).value || (p.nameKo + ' ' + ROLES[i])
        };
      }).filter(function (ps) { return ps.src; });

      var v = p.variants[0];
      v.name = el('e-vname').value.trim();
      v.price = Number(el('e-price').value) || 0;
      v.stock = Number(el('e-stock').value) || 0;
      p.slug = el('e-slug').value.trim() || p.slug;

      saveCatalog('저장했습니다. 사이트에 바로 반영됩니다.').then(render);
    },

    /* 사진 슬롯 */
    slotUpload: function (slot) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function () {
        if (!input.files.length) return;
        uploadFiles(input.files, function (files) {
          setSlot(slot, files[0].url);
        });
      });
      input.click();
    },

    slotPick: function (slot) {
      if (!S.uploads.length) { toast('보관함이 비어 있습니다. 먼저 사진을 올려 주세요.', true); return; }
      S.pickTarget = slot;
      openPicker();
    },

    slotClear: function (slot) { setSlot(slot, ''); },

    delPhoto: function (name) {
      if (!confirm('이 사진을 삭제할까요? 상품에 쓰이고 있으면 그 자리가 비게 됩니다.')) return;
      api('/uploads/' + encodeURIComponent(name), { method: 'DELETE' })
        .then(refreshUploads)
        .then(function () { toast('삭제했습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    closeInquiry: function (id) {
      api('/inquiries/' + id, { method: 'PATCH', body: { status: 'done' } })
        .then(function () { return refreshInquiries(); })
        .then(function () { toast('처리 완료로 표시했습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    setDays: function (d) {
      S.analyticsDays = Number(d);
      S.analytics = null;
      render();
      refreshAnalytics().then(render);
    },

    copy: function (text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { toast('복사했습니다.'); });
      }
    }
  };

  function setSlot(slot, url) {
    var hidden = document.querySelector('[data-src="' + slot + '"]');
    if (!hidden) return;
    hidden.value = url;
    var box = document.querySelector('.pslot[data-slot="' + slot + '"] .body');
    box.innerHTML = url ? '<img src="' + esc(url) + '" alt="">' : '<p>비어 있음<br>눌러서 올리기</p>';
    toast(url ? '사진을 넣었습니다. 아래 저장하기를 눌러 주세요.' : '비웠습니다. 저장하기를 눌러 주세요.');
  }

  /* 보관함에서 고르기 */
  function openPicker() {
    var wrap = document.createElement('div');
    wrap.className = 'notify is-open';
    wrap.innerHTML = '<div class="panel picker-panel">' +
      '<h2>보관함에서 고르기</h2>' +
      '<div class="photos" id="pickGrid">' + S.uploads.map(function (u) {
        return '<div class="photo" data-pick="' + esc(u.url) + '"><img src="' + esc(u.url) + '" alt=""></div>';
      }).join('') + '</div>' +
      '<div class="btn-row"><button class="b ghost" data-close>닫기</button></div>' +
    '</div>';
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.hasAttribute('data-close')) { wrap.remove(); return; }
      var pick = e.target.closest('[data-pick]');
      if (pick) {
        setSlot(S.pickTarget, pick.getAttribute('data-pick'));
        wrap.remove();
      }
    });
    document.body.appendChild(wrap);
  }

  /* ── 데이터 갱신 ──────────────────────────────────── */
  function refreshOrders() {
    return api('/orders').then(function (d) { S.orders = d; })
      .then(refreshSummary);
  }
  function refreshInquiries() {
    return api('/inquiries').then(function (d) { S.inquiries = d; })
      .then(refreshSummary);
  }
  function refreshUploads() {
    return api('/uploads').then(function (d) { S.uploads = d; });
  }
  function refreshSummary() {
    return api('/summary').then(function (d) { S.summary = d; paintBadges(); });
  }
  function refreshAnalytics() {
    return api('/analytics?days=' + S.analyticsDays)
      .then(function (d) { S.analytics = d; })
      .catch(function () { S.analytics = null; });
  }

  /* ── 부팅 ─────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { location.hash = go.getAttribute('data-go'); return; }
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var fn = actions[btn.getAttribute('data-act')];
    if (typeof fn !== 'function') return;
    if (btn.tagName === 'BUTTON') e.preventDefault();
    fn(btn.getAttribute('data-a'), btn.getAttribute('data-b'));
  });

  window.addEventListener('hashchange', function () {
    render();
    if (location.hash === '#analytics' && !S.analytics) refreshAnalytics().then(render);
  });

  Promise.all([
    api('/catalog').then(function (d) { S.catalog = d; }),
    api('/orders').then(function (d) { S.orders = d; }),
    api('/inquiries').then(function (d) { S.inquiries = d; }),
    api('/subscribers').then(function (d) { S.subscribers = d; }),
    api('/uploads').then(function (d) { S.uploads = d; }),
    api('/summary').then(function (d) { S.summary = d; })
  ]).then(function () {
    render();
    if (location.hash === '#analytics') refreshAnalytics().then(render);
  }).catch(function (e) {
    el('view').innerHTML =
      '<div class="page-head"><h1>연결하지 못했습니다</h1></div>' +
      '<div class="note warn">서버에서 데이터를 불러오지 못했습니다. (' + esc(e.message) + ')<br>' +
      '잠시 후 새로고침해 보시고, 계속 같으면 개발자에게 알려 주세요.</div>';
  });
})();
