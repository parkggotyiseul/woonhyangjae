/* 운향재 — 회원 (공통)

   화면 넷이 같은 부품을 쓴다. 로그인 · 가입 · 비밀번호 찾기 · 내 정보.

   손에 익게 만드는 규칙
   ─────────────────────────────────────────────────────────
   · 잘못을 지적하는 시점은 그 칸을 떠날 때다. 글자마다 빨갛게 만들면
     아직 다 쓰지도 않았는데 혼나는 기분이 든다.
   · 한 번 지적한 칸은 다시 고치기 시작하는 순간 조용해진다.
   · 보낸 뒤 서버가 어느 칸이 문제인지 알려 주면 그 칸으로 데려간다.
   · 누르는 순간 버튼을 잠근다. 두 번 눌러 두 번 가입되는 일이 없도록. */
(function () {
  'use strict';

  var A = window.WHJAuth = {};

  /* ── 서버와 이야기하기 ─────────────────────────────── */
  A.api = function (path, opts) {
    opts = opts || {};
    var init = {
      method: opts.method || 'GET',
      credentials: 'same-origin'      // 로그인 쿠키를 함께 보낸다
    };
    if (opts.body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(opts.body);
    }
    return fetch('/api/auth' + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error(j.message || '잠시 문제가 있었습니다. 다시 시도해 주세요.');
          e.field = j.field;
          e.status = r.status;
          throw e;
        }
        return j;
      });
    }, function () {
      throw new Error('연결이 되지 않았습니다. 잠시 뒤에 다시 시도해 주세요.');
    });
  };

  /* 지금 로그인한 사람. 한 번만 물어보고 기억한다. */
  var mePromise = null;
  A.me = function (force) {
    if (force) mePromise = null;
    if (!mePromise) {
      mePromise = A.api('/me').then(function (j) { return j.user; },
        function () { return null; });
    }
    return mePromise;
  };

  /* ── 칸 하나에 붙는 안내 ───────────────────────────── */

  function boxOf(input) { return input.closest('.field') || input.parentNode; }

  A.say = function (input, msg) {
    var box = boxOf(input);
    var p = box.querySelector('.field-msg');
    if (!p) {
      p = document.createElement('p');
      p.className = 'field-msg';
      box.appendChild(p);
    }
    p.textContent = msg || '';
    box.classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) input.setAttribute('aria-describedby', p.id || (p.id = 'msg-' + input.id));
  };

  A.clear = function (form) {
    form.querySelectorAll('.has-error').forEach(function (b) { b.classList.remove('has-error'); });
    form.querySelectorAll('.field-msg').forEach(function (p) { p.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.setAttribute('aria-invalid', 'false'); });
    var alert = form.querySelector('[data-alert]');
    if (alert) { alert.textContent = ''; alert.hidden = true; }
  };

  A.alert = function (form, msg, kind) {
    var box = form.querySelector('[data-alert]');
    if (!box) return;
    box.textContent = msg || '';
    box.className = 'form-alert' + (kind ? ' is-' + kind : '');
    box.hidden = !msg;
    if (msg) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  /* ── 검사 규칙 ─────────────────────────────────────── */
  var RULES = {
    email: function (v) {
      if (!v) return '이메일 주소를 입력해 주세요.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '이메일 주소 형태가 아닙니다.';
      return null;
    },
    name: function (v) {
      if (!v) return '성함을 입력해 주세요.';
      if (v.length > 40) return '성함이 너무 깁니다.';
      return null;
    },
    phone: function (v) {
      if (!v) return null;                                  // 선택 항목
      var d = v.replace(/[^0-9]/g, '');
      if (d.length < 10 || d.length > 11) return '연락처 자릿수를 확인해 주세요.';
      return null;
    },
    password: function (v) {
      if (!v) return '비밀번호를 입력해 주세요.';
      if (v.length < 8) return '8자 이상으로 정해 주세요.';
      var kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/]
        .filter(function (re) { return re.test(v); }).length;
      if (kinds < 2) return '영문 · 숫자 · 기호 중 두 가지 이상을 섞어 주세요.';
      return null;
    },
    required: function (v) { return v ? null : '입력해 주세요.'; }
  };
  A.rules = RULES;

  A.checkField = function (input) {
    var kind = input.getAttribute('data-check');
    if (!kind) return null;
    var fn = RULES[kind];
    if (!fn) return null;
    var msg = fn(input.value.trim());
    A.say(input, msg);
    return msg;
  };

  /* 칸을 떠날 때 본다. 다시 고치기 시작하면 조용해진다. */
  A.watch = function (form) {
    form.querySelectorAll('[data-check]').forEach(function (input) {
      input.addEventListener('blur', function () { A.checkField(input); });
      input.addEventListener('input', function () {
        if (boxOf(input).classList.contains('has-error')) A.say(input, '');
      });
    });

    /* 연락처는 적는 동안 하이픈을 붙여 준다 */
    form.querySelectorAll('[data-check="phone"]').forEach(function (input) {
      input.addEventListener('input', function () {
        var d = input.value.replace(/[^0-9]/g, '').slice(0, 11);
        input.value = d.length < 4 ? d
          : d.length < 8 ? d.slice(0, 3) + '-' + d.slice(3)
          : d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4);
      });
    });

    /* 비밀번호는 눈으로 확인할 수 있어야 오타가 줄어든다 */
    form.querySelectorAll('[data-peek]').forEach(function (btn) {
      var input = document.getElementById(btn.getAttribute('data-peek'));
      if (!input) return;
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? '숨기기' : '보기';
        btn.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
        input.focus();
      });
    });

    /* 비밀번호 세기 — 겁을 주지 않고 상태만 알려 준다 */
    form.querySelectorAll('[data-strength]').forEach(function (bar) {
      var input = document.getElementById(bar.getAttribute('data-strength'));
      if (!input) return;
      input.addEventListener('input', function () {
        var v = input.value;
        var kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/]
          .filter(function (re) { return re.test(v); }).length;
        var score = 0;
        if (v.length >= 8) score++;
        if (v.length >= 12) score++;
        if (kinds >= 2) score++;
        if (kinds >= 3) score++;
        var label = ['', '조금 약합니다', '쓸 만합니다', '좋습니다', '아주 좋습니다'][Math.min(score, 4)];
        bar.className = 'pw-strength lv' + (v ? Math.min(score, 4) : 0);
        bar.setAttribute('data-label', v ? label : '');
      });
    });
  };

  /* 보내기 — 잠그고, 끝나면 푼다 */
  A.submit = function (form, run) {
    var btn = form.querySelector('[type="submit"]');
    var was = btn ? btn.textContent : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      A.clear(form);

      var first = null;
      form.querySelectorAll('[data-check]').forEach(function (input) {
        if (A.checkField(input) && !first) first = input;
      });
      if (first) {
        first.focus({ preventScroll: true });
        boxOf(first).scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = '잠시만요…'; }
      Promise.resolve()
        .then(function () { return run(form); })
        .catch(function (err) {
          var input = err.field && form.querySelector('[name="' + err.field + '"]');
          if (input) {
            A.say(input, err.message);
            input.focus({ preventScroll: true });
            boxOf(input).scrollIntoView({ block: 'center', behavior: 'smooth' });
          } else {
            A.alert(form, err.message, 'error');
          }
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = was; }
        });
    });
    A.watch(form);
  };

  /* 로그인 뒤 돌아갈 곳. 바깥 주소로는 보내지 않는다. */
  A.nextUrl = function () {
    var v = new URLSearchParams(location.search).get('next') || '';
    return /^\/[^/\\]/.test(v) ? v : '/account.html';
  };

  /* ── 머리말의 계정 자리 ─────────────────────────────
     로그인했으면 이름을, 아니면 로그인 링크를 둔다.
     화면이 그려진 뒤에 채우므로 처음엔 자리만 비어 있다. */
  A.paintHeader = function () {
    var host = document.querySelector('[data-account]');
    if (!host) return;
    A.me().then(function (user) {
      if (user) {
        host.innerHTML = '<a href="/account.html">' +
          (user.name ? esc(user.name) + '님' : '내 정보') + '</a>';
      } else {
        var next = encodeURIComponent(location.pathname + location.search);
        host.innerHTML = '<a href="/login.html?next=' + next + '">로그인</a>';
      }
    });
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  A.esc = esc;

  document.addEventListener('DOMContentLoaded', A.paintHeader);
})();
