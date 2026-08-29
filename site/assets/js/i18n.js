/* 운향재 — 다국어
   한국어가 원본이다. HTML 에는 한국어가 그대로 들어 있고,
   다른 언어를 고르면 data-i18n 이 붙은 자리만 바꿔 끼운다.
   그래서 번역이 빠진 자리는 한국어로 남고, 화면이 비지 않는다.

   새 문구를 번역하려면 HTML 에 data-i18n="키"를 붙이고
   아래 사전의 각 언어에 같은 키를 추가하면 된다. */
(function () {
  'use strict';

  /* 국기는 이모지 대신 작은 SVG 로 그린다.
     이모지 국기는 윈도우에서 두 글자(KR, US)로만 보여서 국기 구실을 못 한다. */
  function flagSvg(inner) {
    return '<svg class="lang-flag" viewBox="0 0 24 16" width="20" height="13" aria-hidden="true">' +
      inner + '<rect x=".5" y=".5" width="23" height="15" fill="none" stroke="rgba(0,0,0,.16)"/></svg>';
  }
  var FLAGS = {
    ko: flagSvg(
      '<rect width="24" height="16" fill="#fff"/>' +
      '<path d="M12 4.6a3.4 3.4 0 0 1 0 6.8 3.4 3.4 0 0 0 0-6.8z" fill="#0047A0"/>' +
      '<path d="M12 4.6a3.4 3.4 0 0 0 0 6.8 3.4 3.4 0 0 1 0-6.8z" fill="#CD2E3A"/>' +
      '<g stroke="#000" stroke-width=".7"><path d="M3.6 4.2l1.7 2.4M5.2 3.1l1.7 2.4M3.6 11.8l1.7-2.4M5.2 12.9l1.7-2.4' +
      'M20.4 4.2l-1.7 2.4M18.8 3.1l-1.7 2.4M20.4 11.8l-1.7-2.4M18.8 12.9l-1.7-2.4"/></g>'),
    en: flagSvg(
      '<rect width="24" height="16" fill="#fff"/>' +
      '<g fill="#B22234"><rect width="24" height="1.9"/><rect y="3.7" width="24" height="1.9"/>' +
      '<rect y="7.4" width="24" height="1.9"/><rect y="11.1" width="24" height="1.9"/>' +
      '<rect y="14.8" width="24" height="1.2"/></g>' +
      '<rect width="10" height="8.6" fill="#3C3B6E"/>'),
    zh: flagSvg(
      '<rect width="24" height="16" fill="#DE2910"/>' +
      '<path d="M5 2.6l.85 2.6-2.2-1.6h2.7l-2.2 1.6z" fill="#FFDE00"/>' +
      '<g fill="#FFDE00"><circle cx="9.6" cy="2.2" r=".9"/><circle cx="11.4" cy="4" r=".9"/>' +
      '<circle cx="11.4" cy="6.4" r=".9"/><circle cx="9.6" cy="8.1" r=".9"/></g>'),
    vi: flagSvg(
      '<rect width="24" height="16" fill="#DA251D"/>' +
      '<path d="M12 4l1.5 4.6-3.9-2.85h4.8L10.5 8.6z" fill="#FFFF00"/>')
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
      'nav.philosophy.2': 'Two Readings of the Name',
      'nav.philosophy.3': 'Method of Inquiry',
      'nav.philosophy.4': 'Korean Heritage',
      'nav.collection.1': 'Seven Chapters',
      'nav.collection.2': 'Chapter 01 — Wood',
      'nav.collection.3': 'Chapters to Come',
      'nav.craft.1': 'Fragrance Load 20%',
      'nav.craft.2': 'The Makers',
      'nav.craft.3': 'Verification',
      'nav.craft.4': 'Package',
      'nav.spaces.1': 'Find Yours',
      'nav.spaces.2': 'By Space',
      'nav.spaces.3': 'For Spaces (B2B)',
      'nav.contact.1': 'Send an Inquiry',
      'nav.contact.2': 'FAQ',
      'nav.contact.3': 'Returns & Exchanges',
      'nav.contact.4': 'Business Information',

      /* 홈 */
      'home.tagline': 'Elements, translated into scent',
      'home.meta': 'Composed by Seoul Fragrance · 20% fragrance load · Made in Korea',
      'lang.note': 'This page has not been translated yet. The content below is in Korean.',

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
      'nav.philosophy.2': '名字的两种读法',
      'nav.philosophy.3': '探究的方法',
      'nav.philosophy.4': '韩国的美学',
      'nav.collection.1': '七个篇章',
      'nav.collection.2': '第一章 — 木',
      'nav.collection.3': '尚未到来的篇章',
      'nav.craft.1': '香料浓度 20%',
      'nav.craft.2': '匠人团队',
      'nav.craft.3': '检验体系',
      'nav.craft.4': '包装',
      'nav.spaces.1': '寻找你的香',
      'nav.spaces.2': '按空间寻找',
      'nav.spaces.3': '空间合作 (B2B)',
      'nav.contact.1': '发送咨询',
      'nav.contact.2': '常见问题',
      'nav.contact.3': '退换货',
      'nav.contact.4': '企业信息',

      'home.tagline': '将自然的元素移作香气',
      'home.meta': '首尔香料调香 · 香料浓度 20% · 韩国制造',
      'lang.note': '本页尚未翻译，以下内容为韩文。',


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
      'nav.philosophy.2': 'Hai cách đọc tên',
      'nav.philosophy.3': 'Phương pháp khám phá',
      'nav.philosophy.4': 'Di sản Hàn Quốc',
      'nav.collection.1': 'Bảy chương',
      'nav.collection.2': 'Chương 01 — Gỗ',
      'nav.collection.3': 'Những chương sắp tới',
      'nav.craft.1': 'Nồng độ hương 20%',
      'nav.craft.2': 'Những người làm nên',
      'nav.craft.3': 'Kiểm định',
      'nav.craft.4': 'Bao bì',
      'nav.spaces.1': 'Tìm hương của bạn',
      'nav.spaces.2': 'Theo không gian',
      'nav.spaces.3': 'Hợp tác không gian (B2B)',
      'nav.contact.1': 'Gửi câu hỏi',
      'nav.contact.2': 'Câu hỏi thường gặp',
      'nav.contact.3': 'Đổi trả',
      'nav.contact.4': 'Thông tin doanh nghiệp',

      'home.tagline': 'Chuyển những nguyên tố của tự nhiên thành hương',
      'home.meta': 'Điều chế bởi Seoul Fragrance · Nồng độ hương 20% · Made in Korea',
      'lang.note': 'Trang này chưa được dịch. Nội dung bên dưới là tiếng Hàn.',


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

    /* 이 페이지 본문에 번역이 하나도 없으면 머리말 아래에 한 줄로 알린다.
       메뉴만 영어로 바뀌고 본문은 한국어인 상태를 그대로 두면 오해를 산다. */
    var note = document.getElementById('langNote');
    if (note) {
      var done = 0;
      document.querySelectorAll('#main [data-i18n]').forEach(function (n) {
        if (t(n.getAttribute('data-i18n')) != null) done++;
      });
      var show = current !== 'ko' && done === 0;
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
