/* 운향재 관리자
   운영자가 매일 실제로 하는 일 순서로 화면을 짰다.
   오늘 → 주문 → 배송 → 영업 → 고객 → 분석 → 상품 · 사진 → 설정

   숫자는 혼자 있으면 판단에 쓰이지 못한다. 어제보다, 지난달보다, 직전 기간보다
   어떤지를 항상 옆에 붙인다.

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
    catalog: null, orders: [], inquiries: [], subscribers: [], users: [], resets: [],
    uploads: [], summary: null, analytics: null,
    orderTab: 'received', analyticsDays: 30, pickTarget: null,
    orderDays: 0,          // 0 = 전체 기간
    custSeg: 'all',        // 고객 세그먼트
    dealStage: 'all'       // 영업 단계
  };

  var ORDER_STATUS = {
    received: '신규 주문', ready: '발송 준비', shipped: '발송 완료', canceled: '취소 · 환불'
  };

  /* ── 뷰 ───────────────────────────────────────────── */
  var views = {};

  /* 1. 오늘 ───────────────────────────────────────────
     아침에 이 화면만 보고 하루를 시작할 수 있어야 한다.
     처리할 일 → 오늘의 숫자 → 최근 흐름 순서다. */
  views.dashboard = function () {
    var s = S.summary || {};
    var p = s.pending || {};
    var t = s.today || {}, y = s.yesterday || {};
    var m = s.month || {}, lm = s.lastMonth || {};
    var tr = s.trend || [];

    function pct(now, was) {
      if (!was) return now ? null : 0;
      return +(((now - was) / was) * 100).toFixed(1);
    }

    var jobs = (p.newOrders || 0) + (p.toShip || 0) + (p.openInquiries || 0) +
               (p.openDeals || 0) + (p.lowStock || 0);

    return head('오늘', new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) +
        ' · 아침에 이 화면만 보시면 됩니다.') +

      '<div class="panel"><h2>지금 처리해야 할 것' +
        (jobs ? ' <span class="count">' + jobs + '</span>' : '') + '</h2>' +
        '<div class="todo">' +
          todo('새로 들어온 주문', p.newOrders, '#orders', '확인하고 발송 준비로 넘기세요') +
          todo('발송해야 할 주문', p.toShip, '#shipping', '송장번호를 넣으면 완료됩니다') +
          todo('답변 안 한 문의', p.openInquiries, '#inquiries', '영업일 2일 안에 답장') +
          todo('진행 중인 영업', p.openDeals, '#deals', '공간 제안 · 도매 상담') +
          todo('재고 부족', p.lowStock, '#products', '5개 이하로 남은 상품') +
        '</div>' +
        (!jobs ? '<p class="note mt-1">지금은 처리할 일이 없습니다.</p>' : '') +
      '</div>' +

      '<div class="grid grid-4 mb-3">' +
        stat('오늘 매출', won(t.revenue), '어제 ' + won(y.revenue), pct(t.revenue, y.revenue)) +
        stat('오늘 주문', (t.orders || 0) + '건', '어제 ' + (y.orders || 0) + '건', pct(t.orders, y.orders)) +
        stat('이번 달 매출', won(m.revenue), '지난달 ' + won(lm.revenue), pct(m.revenue, lm.revenue)) +
        stat('출시 알림 대기', (s.subscribers || 0) + '명', '세 번째 향을 기다리는 분') +
      '</div>' +

      '<div class="panel"><h2>최근 2주 매출</h2>' +
        (tr.some(function (d) { return d.revenue; })
          ? spark(tr.map(function (d) { return d.revenue; }),
                  tr.map(function (d) { return d.date.slice(5) + ' · ' + won(d.revenue); })) +
            '<div class="chart-x"><span>' + (tr[0] ? tr[0].date.slice(5) : '') + '</span>' +
              '<span>합계 ' + won(tr.reduce(function (n, d) { return n + d.revenue; }, 0)) + '</span>' +
              '<span>' + (tr.length ? tr[tr.length - 1].date.slice(5) : '') + '</span></div>'
          : blank('아직 매출이 없습니다.',
              '결제를 연결하고 첫 주문이 들어오면 이 자리에 2주치 흐름이 그려집니다.')) +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>최근 주문</h2>' +
          ((s.recentOrders || []).length
            ? '<div class="table-wrap"><table><thead><tr><th>주문</th><th>주문자</th><th class="num">금액</th><th>상태</th></tr></thead><tbody>' +
              s.recentOrders.map(function (o) {
                return '<tr><td>' + esc(o.id) + '<br><span class="muted-xs">' + dstr(o.at) + '</span></td>' +
                  '<td>' + esc(by(o).name) + '</td>' +
                  '<td class="num">' + won(((o.totals || {}).total || 0)) + '</td>' +
                  '<td>' + statusTag(o.status) + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : blank('아직 주문이 없습니다.')) +
          '<div class="btn-row"><button class="b ghost" data-go="#orders">주문 전체 보기</button></div>' +
        '</div>' +

        '<div class="panel"><h2>재고 부족</h2>' +
          ((s.lowStock || []).length
            ? '<div class="table-wrap"><table><thead><tr><th>상품</th><th>옵션</th><th class="num">남은 수량</th></tr></thead><tbody>' +
              s.lowStock.map(function (x) {
                return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.option) + '</td>' +
                  '<td class="num"><span class="tag warn">' + x.stock + '</span></td></tr>';
              }).join('') + '</tbody></table></div>'
            : blank('재고가 넉넉합니다.')) +
          '<div class="btn-row"><button class="b ghost" data-go="#products">재고 고치기</button></div>' +
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
  /* 늘었는지 줄었는지를 한 눈에. 직전 기간이 0 이면 비교하지 않는다. */
  function trend(pct, invert) {
    if (pct == null) return '<span class="trend flat">비교 불가</span>';
    if (!pct) return '<span class="trend flat">변화 없음</span>';
    var up = pct > 0;
    var good = invert ? !up : up;
    return '<span class="trend ' + (good ? 'up' : 'down') + '">' +
      (up ? '▲' : '▼') + ' ' + Math.abs(pct) + '%</span>';
  }

  /* 작은 막대 그래프. 값의 배열만 주면 된다. */
  function spark(values, labels) {
    var max = Math.max.apply(null, values.concat([1]));
    return '<div class="spark">' + values.map(function (v, i) {
      return '<div title="' + esc((labels && labels[i]) || '') + '"><i data-h="' +
        Math.round(v / max * 100) + '"></i></div>';
    }).join('') + '</div>';
  }

  /* 아직 데이터가 없을 때, 무엇을 하면 채워지는지까지 알려 준다. */
  function blank(msg, hint) {
    return '<div class="blank"><p>' + esc(msg) + '</p>' +
      (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
  }

  function stat(label, val, sub, pct, invert) {
    return '<div class="stat"><span>' + esc(label) + '</span><strong>' + val + '</strong>' +
      (sub || pct != null
        ? '<em>' + (pct !== undefined ? trend(pct, invert) + ' ' : '') + esc(sub || '') + '</em>'
        : '') + '</div>';
  }
  /* 주문 한 건에 배송 정보가 비어 있어도 화면 전체가 죽지 않게 한다. */
  function sh(o) { return (o && o.shipping) || {}; }
  function by(o) { return (o && o.buyer) || {}; }

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
    if (S.orderDays) {
      var since = new Date();
      since.setDate(since.getDate() - S.orderDays);
      list = list.filter(function (o) { return new Date(o.at) >= since; });
    }

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
        '<div class="range">' +
          [[0, '전체'], [7, '최근 7일'], [30, '최근 30일']].map(function (o) {
            return '<button data-act="orderDays" data-a="' + o[0] + '"' +
              (S.orderDays === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div id="orderList">' + orderCards(list) + '</div>';
  };

  function orderCards(list) {
    if (!list.length) return '<p class="empty-row">해당하는 주문이 없습니다.</p>';
    return list.map(function (o) {
      var items = (o.lines || []).map(function (l) { return l.name + ' × ' + l.qty; }).join(', ');
      return '<div class="order-card" data-order="' + esc(o.id) + '">' +
        '<div class="order-head" data-act="toggleOrder" data-a="' + esc(o.id) + '">' +
          '<div><span class="who">' + esc(by(o).name) + '</span>' +
            (o.gift ? ' <span class="tag soft">선물</span>' : '') +
            '<div class="sub">' + esc(o.id) + ' · ' + dstr(o.at) + '</div></div>' +
          '<div><div>' + esc(items) + '</div>' +
            '<div class="sub">' + esc(sh(o).addr || '') + '</div></div>' +
          '<div class="order-amt"><strong>' + won(((o.totals || {}).total || 0)) + '</strong><br>' + statusTag(o.status) + '</div>' +
        '</div>' +
        '<div class="order-body" hidden>' +
          '<dl class="kv">' +
            '<dt>연락처</dt><dd><span class="copyable" data-act="copy" data-a="' + esc(by(o).phone) + '">' + esc(by(o).phone) + '</span></dd>' +
            '<dt>이메일</dt><dd>' + esc(by(o).email) + '</dd>' +
            '<dt>받는 분</dt><dd>' + esc(sh(o).receiver || '') + '</dd>' +
            '<dt>주소</dt><dd><span class="copyable" data-act="copy" data-a="' +
              esc('(' + (sh(o).zip || '') + ') ' + (sh(o).addr || '')) + '">(' +
              esc(sh(o).zip || '') + ') ' + esc(sh(o).addr || '') + '</span></dd>' +
            '<dt>요청사항</dt><dd>' + esc(sh(o).memo || '—') + '</dd>' +
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
          ? '<div class="table-wrap wide"><table><thead><tr>' +
            '<th class="nowrap">주문번호</th><th class="nowrap">받는 분</th><th>주소</th><th>상품</th>' +
            '<th class="nowrap">택배사</th><th class="nowrap">송장번호</th>' +
            '</tr></thead><tbody>' +
            ready.map(function (o) {
              return '<tr>' +
                '<td class="nowrap">' + esc(o.id) + '</td>' +
                '<td class="nowrap">' + esc(sh(o).receiver || by(o).name) + '<br><span class="muted-xs">' + esc(by(o).phone) + '</span></td>' +
                '<td>(' + esc(sh(o).zip || '') + ') ' + esc(sh(o).addr || '') +
                  (sh(o).memo ? '<br><span class="muted-xs">' + esc(sh(o).memo) + '</span>' : '') + '</td>' +
                '<td class="nowrap">' + (o.lines || []).map(function (l) { return esc(l.name) + ' × ' + l.qty; }).join('<br>') +
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
              return '<tr><td>' + esc(o.id) + '</td><td>' + esc(sh(o).receiver || by(o).name) + '</td>' +
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
        '<p class="note mb-1">사이트에는 <strong>이름 공개</strong> 이상인 장만 글자로 나옵니다. ' +
          '<strong>비워 둠</strong>인 장은 이름도 한자도 나오지 않고 빈 자리로만 보입니다.</p>' +
        '<div class="table-wrap"><table><thead><tr><th>요소</th><th>부제</th><th class="num">상품 수</th><th>공개 단계</th></tr></thead><tbody>' +
        (C.collections || []).map(function (c) {
          var n = (C.products || []).filter(function (p) { return p.collectionId === c.id; }).length;
          return '<tr><td><strong>' + esc(c.hanja + ' ' + c.ko) + '</strong></td>' +
            '<td>' + esc(c.subtitle || '') + '</td><td class="num">' + n + '</td>' +
            '<td><select class="sel-sm" data-col="' + esc(c.id) + '">' +
              ['veiled:비워 둠', 'named:이름 공개', 'open:진행 중'].map(function (o) {
                var val = o.split(':')[0], t = o.split(':')[1];
                var now = c.reveal || (c.status === 'active' ? 'open' : 'veiled');
                return '<option value="' + val + '"' + (now === val ? ' selected' : '') + '>' + t + '</option>';
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
    /* 공간 제안과 도매는 상담이 길게 이어지므로 영업 화면에서 따로 본다. */
    var mine = S.inquiries.filter(function (q) { return q.type !== 'b2b' && q.type !== 'wholesale'; });
    var open = mine.filter(function (q) { return q.status === 'open'; });
    var done = mine.filter(function (q) { return q.status !== 'open'; });
    var deals = S.inquiries.length - mine.length;

    return head('문의', '영업일 기준 2일 안에 답장하는 것이 원칙입니다.',
        deals ? '<button class="b ghost" data-go="#deals">공간 · 도매 ' + deals + '건 →</button>' : '') +
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

  /* 7. 영업 — 공간 제안 · 도매 ────────────────────────
     문의함에 섞여 있으면 상담이 어디까지 갔는지 알 수 없다.
     한 건이 계약까지 가는 동안 거치는 칸을 그대로 화면에 둔다. */
  var DEAL_STAGE = {
    new: '새 문의', talking: '상담 중', quoted: '견적 보냄', won: '성사', lost: '보류 · 무산'
  };
  var DEAL_ORDER = ['new', 'talking', 'quoted', 'won', 'lost'];

  function stageOf(q) { return q.stage || (q.status === 'open' ? 'new' : 'won'); }

  views.deals = function () {
    var deals = S.inquiries.filter(function (q) { return q.type === 'b2b' || q.type === 'wholesale'; });
    var counts = {};
    DEAL_ORDER.forEach(function (k) {
      counts[k] = deals.filter(function (q) { return stageOf(q) === k; }).length;
    });
    var list = S.dealStage === 'all' ? deals
      : deals.filter(function (q) { return stageOf(q) === S.dealStage; });
    list = list.slice().sort(function (x, y) { return (y.at || '').localeCompare(x.at || ''); });

    var live = deals.filter(function (q) { return ['new', 'talking', 'quoted'].indexOf(stageOf(q)) >= 0; });

    return head('영업', '공간 제안과 도매 문의를 계약까지 따라갑니다.',
        '<button class="b ghost" data-act="exportDeals">명단 내려받기</button>') +

      '<div class="grid grid-4 mb-3">' +
        stat('진행 중', live.length + '건', '상담이 살아 있는 건') +
        stat('견적 보냄', counts.quoted + '건', '답을 기다리는 중') +
        stat('성사', counts.won + '건', '계약까지 간 건') +
        stat('전체', deals.length + '건', '누적 문의') +
      '</div>' +

      '<div class="tabs">' +
        '<button class="' + (S.dealStage === 'all' ? 'is-on' : '') + '" data-act="dealStage" data-a="all">전체 ' + deals.length + '</button>' +
        DEAL_ORDER.map(function (k) {
          return '<button class="' + (S.dealStage === k ? 'is-on' : '') + '" data-act="dealStage" data-a="' + k + '">' +
            DEAL_STAGE[k] + ' ' + counts[k] + '</button>';
        }).join('') +
      '</div>' +

      (list.length
        ? '<div class="deal-list">' + list.map(function (q) {
            var st = stageOf(q);
            return '<div class="deal">' +
              '<div class="deal-top">' +
                '<div>' +
                  '<strong>' + esc(q.company || q.name) + '</strong>' +
                  '<span class="tag soft ml-xs">' + esc(TYPE_LABEL[q.type] || q.type) + '</span>' +
                  '<div class="sub">' + esc(q.name) + ' · ' + esc(q.phone || '연락처 없음') + ' · ' + dstr(q.at) + '</div>' +
                '</div>' +
                '<div class="deal-meta">' +
                  (q.space ? '<span class="tag">' + esc(q.space) + '</span> ' : '') +
                  (q.quantity ? '<span class="tag">' + esc(q.quantity) + '</span>' : '') +
                '</div>' +
              '</div>' +
              '<p class="deal-msg">' + esc(q.message).replace(/\n/g, '<br>') + '</p>' +
              (q.memo ? '<p class="deal-memo">메모 · ' + esc(q.memo) + '</p>' : '') +
              '<div class="deal-foot">' +
                '<div class="stage-pick">' +
                  DEAL_ORDER.map(function (k) {
                    return '<button class="' + (st === k ? 'is-on' : '') + '" data-act="setStage" ' +
                      'data-a="' + esc(q.id) + '" data-b="' + k + '">' + DEAL_STAGE[k] + '</button>';
                  }).join('') +
                '</div>' +
                '<div class="btn-row">' +
                  '<button class="b sm ghost" data-act="dealMemo" data-a="' + esc(q.id) + '">메모</button>' +
                  '<a class="b sm ghost" href="mailto:' + esc(q.email) + '?subject=' +
                    encodeURIComponent('[운향재] ' + (q.company || q.name) + '님 문의 답변드립니다') + '">메일 쓰기</a>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') + '</div>'
        : blank('해당하는 건이 없습니다.',
            '공간 페이지의 B2B 문의와 도매 문의가 여기로 모입니다.')) ;
  };

  /* 8. 고객 ───────────────────────────────────────────
     이름만 나열하면 쓸 데가 없다. 누구에게 무엇을 보낼지가 보여야 한다. */
  var SEGMENTS = {
    all: '전체', vip: 'VIP', repeat: '재구매', once: '한 번 구매', sleep: '휴면',
    member: '회원', guest: '비회원'
  };

  /* 이 이메일이 회원인가. 주문에는 회원 번호가 남지만 옛 주문에는 없어서
     이메일로도 한 번 더 본다. */
  function memberOf(email) {
    if (!email) return null;
    var e = String(email).toLowerCase();
    return S.users.filter(function (u) { return u.email === e; })[0] || null;
  }

  function buyerList() {
    var buyers = {};
    S.orders.forEach(function (o) {
      if (o.status === 'canceled') return;
      var k = by(o).email || by(o).phone;
      if (!k) return;
      buyers[k] = buyers[k] || {
        name: by(o).name, email: by(o).email, phone: by(o).phone,
        count: 0, amount: 0, last: o.at
      };
      buyers[k].count++;
      buyers[k].amount += (o.totals && ((o.totals || {}).total || 0)) || 0;
      if (o.at > buyers[k].last) buyers[k].last = o.at;
    });
    var now = Date.now();
    return Object.keys(buyers).map(function (k) {
      var x = buyers[k];
      x.days = Math.floor((now - new Date(x.last)) / 86400000);
      /* 한 사람이 여러 칸에 들어갈 수 있다. 화면에는 가장 중요한 것 하나만 띄운다. */
      x.segs = [];
      if (x.amount >= 500000) x.segs.push('vip');
      if (x.count > 1) x.segs.push('repeat'); else x.segs.push('once');
      if (x.days > 180) x.segs.push('sleep');
      var m = memberOf(x.email);
      x.member = !!m;
      x.marketing = !!(m && m.marketing);
      x.segs.push(m ? 'member' : 'guest');
      return x;
    }).sort(function (m, n) { return n.amount - m.amount; });
  }

  views.customers = function () {
    var all = buyerList();
    var counts = { all: all.length };
    Object.keys(SEGMENTS).forEach(function (k) {
      if (k === 'all') return;
      counts[k] = all.filter(function (x) { return x.segs.indexOf(k) >= 0; }).length;
    });
    var list = S.custSeg === 'all' ? all
      : all.filter(function (x) { return x.segs.indexOf(S.custSeg) >= 0; });

    var totalAmount = all.reduce(function (n, x) { return n + x.amount; }, 0);
    var avg = all.length ? Math.round(totalAmount / all.length) : 0;

    return head('고객', '누구에게 무엇을 보낼지 정하는 화면입니다.',
        '<button class="b ghost" data-act="copyEmails">보이는 이메일 모두 복사</button>' +
        '<button class="b ghost" data-act="exportCustomers">명단 내려받기</button>') +

      '<div class="grid grid-4 mb-3">' +
        stat('구매 고객', all.length + '명', '취소 건 제외') +
        stat('1인 평균 구매액', won(avg), '누적 ' + won(totalAmount)) +
        stat('재구매 고객', (counts.repeat || 0) + '명',
          all.length ? Math.round((counts.repeat || 0) / all.length * 100) + '%' : '—') +
        stat('회원', S.users.length + '명',
          (counts.member || 0) + '명이 구매까지 하셨습니다') +
      '</div>' +

      '<div class="tabs">' +
        Object.keys(SEGMENTS).map(function (k) {
          return '<button class="' + (S.custSeg === k ? 'is-on' : '') + '" data-act="custSeg" data-a="' + k + '">' +
            SEGMENTS[k] + ' ' + (counts[k] || 0) + '</button>';
        }).join('') +
      '</div>' +
      '<p class="note mb-1">' + esc(SEG_HINT[S.custSeg] || '') + '</p>' +

      '<div class="filters"><input id="custSearch" placeholder="이름 · 이메일 · 연락처로 찾기"></div>' +

      '<div id="custList">' + custTable(list) + '</div>' +

      resetPanel() +

      '<div class="panel mt-3"><h2>출시 알림 신청 ' + S.subscribers.length + '명</h2>' +
        '<p class="note mb-1">아직 사지 않았지만 기다리고 있는 분들입니다. ' +
          '세 번째 향이 나오면 여기가 첫 매출입니다.</p>' +
        (S.subscribers.length
          ? '<div class="btn-row mb-1">' +
              '<button class="b ghost" data-act="copySubs">이메일 모두 복사</button>' +
              '<button class="b ghost" data-act="exportSubscribers">내려받기</button>' +
            '</div>' +
            '<div class="table-wrap"><table><thead><tr><th>이메일</th><th>신청일</th></tr></thead><tbody>' +
            S.subscribers.map(function (x) {
              return '<tr><td>' + esc(x.email) + '</td><td>' + dstr(x.at) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : blank('아직 신청자가 없습니다.',
              'SHOP 의 세 번째 향 카드에서 신청을 받습니다.')) +
      '</div>';
  };

  var SEG_HINT = {
    all: '구매하신 모든 분입니다.',
    vip: '누적 50만원 이상 사신 분들. 새 장이 열릴 때 가장 먼저 알려야 할 분들입니다.',
    repeat: '두 번 이상 사신 분들. 이 비율이 브랜드가 살아 있는지를 말해 줍니다.',
    once: '한 번만 사신 분들. 두 번째 구매로 넘어가게 하는 것이 다음 과제입니다.',
    sleep: '마지막 구매가 6개월을 넘긴 분들. 안부와 함께 새 소식을 보내 보세요.',
    member: '계정을 만드신 분들. 다시 오실 때 주소를 다시 적지 않으셔도 됩니다.',
    guest: '계정 없이 주문하신 분들. 다음 주문 때 가입을 권해 볼 수 있습니다.'
  };

  /* 비밀번호를 잊은 분에게 보낼 링크.
     메일 발송이 아직 없어서, 운영자가 복사해 직접 보내야 한다. */
  function resetPanel() {
    if (!S.resets.length) return '';
    return '<div class="panel mt-3"><h2>보내야 할 비밀번호 재설정 링크 ' + S.resets.length + '건</h2>' +
      '<p class="note mb-1">비밀번호를 잊으신 분이 요청한 링크입니다. ' +
        '<strong>메일 자동 발송이 아직 연결되지 않아</strong> 아래 주소를 복사해 직접 보내 주셔야 합니다. ' +
        '30분이 지나면 쓸 수 없습니다.</p>' +
      '<div class="table-wrap"><table><thead><tr><th>회원</th><th>요청 시각</th><th>만료</th><th>링크</th></tr></thead><tbody>' +
      S.resets.map(function (r) {
        return '<tr><td>' + esc(r.name || '—') + '<br><span class="muted-xs">' + esc(r.email) + '</span></td>' +
          '<td>' + dstr(r.at) + '</td><td>' + dstr(r.expires) + '</td>' +
          '<td><button class="b sm ghost" data-act="copy" data-a="' + esc(r.url) + '">링크 복사</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function custTable(list) {
    if (!list.length) return blank('해당하는 고객이 없습니다.');
    return '<div class="table-wrap"><table><thead><tr><th>이름</th><th>연락처</th>' +
      '<th class="num">주문</th><th class="num">누적 구매액</th><th>마지막 주문</th><th>구분</th></tr></thead><tbody>' +
      list.map(function (x) {
        var tags = x.segs.filter(function (k) { return k !== 'once' && k !== 'guest'; })
          .map(function (k) {
            return '<span class="tag ' + (k === 'vip' ? 'on' : (k === 'sleep' ? 'warn' : 'soft')) + '">' +
              SEGMENTS[k] + '</span>';
          }).join(' ') +
          (x.marketing ? ' <span class="tag">소식 수신</span>' : '');
        return '<tr><td>' + esc(x.name) + '</td>' +
          '<td><span class="copyable" data-act="copy" data-a="' + esc(x.email) + '">' + esc(x.email) + '</span>' +
            '<br><span class="muted-xs">' + esc(x.phone) + '</span></td>' +
          '<td class="num">' + x.count + '</td><td class="num">' + won(x.amount) + '</td>' +
          '<td>' + dstr(x.last) + '<br><span class="muted-xs">' + x.days + '일 전</span></td>' +
          '<td>' + tags + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* 9. 분석 ───────────────────────────────────────────
     모든 숫자에 직전 같은 기간을 붙인다. 30일을 보고 있으면 그 앞 30일이
     비교 대상이다. "늘었다 / 줄었다"가 없으면 숫자는 판단에 쓰이지 못한다. */
  views.analytics = function () {
    var a = S.analytics;
    if (!a) return head('분석', '불러오는 중…') + '<p class="empty-row">잠시만 기다려 주세요.</p>';

    var t = a.totals, d = a.delta || {}, pv = a.prev || {};
    var maxSess = Math.max.apply(null, a.daily.map(function (x) { return x.sessions; }).concat([1]));
    var maxRev = Math.max.apply(null, a.daily.map(function (x) { return x.revenue; }).concat([1]));
    var maxHour = Math.max.apply(null, a.hours.map(function (h) { return h.count; }).concat([1]));
    var hasRevenue = a.daily.some(function (x) { return x.revenue; });

    return head('분석', a.range.from + ' ~ ' + a.range.to +
        ' · 직전 같은 기간(' + a.prevRange.from + ' ~ ' + a.prevRange.to + ')과 견줍니다.',
        '<div class="range">' +
          [7, 30, 90].map(function (n) {
            return '<button data-act="setDays" data-a="' + n + '"' +
              (S.analyticsDays === n ? ' class="is-on"' : '') + '>' + n + '일</button>';
          }).join('') +
        '</div>' +
        '<button class="b ghost" data-act="exportAnalytics">숫자 내려받기</button>') +

      '<div class="grid grid-4 mb-3">' +
        stat('매출', won(t.revenue), '직전 ' + won(pv.revenue), d.revenue) +
        stat('주문', t.orders + '건', '직전 ' + (pv.orders || 0) + '건', d.orders) +
        stat('객단가', won(t.aov), '주문 한 건당', d.aov) +
        stat('방문자', t.sessions.toLocaleString('ko-KR') + '명', '직전 ' + (pv.sessions || 0) + '명', d.sessions) +
      '</div>' +

      '<div class="grid grid-2 mb-3">' +
        '<div class="panel"><h2>날짜별 매출</h2>' +
          (hasRevenue
            ? '<div class="chart">' + a.daily.map(function (x) {
                return '<div title="' + x.date + ' · ' + won(x.revenue) + ' · ' + x.orders + '건">' +
                  '<i data-h="' + Math.round(x.revenue / maxRev * 100) + '"></i></div>';
              }).join('') + '</div>' +
              '<div class="chart-x"><span>' + a.daily[0].date.slice(5) + '</span>' +
                '<span>가장 많은 날 ' + won(maxRev) + '</span>' +
                '<span>' + a.daily[a.daily.length - 1].date.slice(5) + '</span></div>'
            : blank('아직 매출이 없습니다.', '결제를 연결하면 여기부터 채워집니다.')) +
        '</div>' +

        '<div class="panel"><h2>날짜별 방문자</h2>' +
          '<div class="chart alt">' + a.daily.map(function (x) {
            return '<div title="' + x.date + ' · ' + x.sessions + '명">' +
              '<i data-h="' + Math.round(x.sessions / maxSess * 100) + '"></i></div>';
          }).join('') + '</div>' +
          '<div class="chart-x"><span>' + a.daily[0].date.slice(5) + '</span>' +
            '<span>구매 전환 ' + t.conversion + '%</span>' +
            '<span>' + a.daily[a.daily.length - 1].date.slice(5) + '</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="panel"><h2>어디서 들어와서 얼마를 사 갔나</h2>' +
        '<p class="note mb-1">방문 수가 많은 경로가 아니라 <strong>실제로 사 가는 경로</strong>에 돈을 쓰세요. ' +
          '전환율이 높은데 방문이 적은 경로가 가장 키울 만한 곳입니다.</p>' +
        (a.sources.length
          ? '<div class="table-wrap"><table><thead><tr><th>유입 경로</th><th class="num">방문</th>' +
            '<th class="num">주문</th><th class="num">구매 전환</th><th class="num">매출</th><th>비중</th>' +
            '</tr></thead><tbody>' +
            a.sources.map(function (x) {
              var share = t.sessions ? Math.round(x.sessions / t.sessions * 100) : 0;
              return '<tr><td>' + esc(x.name) + '</td>' +
                '<td class="num">' + x.sessions + '</td>' +
                '<td class="num">' + x.orders + '</td>' +
                '<td class="num">' + (x.conversion ? '<strong>' + x.conversion + '%</strong>' : '—') + '</td>' +
                '<td class="num">' + (x.revenue ? won(x.revenue) : '—') + '</td>' +
                '<td><span class="bar sm"><i data-w="' + share + '"></i></span></td></tr>';
            }).join('') + '</tbody></table></div>'
          : blank('아직 유입 데이터가 없습니다.',
              '인스타그램 프로필이나 스마트스토어에 링크를 걸면 경로별로 잡히기 시작합니다.')) +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>구매까지 가는 길</h2>' +
          '<p class="note mb-1">가장 많이 빠지는 칸이 지금 고쳐야 할 화면입니다.</p>' +
          '<div class="funnel">' + a.funnel.map(function (x, i) {
            var prevStep = i ? a.funnel[i - 1].sessions : 0;
            var drop = i && prevStep ? Math.round((1 - x.sessions / prevStep) * 100) : 0;
            return '<div class="funnel-row"><span>' + esc(x.label) + '</span>' +
              '<span class="funnel-bar"><i data-w="' + x.rate + '"></i></span>' +
              '<span class="n">' + x.sessions + '명' +
                (i && drop > 0 ? ' <em class="drop">−' + drop + '%</em>' : '') + '</span></div>';
          }).join('') + '</div>' +
        '</div>' +

        '<div class="panel"><h2>처음 사는 분과 다시 오는 분</h2>' +
          '<p class="note mb-1">다시 오는 비율이 오르면 향과 경험이 맞았다는 뜻입니다. 광고보다 먼저 봐야 할 숫자입니다.</p>' +
          (t.orders
            ? '<div class="split-bar">' +
                '<span class="a" data-w="' + Math.round(a.buyers.first / t.orders * 100) + '">첫 구매 ' + a.buyers.first + '</span>' +
                '<span class="b2" data-w="' + Math.round(a.buyers.repeat / t.orders * 100) + '">재구매 ' + a.buyers.repeat + '</span>' +
              '</div>' +
              '<p class="big-num">' + a.buyers.repeatRate + '<span>% 재구매</span></p>'
            : blank('아직 주문이 없습니다.')) +
          '<h3 class="mt-2">기기</h3>' +
          a.devices.map(function (x) {
            var total = a.devices.reduce(function (n, y) { return n + y.count; }, 0) || 1;
            return '<div class="meter"><span>' + esc(x.name) + '</span>' +
              '<span class="bar"><i data-w="' + Math.round(x.count / total * 100) + '"></i></span>' +
              '<span class="v">' + Math.round(x.count / total * 100) + '%</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="panel"><h2>상품별 성과</h2>' +
        '<p class="note mb-1">안 팔리는 상품이 아니라 <strong>많이 봤는데 안 사는 상품</strong>을 찾으세요. ' +
          '사진이나 설명을 고쳐야 한다는 뜻입니다.</p>' +
        (a.products.length
          ? '<div class="table-wrap"><table><thead><tr><th>상품</th><th class="num">조회</th>' +
            '<th class="num">담기</th><th class="num">구매</th><th class="num">담기 전환</th>' +
            '<th class="num">구매 전환</th><th class="num">매출</th><th>진단</th></tr></thead><tbody>' +
            a.products.map(function (x) {
              var prod = (S.catalog.products || []).concat(S.catalog.sets || [])
                .filter(function (y) { return y.slug === x.slug; })[0];
              var hint = '';
              if (x.views >= 20 && x.buyRate < 1) hint = '<span class="tag warn">상세를 고쳐 보세요</span>';
              else if (x.cartRate >= 10 && x.buyRate < x.cartRate / 3) hint = '<span class="tag warn">주문서에서 빠집니다</span>';
              else if (x.buyRate >= 3) hint = '<span class="tag on">잘 팔립니다</span>';
              return '<tr><td>' + esc(prod ? prod.nameKo : x.slug) + '</td>' +
                '<td class="num">' + x.views + '</td><td class="num">' + x.carts + '</td>' +
                '<td class="num">' + x.purchased + '</td>' +
                '<td class="num">' + x.cartRate + '%</td>' +
                '<td class="num">' + x.buyRate + '%</td>' +
                '<td class="num">' + won(x.revenue) + '</td>' +
                '<td>' + hint + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : blank('아직 상품 조회 데이터가 없습니다.')) +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>어느 화면을 보나</h2>' +
          (a.pages.length
            ? '<div class="table-wrap"><table><thead><tr><th>화면</th><th class="num">조회</th><th class="num">머문 시간</th></tr></thead><tbody>' +
              a.pages.map(function (x) {
                return '<tr><td>' + esc(x.path) + '</td><td class="num">' + x.views + '</td>' +
                  '<td class="num">' + (x.avgDwell ? x.avgDwell + '초' : '—') + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : blank('아직 데이터가 없습니다.')) +
        '</div>' +

        '<div class="panel"><h2>얼마나 읽고 가나</h2>' +
          '<p class="note mb-1">아래로 끝까지 내려간 비율입니다. 이야기를 끝까지 읽었다는 뜻이라 ' +
            '이 브랜드에서는 매출보다 먼저 보는 숫자입니다.</p>' +
          a.scroll.map(function (x) {
            return '<div class="meter"><span>' + x.depth + '%</span>' +
              '<span class="bar"><i data-w="' + x.rate + '"></i></span>' +
              '<span class="v">' + x.rate + '%</span></div>';
          }).join('') +
          '<h3 class="mt-2">시간대별 방문</h3>' +
          '<p class="note mb-1">가장 높은 시간대에 글을 올리시면 됩니다.</p>' +
          '<div class="chart short">' + a.hours.map(function (h) {
            return '<div title="' + h.hour + '시 · ' + h.count + '"><i data-h="' +
              Math.round(h.count / maxHour * 100) + '"></i></div>';
          }).join('') + '</div>' +
          '<div class="chart-x"><span>0시</span><span>12시</span><span>23시</span></div>' +
        '</div>' +
      '</div>';
  };

  /* 10. 설정 ───────────────────────────────────────────── */
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
        '<h3 class="mt-2">첫 화면 영상</h3>' +
        '<p class="note mb-1">사이트에 처음 들어왔을 때 화면을 가득 채우는 영상입니다. ' +
        '비워 두면 지금처럼 그림이 대신 나옵니다. <strong>사진</strong> 탭에 올린 뒤 주소를 복사해 넣으세요. ' +
        '소리 없이 8~15초 정도 도는 영상이 좋고, 파일은 8MB 이내를 권합니다.</p>' +
        '<div class="frow">' +
          f('랜딩 영상 주소', '<input id="s-hero" value="' + esc(b.heroVideo || '') + '" placeholder="/uploads/… 또는 https://…">') +
          f('영상 첫 화면 이미지 (선택)', '<input id="s-heroposter" value="' + esc(b.heroPoster || '') + '" placeholder="/uploads/…">') +
        '</div>' +
        '<div class="btn-row"><button class="b" data-act="saveHero">영상 저장</button></div>' +
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
    /* 자료 한 건이 이상해도 화면 전체가 하얗게 되지 않도록 감싼다.
       비개발자가 혼자 쓰는 화면이라, 멈추더라도 무엇이 문제인지는 보여야 한다. */
    try {
      view.innerHTML = views[hash]();
    } catch (err) {
      view.innerHTML =
        '<div class="page-head"><h1>이 화면을 그리지 못했습니다</h1></div>' +
        '<div class="note warn">자료 한 건이 예상과 달라 화면을 만들지 못했습니다.<br>' +
        '다른 메뉴는 정상입니다. 아래 내용을 개발자에게 그대로 전해 주세요.<br><br>' +
        '<code>' + esc(hash + ' · ' + (err && err.message)) + '</code></div>';
    }
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
      ['nav-todo', (p.newOrders || 0) + (p.toShip || 0) + (p.openInquiries || 0) +
        (p.openDeals || 0) + (p.lowStock || 0)],
      ['nav-orders', p.newOrders || 0],
      ['nav-ship', p.toShip || 0],
      ['nav-ask', p.openInquiries || 0],
      ['nav-deal', p.openDeals || 0]
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
            /* 사이트는 reveal 로 무엇을 보여줄지 정한다.
               status 는 옛 화면들이 아직 쓰고 있으므로 함께 맞춰 둔다. */
            c.reveal = sel.value;
            c.status = sel.value === 'open' ? 'active' : 'upcoming';
            c.statusLabel = { open: '진행중', named: '다음 장', veiled: '미정' }[sel.value];
          });
          saveCatalog('공개 단계를 바꿨습니다.');
        });
      });
    }
    if (hash === 'customers') {
      var cs = el('custSearch');
      if (cs) {
        cs.addEventListener('input', function () {
          var q = cs.value.trim().toLowerCase();
          var all = buyerList();
          var list = S.custSeg === 'all' ? all
            : all.filter(function (x) { return x.segs.indexOf(S.custSeg) >= 0; });
          if (q) {
            list = list.filter(function (x) {
              return ((x.name || '') + ' ' + (x.email || '') + ' ' + (x.phone || '')).toLowerCase().indexOf(q) >= 0;
            });
          }
          el('custList').innerHTML = custTable(list);
        });
      }
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
              return (o.id + ' ' + by(o).name + ' ' + by(o).phone).toLowerCase().indexOf(q) >= 0;
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

  /* 복사는 https 에서만 되는 API 라 안 되는 환경을 위한 대비를 둔다. */
  function copyText(text, msg) {
    if (!text) { toast('복사할 것이 없습니다.', true); return; }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'offscreen';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(msg); }
      catch (e) { toast('복사하지 못했습니다. 직접 선택해 주세요.', true); }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    } else fallback();
  }

  /* ── 동작 ─────────────────────────────────────────── */
  var actions = {
    orderTab: function (k) { S.orderTab = k; render(); },
    orderDays: function (n) { S.orderDays = Number(n); render(); },
    custSeg: function (k) { S.custSeg = k; render(); },
    dealStage: function (k) { S.dealStage = k; render(); },

    /* 영업 단계를 옮긴다. 성사·보류로 가면 문의함에서도 처리 완료로 본다. */
    setStage: function (id, stage) {
      var done = stage === 'won' || stage === 'lost';
      api('/inquiries/' + id, { method: 'PATCH', body: { stage: stage, status: done ? 'done' : 'open' } })
        .then(function () { return refreshInquiries(); })
        .then(function () { return refreshSummary(); })
        .then(function () { toast('단계를 옮겼습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    dealMemo: function (id) {
      var q = S.inquiries.filter(function (x) { return x.id === id; })[0] || {};
      var memo = prompt('상담 메모 (통화 내용, 다음에 할 일)', q.memo || '');
      if (memo === null) return;
      api('/inquiries/' + id, { method: 'PATCH', body: { memo: memo } })
        .then(function () { return refreshInquiries(); })
        .then(function () { toast('메모를 남겼습니다.'); render(); })
        .catch(function (e) { toast(e.message, true); });
    },

    /* 뉴스레터를 보내려면 결국 이메일 목록이 필요하다. 화면에 보이는 것만 담는다. */
    copyEmails: function () {
      var mails = [];
      document.querySelectorAll('#custList .copyable').forEach(function (n) {
        var v = n.getAttribute('data-a');
        if (v && mails.indexOf(v) < 0) mails.push(v);
      });
      copyText(mails.join(', '), mails.length + '명의 이메일을 복사했습니다.');
    },
    copySubs: function () {
      var mails = S.subscribers.map(function (x) { return x.email; });
      copyText(mails.join(', '), mails.length + '명의 이메일을 복사했습니다.');
    },

    exportCustomers: function () {
      var rows = [['이름', '이메일', '연락처', '주문 수', '누적 구매액', '마지막 주문', '구분']];
      buyerList().forEach(function (x) {
        rows.push([x.name, x.email, x.phone, x.count, x.amount, (x.last || '').slice(0, 10),
          x.segs.map(function (k) { return SEGMENTS[k]; }).join(' ')]);
      });
      csv('운향재_고객_' + today() + '.csv', rows);
    },

    exportDeals: function () {
      var rows = [['받은 날', '유형', '회사 · 공간', '담당자', '연락처', '이메일', '공간 유형', '예상 수량', '단계', '메모', '내용']];
      S.inquiries.filter(function (q) { return q.type === 'b2b' || q.type === 'wholesale'; })
        .forEach(function (q) {
          rows.push([(q.at || '').slice(0, 10), TYPE_LABEL[q.type] || q.type, q.company || '',
            q.name, q.phone || '', q.email, q.space || '', q.quantity || '',
            DEAL_STAGE[stageOf(q)], q.memo || '', q.message]);
        });
      csv('운향재_영업_' + today() + '.csv', rows);
    },

    exportAnalytics: function () {
      var a = S.analytics;
      if (!a) { toast('아직 불러오지 못했습니다.', true); return; }
      var rows = [['구간', a.range.from + ' ~ ' + a.range.to, '직전', a.prevRange.from + ' ~ ' + a.prevRange.to]];
      rows.push([]);
      rows.push(['항목', '이번 구간', '직전 구간', '증감(%)']);
      rows.push(['매출', a.totals.revenue, a.prev.revenue, a.delta.revenue]);
      rows.push(['주문', a.totals.orders, a.prev.orders, a.delta.orders]);
      rows.push(['객단가', a.totals.aov, a.prev.aov, a.delta.aov]);
      rows.push(['방문자', a.totals.sessions, a.prev.sessions, a.delta.sessions]);
      rows.push(['구매 전환율(%)', a.totals.conversion, a.prev.conversion, a.delta.conversion]);
      rows.push([]);
      rows.push(['날짜', '방문자', '주문', '매출']);
      a.daily.forEach(function (d) { rows.push([d.date, d.sessions, d.orders, d.revenue]); });
      rows.push([]);
      rows.push(['유입 경로', '방문', '주문', '구매 전환(%)', '매출']);
      a.sources.forEach(function (x) { rows.push([x.name, x.sessions, x.orders, x.conversion, x.revenue]); });
      csv('운향재_분석_' + today() + '.csv', rows);
    },


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
          rows.push([o.id, sh(o).receiver || by(o).name, by(o).phone,
            sh(o).zip, sh(o).addr, l.name, l.qty, sh(o).memo,
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
            by(o).name, by(o).phone, by(o).email,
            sh(o).receiver, sh(o).zip, sh(o).addr, sh(o).memo,
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

    saveHero: function () {
      var b = S.catalog.brand = S.catalog.brand || {};
      b.heroVideo = el('s-hero').value.trim();
      b.heroPoster = el('s-heroposter').value.trim();
      saveCatalog(b.heroVideo ? '영상을 저장했습니다. 사이트 첫 화면에 반영됩니다.'
                              : '영상을 비웠습니다. 기본 그림이 나옵니다.');
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
    api('/users').then(function (d) { S.users = d; }),
    api('/resets').then(function (d) { S.resets = d; }),
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
