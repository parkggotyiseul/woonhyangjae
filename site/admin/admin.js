/* 운향재 관리자 — 비개발자가 하루 10분으로 운영하는 것을 목표로 한다.
   현재는 백엔드가 없으므로 카탈로그 편집분을 브라우저에 보관하고
   catalog.js 파일로 내보내 배포하는 방식으로 동작한다.
   2단계에서 아래 store.* 함수만 API 호출로 교체하면 화면은 그대로 쓴다. */
(function () {
  'use strict';

  var BASE = window.WHJ_CATALOG || {};
  var K = {
    catalog: 'whj_admin_catalog',
    orders: 'whj_orders',
    notify: 'whj_notify',
    content: 'whj_content',
    settings: 'whj_settings'
  };

  /* ── 저장소 ───────────────────────────────────────── */
  var store = {
    get: function (key, fallback) {
      try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
      catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
  };

  var C = store.get(K.catalog, null) || JSON.parse(JSON.stringify(BASE));
  function saveCatalog() { store.set(K.catalog, C); flash('저장했습니다. 반영하려면 카탈로그를 내보내 배포해 주세요.'); }

  var orders = store.get(K.orders, []);
  var notify = store.get(K.notify, []);
  var content = store.get(K.content, {});
  var settings = store.get(K.settings, {});

  /* ── 유틸 ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function won(n) { return '₩' + Number(n || 0).toLocaleString('ko-KR'); }
  function el(id) { return document.getElementById(id); }
  function product(slug) {
    var all = (C.products || []).concat(C.sets || []);
    for (var i = 0; i < all.length; i++) if (all[i].slug === slug) return all[i];
    return null;
  }
  function dstr(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function today() { var d = new Date(); return d.toISOString().slice(0, 10); }

  var flashTimer = null;
  function flash(msg) {
    var box = el('flash');
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { box.hidden = true; }, 4000);
  }

  /* ── 파생 지표 ────────────────────────────────────── */
  function pending() {
    var neu = orders.filter(function (o) { return o.status === 'received'; }).length;
    var ship = orders.filter(function (o) { return o.status === 'paid' || o.status === 'ready'; }).length;
    var low = (C.products || []).filter(function (p) {
      return (p.variants || []).some(function (v) { return v.stock <= 5; });
    }).length;
    return { neu: neu, ship: ship, low: low, ask: 0, total: neu + ship + low };
  }
  function todayStats() {
    var t = today();
    var mine = orders.filter(function (o) { return o.at.slice(0, 10) === t; });
    return {
      revenue: mine.reduce(function (n, o) { return n + o.totals.total; }, 0),
      count: mine.length
    };
  }

  /* ── 뷰 ───────────────────────────────────────────── */
  var views = {};

  views.dashboard = function () {
    var p = pending(), t = todayStats();
    var month = orders.filter(function (o) { return o.at.slice(0, 7) === today().slice(0, 7); });
    var monthSum = month.reduce(function (n, o) { return n + o.totals.total; }, 0);

    /* 제품별 성과 */
    var perf = {};
    orders.forEach(function (o) {
      o.lines.forEach(function (l) {
        perf[l.slug] = perf[l.slug] || { name: l.name, qty: 0, amount: 0 };
        perf[l.slug].qty += l.qty;
        perf[l.slug].amount += l.amount;
      });
    });

    return head('대시보드', '오늘 해야 할 일과 어제까지의 성과를 한 화면에.') +
      '<div class="panel"><h2>처리 대기</h2>' +
        '<div class="todo">' +
          todoBtn('신규 주문', p.neu, '#orders') +
          todoBtn('발송 대기', p.ship, '#orders') +
          todoBtn('미답변 문의', p.ask, '#customers') +
          todoBtn('재고 경고', p.low, '#products') +
        '</div>' +
        (p.total === 0 ? '<p class="note mt-1">처리할 항목이 없습니다.</p>' : '') +
      '</div>' +

      '<div class="grid grid-4 mb-3">' +
        stat('오늘 매출', won(t.revenue)) +
        stat('오늘 주문', t.count + '건') +
        stat('이번 달 누적', won(monthSum)) +
        stat('알림 신청', notify.length + '명') +
      '</div>' +

      '<div class="grid grid-2">' +
        '<div class="panel"><h2>제품별 성과</h2>' +
          (Object.keys(perf).length ?
          '<div class="table-wrap"><table><thead><tr><th>제품</th><th class="num">판매량</th><th class="num">매출</th></tr></thead><tbody>' +
            Object.keys(perf).map(function (k) {
              return '<tr><td>' + esc(perf[k].name) + '</td><td class="num">' + perf[k].qty + '</td>' +
                '<td class="num">' + won(perf[k].amount) + '</td></tr>';
            }).join('') +
          '</tbody></table></div>'
          : '<p class="empty-row">아직 판매 데이터가 없습니다.</p>') +
          '<p class="note mt-1">어떤 제품이 안 팔리는지가 아니라, <strong>조회는 되는데 안 팔리는 제품</strong>을 봐야 합니다. GA4 연동 후 조회 대비 구매율이 이 표에 추가됩니다.</p>' +
        '</div>' +

        '<div class="panel"><h2>알림 신청 현황</h2>' +
          '<p class="big-num">' + notify.length + '<span class="big-num-unit">명</span></p>' +
          '<p class="muted-sm">003 · 세 번째 향 출시 알림 신청자</p>' +
          '<p class="note mt-1">이 명단이 출시 시점의 첫 매출을 만듭니다. 신청자가 일정 규모를 넘으면 출시 타이밍을 판단할 근거가 됩니다.</p>' +
        '</div>' +
      '</div>';
  };

  function todoBtn(label, n, href) {
    return '<button type="button" data-go="' + href + '">' +
      (n > 0 ? '<span class="dot"></span>' : '') + esc(label) +
      '<strong>' + n + '</strong></button>';
  }
  function stat(label, val, sub) {
    return '<div class="stat"><span>' + esc(label) + '</span><strong>' + esc(val) + '</strong>' +
      (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }

  /* ── 상품 관리 ────────────────────────────────────── */
  views.products = function () {
    return head('상품 관리', '컬렉션 · 제품 · 재고를 등록하고 수정합니다.',
        '<button class="b ghost" data-act="exportCatalog">카탈로그 내보내기</button>') +

      '<div class="panel"><h2>컬렉션 — 八章</h2>' +
        '<p class="note mb-1">상태를 <strong>진행중</strong>으로 바꾸면 사이트의 八章 글자가 자동으로 밝아지고 컬렉션 페이지에 섹션이 생깁니다. 코드 수정은 필요 없습니다.</p>' +
        '<div class="table-wrap"><table><thead><tr><th>순서</th><th>요소</th><th>부제</th><th>제품 수</th><th>상태</th></tr></thead><tbody>' +
        (C.collections || []).map(function (c) {
          var n = (C.products || []).filter(function (p) { return p.collectionId === c.id; }).length;
          return '<tr><td>' + esc(c.code) + '</td>' +
            '<td><strong>' + esc(c.hanja) + ' ' + esc(c.ko) + '</strong><br><span class="muted-xs">' + esc(c.en) + '</span></td>' +
            '<td>' + esc(c.subtitle || '') + '</td>' +
            '<td class="num">' + n + '</td>' +
            '<td><select data-col="' + esc(c.id) + '" class="sel-sm">' +
              ['active:진행중', 'upcoming:예정', 'done:완료'].map(function (o) {
                var v = o.split(':')[0], t = o.split(':')[1];
                return '<option value="' + v + '"' + (c.status === v ? ' selected' : '') + '>' + t + '</option>';
              }).join('') +
            '</select></td></tr>';
        }).join('') +
        '</tbody></table></div>' +
      '</div>' +

      '<div class="panel"><h2>제품</h2>' +
        '<div class="table-wrap"><table><thead><tr><th>번호</th><th>제품명</th><th>수종 · 층위</th><th class="num">가격</th><th class="num">재고</th><th>상태</th><th></th></tr></thead><tbody>' +
        (C.products || []).map(function (p) {
          var v = (p.variants || [])[0];
          return '<tr><td>' + esc(p.number) + '</td>' +
            '<td><strong>' + esc(p.nameKo || '(미정)') + '</strong>' + (p.nameHanja ? ' ' + esc(p.nameHanja) : '') +
              '<br><span class="muted-xs">' + esc(p.signature) + '</span></td>' +
            '<td>' + esc([p.species, p.layer].filter(Boolean).join(' · ')) + '</td>' +
            '<td class="num">' + (v ? won(v.price) : '—') + '</td>' +
            '<td class="num">' + (v ? (v.stock <= 5 ? '<span class="tag warn">' + v.stock + '</span>' : v.stock) : '—') + '</td>' +
            '<td>' + statusTag(p.status, p.statusLabel) + '</td>' +
            '<td><button class="b sm ghost" data-act="edit" data-a="' + esc(p.slug) + '">편집</button></td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div class="btn-row"><button class="b ghost" data-act="newProduct">+ 새 제품 등록</button></div>' +
      '</div>' +

      '<div id="editor"></div>';
  };

  function statusTag(s, label) {
    var cls = s === 'onsale' ? 'on' : (s === 'coming' ? 'soft' : (s === 'soldout' ? 'warn' : ''));
    return '<span class="tag ' + cls + '">' + esc(label || s) + '</span>';
  }

  /* 제품 편집 — 기획서 9.5 필드 구성 */
  function editor(p) {
    var v = (p.variants || [])[0] || { name: '200ml', sku: '', price: 0, stock: 0 };
    return '<div class="panel" id="editorPanel">' +
      '<h2>' + esc(p.nameKo || '새 제품') + ' 편집</h2>' +

      '<h3>기본 정보</h3>' +
      '<div class="frow-3">' +
        f('컬렉션', '<select id="e-col">' + (C.collections || []).map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (p.collectionId === c.id ? ' selected' : '') + '>' +
              esc(c.hanja + ' ' + c.ko) + '</option>';
          }).join('') + '</select>') +
        f('제품 번호', input('e-number', p.number)) +
        f('판매 상태', '<select id="e-status">' +
            ['onsale:판매중', 'soldout:품절', 'coming:Coming Soon', 'hidden:숨김'].map(function (o) {
              var val = o.split(':')[0], t = o.split(':')[1];
              return '<option value="' + val + '"' + (p.status === val ? ' selected' : '') + '>' + t + '</option>';
            }).join('') + '</select>') +
      '</div>' +
      '<div class="frow-3">' +
        f('제품명 (한글)', input('e-nameKo', p.nameKo)) +
        f('제품명 (한자)', input('e-nameHanja', p.nameHanja)) +
        f('영문 캡션', input('e-caption', p.caption)) +
      '</div>' +
      '<div class="frow">' +
        f('수종', input('e-species', p.species)) +
        f('층위', input('e-layer', p.layer)) +
      '</div>' +

      '<h3 class="mt-2">브랜드 텍스트</h3>' +
      '<div class="f" id="sigWrap">' +
        '<label>시그니처 카피 <span class="count" id="sigCount"></span></label>' +
        '<input id="e-signature" value="' + esc(p.signature) + '" maxlength="30">' +
        '<p class="hint">15자 이내를 권장합니다. 모바일 한 줄에 들어가야 합니다.</p>' +
      '</div>' +
      f('스토리 (한 줄에 한 문장)', '<textarea id="e-story" rows="5">' + esc((p.story || []).join('\n')) + '</textarea>') +
      f('마지막 강조 문장', input('e-storyLast', p.storyLast)) +

      '<h3 class="mt-2">향 정보</h3>' +
      '<div class="frow-3">' +
        f('TOP', input('e-top', p.notes && p.notes.top)) +
        f('HEART', input('e-heart', p.notes && p.notes.heart)) +
        f('BASE', input('e-base', p.notes && p.notes.base)) +
      '</div>' +
      '<div class="frow">' +
        f('무드 키워드', input('e-mood', p.mood)) +
        f('추천 공간 (쉼표 구분)', input('e-spaces', (p.spaces || []).join(', '))) +
      '</div>' +
      f('무드 컬러 (우드 캡 · 라벨 액센트)', '<input type="color" id="e-accent" value="' + esc(p.accent || '#6B4A2F') + '" class="color-in">') +

      '<h3 class="mt-2">포토 스팟 5칸 (고정 슬롯)</h3>' +
      '<div class="slots">' +
        ['요소 클로즈업', '제품 단독', '공간 배치', '디테일 매크로', '언박싱'].map(function (role, i) {
          var ps = (p.photoSpots || [])[i] || { slot: pad(i + 1), role: role, src: '', alt: '' };
          return '<div class="slot' + (ps.src ? ' filled' : '') + '">' +
            '<span>PS-' + pad(i + 1) + '</span>' +
            '<p>' + esc(ps.role || role) + '</p>' +
            '<input id="e-ps' + i + '" placeholder="이미지 경로" value="' + esc(ps.src) + '" class="slot-in">' +
            '<input id="e-psalt' + i + '" placeholder="대체 텍스트" value="' + esc(ps.alt) + '" class="slot-in2">' +
          '</div>';
        }).join('') +
      '</div>' +
      '<p class="note mt-sm2">슬롯이 고정이라 어느 제품이든 같은 구조로 채워지고, 빈 칸은 프론트에서 자동 생략됩니다. 이미지 업로드는 백엔드 연결 후 지원됩니다. 지금은 경로를 직접 입력합니다.</p>' +

      '<h3 class="mt-2">판매 정보</h3>' +
      '<div class="frow-3">' +
        f('용량 · 옵션명', input('e-vname', v.name)) +
        f('SKU', input('e-sku', v.sku)) +
        f('가격 (원)', '<input id="e-price" type="number" value="' + Number(v.price || 0) + '">') +
      '</div>' +
      '<div class="f">' +
        '<label>표식 (쉼표로 구분)</label>' +
        '<input id="e-badges" value="' + esc((p.badges || []).join(', ')) + '" placeholder="BEST, DESIGNER\'S PICK">' +
        '<p class="hint">SHOP 카드에 붙는 표식입니다. BEST 는 검정, PICK · CHOICE 가 들어가면 갈색 테두리로 표시됩니다. 비워두면 표식이 없습니다.</p>' +
      '</div>' +
      '<div class="frow-3">' +
        f('누적 판매 수 (인기순 정렬)', '<input id="e-sold" type="number" value="' + Number(p.soldCount || 0) + '">') +
        f('출시 · 갱신일 (최신순 정렬)', '<input id="e-released" type="date" value="' + esc(p.releasedAt || '') + '">') +
        f('재고 수량', '<input id="e-stock" type="number" value="' + Number(v.stock || 0) + '">') +
      '</div>' +
      '<div class="frow">' +
        f('URL slug', input('e-slug', p.slug)) +
      '</div>' +

      '<div class="note mt-1">' +
        '판매 상태를 <strong>Coming Soon</strong>으로 두면 프론트가 자동으로 다르게 렌더링됩니다. ' +
        '제품명 · 향 노트 · 가격은 숨겨지고 번호와 층위 힌트만 노출되며, 구매 버튼 자리에 알림 신청이 들어갑니다.' +
      '</div>' +

      '<div class="btn-row">' +
        '<button class="b" data-act="save" data-a="' + esc(p.slug) + '">저장</button>' +
        '<button class="b ghost" data-act="closeEditor">닫기</button>' +
      '</div>' +
    '</div>';
  }
  function f(label, control) { return '<div class="f"><label>' + esc(label) + '</label>' + control + '</div>'; }
  function input(id, val) { return '<input id="' + id + '" value="' + esc(val) + '">'; }

  /* ── 주문 관리 ────────────────────────────────────── */
  var orderTab = 'received';
  var STATUS = { received: '신규', ready: '발송 대기', shipped: '발송 완료', canceled: '취소 · 환불' };

  views.orders = function () {
    var counts = {};
    Object.keys(STATUS).forEach(function (k) {
      counts[k] = orders.filter(function (o) { return o.status === k; }).length;
    });
    var list = orders.filter(function (o) { return o.status === orderTab; });

    return head('주문 관리', '주문 확인부터 배송 완료까지.') +
      '<div class="tabs">' +
        Object.keys(STATUS).map(function (k) {
          return '<button class="' + (orderTab === k ? 'is-on' : '') + '" data-act="orderTab" data-a="' + k + '">' +
            STATUS[k] + ' (' + counts[k] + ')</button>';
        }).join('') +
      '</div>' +

      '<div class="panel">' +
        (list.length ?
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>주문번호</th><th>주문일시</th><th>주문자</th><th>상품</th><th class="num">금액</th><th>기프트</th><th>채널</th><th></th>' +
        '</tr></thead><tbody>' +
        list.map(function (o) {
          return '<tr>' +
            '<td>' + esc(o.id) + '</td>' +
            '<td>' + esc(dstr(o.at)) + '</td>' +
            '<td>' + esc(o.buyer.name) + '<br><span class="muted-xs">' + esc(o.buyer.phone) + '</span></td>' +
            '<td>' + o.lines.map(function (l) { return esc(l.name) + ' × ' + l.qty; }).join('<br>') + '</td>' +
            '<td class="num">' + won(o.totals.total) + '</td>' +
            '<td>' + (o.gift ? '<span class="tag soft">기프트</span>' : '—') + '</td>' +
            '<td>' + (o.channel === 'own' ? '자체' : '스마트스토어') + '</td>' +
            '<td>' + nextAction(o) + '</td>' +
          '</tr>' +
          (o.gift && o.gift.message ?
            '<tr><td colspan="8" class="gift-row">메시지 카드 — “' +
              esc(o.gift.message) + '”' + (o.gift.hidePrice ? ' · 가격 미표기 명세서' : '') + '</td></tr>' : '');
        }).join('') +
        '</tbody></table></div>'
        : '<p class="empty-row">해당 상태의 주문이 없습니다.</p>') +
      '</div>' +

      '<div class="panel"><h2>3PL 연계</h2>' +
        '<p class="note">발주서를 내려받아 3PL에 전달하고, 송장 엑셀을 업로드하면 자동으로 매칭되어 발송 처리됩니다. ' +
        '지금은 발주서 내보내기까지 동작하며, 송장 자동 매칭은 백엔드 연결 후 지원됩니다.</p>' +
        '<div class="btn-row">' +
          '<button class="b ghost" data-act="exportOrders">발주서 내보내기 (CSV)</button>' +
        '</div>' +
      '</div>';
  };

  function nextAction(o) {
    if (o.status === 'received') return '<button class="b sm" data-act="setOrder" data-a="' + o.id + '" data-b="ready">발송 준비</button>';
    if (o.status === 'ready') return '<button class="b sm" data-act="ship" data-a="' + o.id + '">송장 입력</button>';
    if (o.status === 'shipped') return '<span class="tag on">' + esc(o.invoice || '발송됨') + '</span>';
    return '—';
  }

  /* ── 콘텐츠 관리 ──────────────────────────────────── */
  views.content = function () {
    var home = content.home || {};
    return head('콘텐츠 관리', '사이트의 텍스트를 개발자 없이 수정합니다.') +
      '<div class="panel"><h2>홈 주요 카피</h2>' +
        f('S1 · 히어로 태그라인', input('c-hero', home.hero != null ? home.hero : (C.brand && C.brand.tagline))) +
        f('S2 · 선언', '<textarea id="c-statement" rows="4">' + esc(home.statement != null ? home.statement :
          '공간은 세 개의 층으로 지어집니다.\n눈으로 보이는 층, 손끝에 닿는 층,\n그리고 코로 먼저 도착하는 층.') + '</textarea>') +
        f('S12 · 전환 문장', input('c-thesis', home.thesis != null ? home.thesis : (C.brand && C.brand.thesis))) +
        '<div class="btn-row"><button class="b" data-act="saveContent">저장</button></div>' +
        '<p class="note mt-1">현재 홈 카피는 HTML에 직접 작성되어 있습니다. 이 화면의 값이 실제로 반영되려면 백엔드와 Content 테이블 연결이 필요합니다. 지금은 문구를 확정·보관하는 용도로 씁니다.</p>' +
      '</div>' +

      '<div class="panel"><h2>八章 상태</h2>' +
        '<p class="note mb-1">상품 관리 탭에서 컬렉션 상태를 바꾸면 여기에도 반영됩니다.</p>' +
        '<div class="table-wrap"><table><thead><tr><th>요소</th><th>상태</th><th>표시</th></tr></thead><tbody>' +
        (C.collections || []).map(function (c) {
          return '<tr><td>' + esc(c.hanja + ' ' + c.ko) + '</td><td>' + esc(c.statusLabel || c.status) + '</td>' +
            '<td>' + (c.status === 'active' ? '밝게' : '흐리게 (opacity 0.2)') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
      '</div>' +

      '<div class="panel"><h2>저널</h2>' +
        '<p class="empty-row">저널은 아직 구축되지 않았습니다. 월 1편 발행 시 롱테일 키워드 확보의 핵심 자산이 됩니다.</p>' +
      '</div>';
  };

  /* ── 고객 관리 ────────────────────────────────────── */
  views.customers = function () {
    var buyers = {};
    orders.forEach(function (o) {
      var k = o.buyer.email || o.buyer.phone;
      buyers[k] = buyers[k] || { name: o.buyer.name, email: o.buyer.email, phone: o.buyer.phone, count: 0, amount: 0 };
      buyers[k].count++;
      buyers[k].amount += o.totals.total;
    });
    var keys = Object.keys(buyers);

    return head('고객 관리', '구매자와 잠재 고객을 관리합니다.') +
      '<div class="panel"><h2>알림 신청자 · Coming Soon</h2>' +
        (notify.length ?
          '<div class="table-wrap"><table><thead><tr><th>이메일</th></tr></thead><tbody>' +
          notify.map(function (e) { return '<tr><td>' + esc(e) + '</td></tr>'; }).join('') +
          '</tbody></table></div>' +
          '<div class="btn-row"><button class="b ghost" data-act="exportNotify">명단 내보내기 (CSV)</button></div>'
          : '<p class="empty-row">아직 신청자가 없습니다.</p>') +
      '</div>' +

      '<div class="panel"><h2>구매 고객</h2>' +
        (keys.length ?
          '<div class="table-wrap"><table><thead><tr><th>성함</th><th>연락처</th><th class="num">주문 수</th><th class="num">누적 금액</th><th></th></tr></thead><tbody>' +
          keys.map(function (k) {
            var b = buyers[k];
            return '<tr><td>' + esc(b.name) + '</td>' +
              '<td>' + esc(b.email) + '<br><span class="muted-xs">' + esc(b.phone) + '</span></td>' +
              '<td class="num">' + b.count + '</td><td class="num">' + won(b.amount) + '</td>' +
              '<td>' + (b.count > 1 ? '<span class="tag on">재구매</span>' : '') + '</td></tr>';
          }).join('') +
          '</tbody></table></div>'
          : '<p class="empty-row">아직 주문이 없습니다.</p>') +
      '</div>';
  };

  /* ── 분석 ─────────────────────────────────────────── */
  views.analytics = function () {
    return head('분석', '어디를 보고, 얼마나 머물고, 어디서 떠나는지.') +
      '<div class="note warn mb-3">' +
        'GA4와 서치콘솔이 아직 연동되지 않았습니다. 아래는 연동 후 이 화면에 채워질 지표의 자리입니다. ' +
        '추적 코드는 오픈 직후부터 데이터가 쌓이도록 <strong>커머스 오픈 전에</strong> 심어야 합니다.' +
      '</div>' +
      '<div class="panel"><h2>이 브랜드의 핵심 지표</h2>' +
        '<div class="grid grid-4">' +
          stat('평균 체류시간', '—', '목표 60초 이상') +
          stat('스크롤 완료율', '—', '목표 70% 이상') +
          stat('SHOP 진입률', '—', '목표 15% 이상') +
          stat('B2B 문의', '—', '목표 월 3건') +
        '</div>' +
        '<p class="note mt-1">이 브랜드의 KPI는 매출 이전에 <strong>체류시간과 스크롤 완료율</strong>입니다. 스토리를 끝까지 읽었다는 뜻이기 때문입니다.</p>' +
      '</div>' +
      '<div class="panel"><h2>측정 항목</h2>' +
        '<div class="table-wrap"><table><thead><tr><th>지표</th><th>이 숫자로 판단하는 것</th><th>상태</th></tr></thead><tbody>' +
        [
          ['페이지별 조회수', '만들었는데 아무도 안 보는 페이지를 찾아냅니다.', 'GA4'],
          ['평균 체류시간', '60초 미만이면 카피가 지루하거나 이미지가 안 뜨는 것입니다.', 'GA4'],
          ['스크롤 완료율', '25/50/75/100% 도달 비율. 어느 섹션에서 멈추는지 보입니다.', '자체 이벤트'],
          ['섹션별 이탈 지점', '특정 섹션에서 절반이 빠지면 그 섹션의 카피를 고칩니다.', '자체 이벤트'],
          ['유입 경로', '어느 채널에 힘을 줄지 판단합니다.', 'GA4'],
          ['검색 키워드', '예상과 다르면 SEO 문구를 바꿉니다.', '서치콘솔'],
          ['전환 퍼널', '조회 → 상세 → 장바구니 → 결제 중 어디서 빠지는지.', 'GA4 + 자체'],
          ['디바이스 비율', '모바일이 80%면 모바일 화면부터 검수합니다.', 'GA4']
        ].map(function (r) {
          return '<tr><td><strong>' + esc(r[0]) + '</strong></td><td>' + esc(r[1]) + '</td>' +
            '<td><span class="tag">' + esc(r[2]) + '</span></td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<p class="note mt-1">핵심은 <strong>관리자가 GA4에 따로 들어가지 않아도 되게</strong> 만드는 것입니다. 별도 도구를 열어야 하면 결국 안 보게 됩니다.</p>' +
      '</div>';
  };

  /* ── SEO ──────────────────────────────────────────── */
  var PAGES = [
    ['/', '홈'], ['/philosophy.html', '철학'], ['/collection.html', '컬렉션'],
    ['/craft.html', '품질'], ['/spaces.html', '공간'], ['/contact.html', '문의'], ['/shop.html', 'SHOP']
  ];
  views.seo = function () {
    var seo = content.seo || {};
    return head('SEO', '검색 노출을 관리합니다.') +
      '<div class="panel"><h2>페이지별 메타</h2>' +
        PAGES.map(function (p) {
          var s = seo[p[0]] || {};
          return '<div class="seo-block">' +
            '<h3>' + esc(p[1]) + ' <span class="muted-n">' + esc(p[0]) + '</span></h3>' +
            f('title', '<input data-seo-title="' + esc(p[0]) + '" value="' + esc(s.title || '') + '" placeholder="현재 HTML에 작성된 값 사용 중">') +
            f('meta description', '<input data-seo-desc="' + esc(p[0]) + '" value="' + esc(s.desc || '') + '" placeholder="현재 HTML에 작성된 값 사용 중">') +
          '</div>';
        }).join('') +
        '<div class="btn-row"><button class="b" data-act="saveSeo">저장</button></div>' +
      '</div>' +
      '<div class="panel"><h2>구조화 데이터</h2>' +
        '<div class="table-wrap"><table><thead><tr><th>유형</th><th>적용 위치</th><th>상태</th></tr></thead><tbody>' +
          '<tr><td>Organization</td><td>홈</td><td><span class="tag on">적용됨</span></td></tr>' +
          '<tr><td>ItemList (제품 목록)</td><td>홈</td><td><span class="tag on">적용됨</span></td></tr>' +
          '<tr><td>FAQPage</td><td>홈 · 품질</td><td><span class="tag on">적용됨</span></td></tr>' +
          '<tr><td>Product + Offer</td><td>제품 상세</td><td><span class="tag on">적용됨</span></td></tr>' +
        '</tbody></table></div>' +
        '<p class="note mt-1">생성형 검색엔진이 브랜드를 인용할 때 FAQ와 Product 구조화 데이터를 우선 참조합니다. 제품이 추가되면 상세페이지의 구조화 데이터는 자동으로 생성됩니다.</p>' +
      '</div>';
  };

  /* ── 설정 ─────────────────────────────────────────── */
  views.settings = function () {
    var b = C.brand || {}, s = C.shipping || {};
    return head('설정', '운영 정책과 사업자 정보를 설정합니다.') +
      '<div class="panel"><h2>배송 정책</h2>' +
        '<div class="frow">' +
          f('기본 배송비 (원)', '<input id="s-fee" type="number" value="' + Number(s.fee || 0) + '">') +
          f('무료배송 기준 (원)', '<input id="s-free" type="number" value="' + Number(s.freeThreshold || 0) + '">') +
        '</div>' +
        f('배송 안내 문구', input('s-notice', s.notice)) +
      '</div>' +

      '<div class="panel"><h2>사업자 정보</h2>' +
        '<div class="frow">' +
          f('상호 (법인명)', input('s-company', b.company)) +
          f('대표자', input('s-ceo', b.ceo)) +
        '</div>' +
        '<div class="frow">' +
          f('사업자등록번호', input('s-biz', b.bizNumber)) +
          f('통신판매업 신고번호', input('s-mail', b.mailOrderNumber)) +
        '</div>' +
        '<div class="frow">' +
          f('사업장 주소', input('s-addr', b.address)) +
          f('대표 전화', input('s-phone', b.phone)) +
        '</div>' +
        '<div class="frow">' +
          f('일반 문의 이메일', input('s-email', b.email)) +
          f('B2B 이메일', input('s-b2b', b.b2bEmail)) +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="b" data-act="saveSettings">저장</button>' +
          '<button class="b ghost" data-act="exportCatalog">카탈로그 내보내기</button>' +
        '</div>' +
        '<div class="note warn mt-1">사업자등록번호 · 통신판매업 신고번호 · 사업장 주소는 <strong>법적 필수 표기</strong>입니다. 커머스 오픈 전 반드시 실제 값으로 채워야 합니다.</div>' +
      '</div>' +

      '<div class="panel"><h2>연동</h2>' +
        '<div class="table-wrap"><table><thead><tr><th>대상</th><th>역할</th><th>상태</th></tr></thead><tbody>' +
          '<tr><td>스마트스토어</td><td>주문 수신 · 재고 양방향 동기화</td><td><span class="tag">미연동</span></td></tr>' +
          '<tr><td>PG (자체 결제)</td><td>카드 · 간편결제</td><td><span class="tag">미연동</span></td></tr>' +
          '<tr><td>3PL 물류</td><td>발주서 · 송장 자동 매칭</td><td><span class="tag">미연동</span></td></tr>' +
          '<tr><td>알림톡 · 이메일</td><td>주문 확인 · 출고 · 배송완료</td><td><span class="tag">미연동</span></td></tr>' +
          '<tr><td>GA4 · 서치콘솔</td><td>지표 수집</td><td><span class="tag">미연동</span></td></tr>' +
        '</tbody></table></div>' +
        '<p class="note mt-1">재고는 반드시 <strong>자체 시스템을 단일 기준</strong>으로 두어야 합니다. 스마트스토어와 양쪽에서 따로 관리하면 오버셀이 발생합니다.</p>' +
      '</div>' +

      '<div class="panel"><h2>보안</h2>' +
        '<div class="note warn">' +
          '이 관리자 화면은 현재 <strong>인증 없이 접근 가능한 정적 페이지</strong>입니다. ' +
          '실제 운영 전에 웹서버 단에서 접근 제한(Basic 인증 · IP 제한)을 걸어야 하며, ' +
          '백엔드 연결 시 계정 · 권한(운영자 / 관리자 / 외부 협력)과 2단계 인증을 구현해야 합니다.' +
        '</div>' +
      '</div>';
  };

  /* ── 공통 렌더링 ──────────────────────────────────── */
  function head(title, desc, right) {
    return '<div class="page-head"><h1>' + esc(title) + '</h1><p>' + esc(desc) + '</p>' +
      (right ? '<div class="right">' + right + '</div>' : '') + '</div>' +
      '<p class="note" id="flash" hidden class="mb-2"></p>';
  }

  function route() {
    var hash = (location.hash || '#dashboard').slice(1);
    if (!views[hash]) hash = 'dashboard';
    el('view').innerHTML = views[hash]();
    document.querySelectorAll('#nav a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + hash);
    });
    window.scrollTo(0, 0);
    paintBadges();
    bind(hash);
  }

  function paintBadges() {
    var p = pending();
    var t = el('nav-todo'), o = el('nav-orders');
    t.hidden = p.total === 0; t.textContent = p.total;
    o.hidden = p.neu === 0; o.textContent = p.neu;
  }

  function bind(hash) {
    if (hash === 'products') {
      document.querySelectorAll('[data-col]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var id = sel.getAttribute('data-col');
          (C.collections || []).forEach(function (c) {
            if (c.id !== id) return;
            c.status = sel.value;
            c.statusLabel = { active: '진행중', upcoming: '예정', done: '완료' }[sel.value];
          });
          saveCatalog();
        });
      });
    }
    var sig = el('e-signature');
    if (sig) {
      var upd = function () {
        var n = sig.value.length;
        el('sigCount').textContent = n + ' / 15자';
        el('sigWrap').classList.toggle('over', n > 15);
      };
      sig.addEventListener('input', upd);
      upd();
    }
  }

  /* ── 공개 액션 ────────────────────────────────────── */
  window.WHJADMIN = {
    edit: function (slug) {
      var p = product(slug);
      if (!p) return;
      el('editor').innerHTML = editor(p);
      bind('products');
      el('editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    newProduct: function () {
      var n = (C.products || []).length + 1;
      var p = {
        id: 'new-' + Date.now(), slug: 'new-' + n, collectionId: (C.collections[0] || {}).id,
        number: pad(n), nameKo: '', nameHanja: '', caption: '', signature: '',
        species: '', layer: '', story: [], storyLast: '',
        notes: { top: '', heart: '', base: '' }, mood: '', spaces: [],
        status: 'hidden', statusLabel: '숨김', accent: '#6B4A2F',
        photoSpots: [], variants: [{ id: 'v-' + Date.now(), name: '200ml', sku: '', price: 150000, stock: 0 }]
      };
      C.products.push(p);
      saveCatalog();
      route();
      WHJADMIN.edit(p.slug);
    },
    save: function (slug) {
      var p = product(slug);
      if (!p) return;
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
      p.accent = el('e-accent').value;
      p.photoSpots = [0, 1, 2, 3, 4].map(function (i) {
        return {
          slot: pad(i + 1),
          role: ['요소 클로즈업', '제품 단독', '공간 배치', '디테일 매크로', '언박싱'][i],
          src: el('e-ps' + i).value.trim(),
          alt: el('e-psalt' + i).value.trim()
        };
      }).filter(function (ps) { return ps.src || ps.alt; });
      p.badges = el('e-badges').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      p.soldCount = Number(el('e-sold').value) || 0;
      p.releasedAt = el('e-released').value;
      var v = p.variants[0];
      v.name = el('e-vname').value.trim();
      v.sku = el('e-sku').value.trim();
      v.price = Number(el('e-price').value) || 0;
      v.stock = Number(el('e-stock').value) || 0;
      p.slug = el('e-slug').value.trim() || p.slug;
      saveCatalog();
      route();
    },
    closeEditor: function () { el('editor').innerHTML = ''; },

    orderTab: function (k) { orderTab = k; route(); },
    setOrder: function (id, status) {
      orders.forEach(function (o) { if (o.id === id) o.status = status; });
      store.set(K.orders, orders);
      route();
    },
    ship: function (id) {
      var no = prompt('송장번호를 입력해 주세요.');
      if (!no) return;
      orders.forEach(function (o) {
        if (o.id === id) { o.status = 'shipped'; o.invoice = no.trim(); }
      });
      store.set(K.orders, orders);
      route();
    },

    saveContent: function () {
      content.home = {
        hero: el('c-hero').value.trim(),
        statement: el('c-statement').value,
        thesis: el('c-thesis').value.trim()
      };
      store.set(K.content, content);
      flash('저장했습니다.');
    },
    saveSeo: function () {
      var seo = {};
      document.querySelectorAll('[data-seo-title]').forEach(function (i) {
        var k = i.getAttribute('data-seo-title');
        seo[k] = seo[k] || {};
        seo[k].title = i.value.trim();
      });
      document.querySelectorAll('[data-seo-desc]').forEach(function (i) {
        var k = i.getAttribute('data-seo-desc');
        seo[k] = seo[k] || {};
        seo[k].desc = i.value.trim();
      });
      content.seo = seo;
      store.set(K.content, content);
      flash('저장했습니다.');
    },
    saveSettings: function () {
      C.shipping = C.shipping || {};
      C.shipping.fee = Number(el('s-fee').value) || 0;
      C.shipping.freeThreshold = Number(el('s-free').value) || 0;
      C.shipping.notice = el('s-notice').value.trim();
      C.brand = C.brand || {};
      C.brand.company = el('s-company').value.trim();
      C.brand.ceo = el('s-ceo').value.trim();
      C.brand.bizNumber = el('s-biz').value.trim();
      C.brand.mailOrderNumber = el('s-mail').value.trim();
      C.brand.address = el('s-addr').value.trim();
      C.brand.phone = el('s-phone').value.trim();
      C.brand.email = el('s-email').value.trim();
      C.brand.b2bEmail = el('s-b2b').value.trim();
      saveCatalog();
    },

    exportCatalog: function () {
      var body = '/* 운향재 카탈로그 — 관리자에서 내보낸 파일.\n' +
        '   site/assets/data/catalog.js 를 이 파일로 교체하고 배포하면 사이트에 반영됩니다.\n' +
        '   내보낸 시각: ' + new Date().toLocaleString('ko-KR') + ' */\n' +
        'window.WHJ_CATALOG =\n' + JSON.stringify(C, null, 2) + ';\n';
      download('catalog.js', body, 'application/javascript');
    },
    exportOrders: function () {
      var rows = [['주문번호', '주문일시', '주문자', '연락처', '받는분', '우편번호', '주소', '요청사항', '상품', '수량', '금액', '기프트메시지']];
      orders.filter(function (o) { return o.status === 'ready' || o.status === 'received'; })
        .forEach(function (o) {
          o.lines.forEach(function (l) {
            rows.push([o.id, dstr(o.at), o.buyer.name, o.buyer.phone, o.shipping.receiver,
              o.shipping.zip, o.shipping.addr, o.shipping.memo, l.name, l.qty, l.amount,
              o.gift ? o.gift.message : '']);
          });
        });
      downloadCsv('발주서_' + today() + '.csv', rows);
    },
    exportNotify: function () {
      downloadCsv('알림신청자_' + today() + '.csv', [['이메일']].concat(notify.map(function (e) { return [e]; })));
    }
  };

  function download(name, text, type) {
    var blob = new Blob(['﻿' + text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function downloadCsv(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    download(name, csv, 'text/csv');
  }

  /* 인라인 onclick 은 CSP(script-src 'self')에 막히므로 위임 처리한다 */
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { location.hash = go.getAttribute('data-go'); return; }

    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var fn = WHJADMIN[btn.getAttribute('data-act')];
    if (typeof fn !== 'function') return;
    e.preventDefault();
    fn(btn.getAttribute('data-a'), btn.getAttribute('data-b'));
  });

  window.addEventListener('hashchange', route);
  route();
})();
