/* 운향재 — 다국어
   한국어가 원본이다. HTML 에는 한국어가 그대로 들어 있고,
   다른 언어를 고르면 data-i18n 이 붙은 자리만 바꿔 끼운다.
   그래서 번역이 빠진 자리는 한국어로 남고, 화면이 비지 않는다.

   새 문구를 번역하려면 HTML 에 data-i18n="키"를 붙이고
   아래 사전의 각 언어에 같은 키를 추가하면 된다. */
(function () {
  'use strict';

  /* 국기는 이모지 대신 작은 SVG 로 그린다.
     이모지 국기는 윈도우에서 두 글자(KR, US)로만 보여서 국기 구실을 못 한다.
     20x13px 로 줄어들어도 무엇인지 알아볼 수 있는 선까지만 그린다. */
  function flagSvg(inner) {
    return '<svg class="lang-flag" viewBox="0 0 24 16" width="20" height="13" aria-hidden="true">' +
      inner + '<rect x=".5" y=".5" width="23" height="15" fill="none" stroke="rgba(0,0,0,.16)"/></svg>';
  }

  /* 오각별 하나. 중국 국기에 쓴다. */
  function star(cx, cy, r, rot) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var rad = (i % 2 ? r * 0.382 : r);
      var a = (-90 + rot + i * 36) * Math.PI / 180;
      pts.push((cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2));
    }
    return '<polygon points="' + pts.join(' ') + '"/>';
  }

  /* 태극기의 사괘 한 벌. pattern 은 위에서 아래로, 1 이 이어진 획이다.
     획은 그 괘와 태극 중심을 잇는 선에 직각으로 놓인다. */
  function trigram(cx, cy, rot, pattern) {
    var barW = 4.2, barH = 0.62, gap = 0.5, half = (barW - 1.1) / 2;
    var rows = pattern.map(function (solid, i) {
      var y = ((i - 1) * (barH + gap) - barH / 2).toFixed(2);
      if (solid) {
        return '<rect x="' + (-barW / 2) + '" y="' + y + '" width="' + barW + '" height="' + barH + '"/>';
      }
      return '<rect x="' + (-barW / 2) + '" y="' + y + '" width="' + half.toFixed(2) + '" height="' + barH + '"/>' +
             '<rect x="' + (barW / 2 - half).toFixed(2) + '" y="' + y + '" width="' + half.toFixed(2) + '" height="' + barH + '"/>';
    }).join('');
    return '<g fill="#0A0A0A" transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ')">' + rows + '</g>';
  }

  var FLAGS = {
    /* 태극기 — 태극은 기의 대각선을 따라 기울어 있고,
       사괘는 건(왼위) 리(왼아래) 감(오른위) 곤(오른아래) 순이다. */
    ko: flagSvg(
      '<rect width="24" height="16" fill="#fff"/>' +
      '<g transform="rotate(-33.69 12 8)">' +
        '<circle cx="12" cy="8" r="3.35" fill="#CD2E3A"/>' +
        '<path d="M8.65 8A1.675 1.675 0 0 1 12 8A1.675 1.675 0 0 0 15.35 8A3.35 3.35 0 0 1 8.65 8Z" fill="#0047A0"/>' +
      '</g>' +
      trigram(4.9, 3.3, -56.31, [1, 1, 1]) +
      trigram(4.9, 12.7, 56.31, [1, 0, 1]) +
      trigram(19.1, 3.3, 56.31, [0, 1, 0]) +
      trigram(19.1, 12.7, -56.31, [0, 0, 0])),

    en: flagSvg(
      '<rect width="24" height="16" fill="#fff"/>' +
      '<g fill="#B22234">' +
        '<rect y="0" width="24" height="1.23"/><rect y="2.46" width="24" height="1.23"/>' +
        '<rect y="4.92" width="24" height="1.23"/><rect y="7.38" width="24" height="1.23"/>' +
        '<rect y="9.85" width="24" height="1.23"/><rect y="12.31" width="24" height="1.23"/>' +
        '<rect y="14.77" width="24" height="1.23"/>' +
      '</g>' +
      '<rect width="9.6" height="8.61" fill="#3C3B6E"/>' +
      '<g fill="#fff">' +
        star(2.4, 2.2, 1.05, 0) + star(7.2, 2.2, 1.05, 0) +
        star(2.4, 6.2, 1.05, 0) + star(7.2, 6.2, 1.05, 0) +
        star(4.8, 4.2, 1.05, 0) +
      '</g>'),

    zh: flagSvg(
      '<rect width="24" height="16" fill="#DE2910"/>' +
      '<g fill="#FFDE00">' +
        star(5.2, 4.6, 2.6, 0) +
        star(9.9, 1.9, .95, 24) + star(11.6, 3.8, .95, 46) +
        star(11.6, 6.3, .95, -20) + star(9.9, 8.2, .95, 0) +
      '</g>'),

    vi: flagSvg(
      '<rect width="24" height="16" fill="#DA251D"/>' +
      '<g fill="#FFFF00">' + star(12, 8, 4.2, 0) + '</g>')
  };

  var LANGS = [
    { code: 'ko', short: 'KOR', name: '한국어' },
    { code: 'en', short: 'ENG', name: 'English' },
    { code: 'zh', short: '中文', name: '中文' },
    { code: 'vi', short: 'VIE', name: 'Tiếng Việt' }
  ];

  var DICT = {
    en: {
      /* 공통 */
      'nav.philosophy': 'Philosophy',
      'nav.collection': 'Collection',
      'nav.craft': 'Craft',
      'nav.spaces': 'Spaces',
      'nav.contact': 'Contact',
      'nav.shop': 'SHOP',
      'nav.cart': 'CART',
      'nav.menu': 'Menu',

      'nav.philosophy.1': 'Invisible Architecture',
      'nav.philosophy.2': 'The Name, Read Twice',
      'nav.philosophy.3': 'Choose One, Follow It Down',
      'nav.philosophy.4': 'Made by Korean Hands',
      'nav.collection.1': 'Seven Chapters',
      'nav.collection.2': 'Open Now',
      'nav.collection.3': 'Not Yet Arrived',
      'nav.craft.1': 'Fragrance Load 20%',
      'nav.craft.2': 'Three Hands',
      'nav.craft.3': 'What We Hold Back',
      'nav.craft.4': 'The Moment It Opens',
      'nav.spaces.1': 'Three Questions',
      'nav.spaces.2': 'By the Room',
      'nav.spaces.3': 'By the Air You Want',
      'nav.spaces.4': 'For Your Space',
      'nav.contact.1': 'Leave a Word',
      'nav.contact.2': 'Asked Before You Ask',
      'nav.contact.3': 'After It Arrives',
      'nav.contact.4': 'Who Makes It',

      /* 홈 */
      'lang.note': 'Menus are translated. The page content below is in Korean.',

      /* 폼 */

      /* 푸터 */
      'foot.tagline': 'Elements, translated into scent',
      'foot.terms': 'Terms of Service',
      'foot.privacy': 'Privacy Policy',
      'foot.copyright': 'Copyright',
      'foot.business': 'Business Information',
      'foot.rights': 'All rights reserved. All text, images and scent narratives on this site are works of YYY Company and are protected by copyright law. Reproduction, redistribution or use for AI training without permission is prohibited.',
      'foot.admin': 'Admin'
    },

    zh: {
      'nav.philosophy': '品牌哲学',
      'nav.collection': '系列',
      'nav.craft': '品质',
      'nav.spaces': '空间',
      'nav.contact': '咨询',
      'nav.shop': '购买',
      'nav.cart': '购物车',
      'nav.menu': '菜单',

      'nav.philosophy.1': '看不见的建筑',
      'nav.philosophy.2': '一名两读',
      'nav.philosophy.3': '择其一，掘到底',
      'nav.philosophy.4': '出自韩国之手',
      'nav.collection.1': '七个篇章',
      'nav.collection.2': '已开启的章',
      'nav.collection.3': '尚未到来的章',
      'nav.craft.1': '香料浓度 20%',
      'nav.craft.2': '三双手',
      'nav.craft.3': '不放行的标准',
      'nav.craft.4': '开启的瞬间',
      'nav.spaces.1': '三个提问',
      'nav.spaces.2': '按摆放之处',
      'nav.spaces.3': '按想要的空气',
      'nav.spaces.4': '为您的空间',
      'nav.contact.1': '留下一句话',
      'nav.contact.2': '先被问到的',
      'nav.contact.3': '送达之后',
      'nav.contact.4': '由谁制作',

      'lang.note': '菜单已翻译，以下正文为韩文。',


      'foot.tagline': '将自然的元素移作香气',
      'foot.terms': '服务条款',
      'foot.privacy': '隐私政策',
      'foot.copyright': '版权声明',
      'foot.business': '企业信息',
      'foot.rights': '版权所有。本网站的全部文字、图像与香气叙述均为 YYY 公司的作品，受著作权法保护。未经许可，禁止复制、再分发或用于人工智能训练。',
      'foot.admin': '管理'
    },

    vi: {
      'nav.philosophy': 'Triết lý',
      'nav.collection': 'Bộ sưu tập',
      'nav.craft': 'Chất lượng',
      'nav.spaces': 'Không gian',
      'nav.contact': 'Liên hệ',
      'nav.shop': 'CỬA HÀNG',
      'nav.cart': 'GIỎ HÀNG',
      'nav.menu': 'Menu',

      'nav.philosophy.1': 'Kiến trúc vô hình',
      'nav.philosophy.2': 'Một cái tên, hai cách đọc',
      'nav.philosophy.3': 'Chọn một, đi đến tận cùng',
      'nav.philosophy.4': 'Từ bàn tay Hàn Quốc',
      'nav.collection.1': 'Bảy chương',
      'nav.collection.2': 'Chương đang mở',
      'nav.collection.3': 'Chương chưa đến',
      'nav.craft.1': 'Nồng độ hương 20%',
      'nav.craft.2': 'Ba bàn tay',
      'nav.craft.3': 'Tiêu chuẩn không cho qua',
      'nav.craft.4': 'Khoảnh khắc mở ra',
      'nav.spaces.1': 'Ba câu hỏi',
      'nav.spaces.2': 'Theo nơi đặt',
      'nav.spaces.3': 'Theo bầu không khí',
      'nav.spaces.4': 'Dành cho không gian của bạn',
      'nav.contact.1': 'Để lại đôi lời',
      'nav.contact.2': 'Được hỏi trước nhất',
      'nav.contact.3': 'Sau khi nhận hàng',
      'nav.contact.4': 'Ai làm ra',

      'lang.note': 'Menu đã được dịch. Nội dung bên dưới bằng tiếng Hàn.',


      'foot.tagline': 'Chuyển những nguyên tố của tự nhiên thành hương',
      'foot.terms': 'Điều khoản dịch vụ',
      'foot.privacy': 'Chính sách bảo mật',
      'foot.copyright': 'Bản quyền',
      'foot.business': 'Thông tin doanh nghiệp',
      'foot.rights': 'Bảo lưu mọi quyền. Toàn bộ văn bản, hình ảnh và câu chuyện hương trên trang này là tác phẩm của YYY Company và được bảo hộ bởi luật bản quyền. Nghiêm cấm sao chép, phân phối lại hoặc dùng để huấn luyện trí tuệ nhân tạo khi chưa được phép.',
      'foot.admin': 'Quản trị'
    }
  };

  var KEY = 'whj_lang';
  var current = 'ko';
  try { current = localStorage.getItem(KEY) || 'ko'; } catch (e) {}
  if (!LANGS.some(function (l) { return l.code === current; })) current = 'ko';

  function t(key) {
    if (current === 'ko') return null;
    var d = DICT[current];
    return (d && d[key]) || null;
  }

  function apply() {
    document.documentElement.lang = current;

    document.querySelectorAll('[data-i18n]').forEach(function (n) {
      if (!n.hasAttribute('data-ko')) n.setAttribute('data-ko', n.innerHTML);
      var v = t(n.getAttribute('data-i18n'));
      n.innerHTML = v == null ? n.getAttribute('data-ko') : v;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (n) {
      var spec = n.getAttribute('data-i18n-attr').split(':');
      var attr = spec[0], key = spec[1];
      if (!n.hasAttribute('data-ko-' + attr)) n.setAttribute('data-ko-' + attr, n.getAttribute(attr) || '');
      var v = t(key);
      n.setAttribute(attr, v == null ? n.getAttribute('data-ko-' + attr) : v);
    });

    /* 번역은 메뉴와 꼬리말까지다. 본문은 어느 페이지든 한국어로 둔다.
       메뉴만 영어로 바뀐 채 본문이 한국어인 상태를 말없이 두면 오해를 사므로,
       한국어가 아닌 언어를 고르면 머리말 아래에 한 줄로 알린다. */
    var note = document.getElementById('langNote');
    if (note) {
      var show = current !== 'ko';
      note.hidden = !show;
      note.classList.toggle('is-on', show);
      if (show) note.textContent = t('lang.note') || '';
    }

    var meta = LANGS.filter(function (l) { return l.code === current; })[0];
    var flag = document.querySelector('.lang-btn .lang-flag');
    var name = document.querySelector('.lang-btn .lang-name');
    if (flag) flag.outerHTML = FLAGS[current];
    if (name) name.textContent = meta.short;
    document.querySelectorAll('.lang-menu button').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-lang') === current);
    });
  }

  function build() {
    var host = document.querySelector('[data-lang-switch]');
    if (!host) return;
    host.className = 'lang';
    host.innerHTML =
      '<button type="button" class="lang-btn" aria-haspopup="true" aria-expanded="false">' +
        FLAGS.ko + '<span class="lang-name">KOR</span>' +
        '<span class="lang-caret" aria-hidden="true">▾</span>' +
      '</button>' +
      '<div class="lang-menu" role="menu">' +
        LANGS.map(function (l) {
          return '<button type="button" role="menuitem" data-lang="' + l.code + '">' +
            FLAGS[l.code] +
            '<span class="lang-name-full">' + l.name + '</span></button>';
        }).join('') +
      '</div>';

    var btn = host.querySelector('.lang-btn');
    var menu = host.querySelector('.lang-menu');
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-lang]');
      if (!b) return;
      current = b.getAttribute('data-lang');
      try { localStorage.setItem(KEY, current); } catch (err) {}
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      apply();
    });
    document.addEventListener('click', function (e) {
      if (!host.contains(e.target)) {
        menu.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  window.WHJLang = {
    get: function () { return current; },
    t: t,
    apply: apply
  };

  document.addEventListener('DOMContentLoaded', function () {
    build();
    apply();
  });
})();
