/* ==========================================================================
   옆커폰 허브 — 공통 로그인 모듈  (yc-auth.js)
   --------------------------------------------------------------------------
   · 공용 비밀번호를 쓰지 않는다. 사람마다 계정이 따로 있다.
   · 로그인하면 받은 토큰으로만 데이터를 요청한다. 로그인 전에는
     데이터가 브라우저로 내려오지 않는다.
   · 이 파일에는 비밀이 없다. publishable 키는 공개되어도 되는 값이고,
     실제 접근 권한은 서버(엣지 함수 data)가 토큰을 검사해서 결정한다.
   ========================================================================== */
(function (global) {
  'use strict';

  var SB_URL = 'https://skhbcizzqgmlnwiwlaxt.supabase.co';
  var SB_KEY = 'sb_publishable_ZJxHaQ8PwdiY8ZWYqXCReg_E5RqrV62';
  var STORE_KEY = 'yc_session_v2';
  var MAX_IDLE_MS = 12 * 60 * 60 * 1000;   // 12시간 안 쓰면 다시 로그인
  var FN = SB_URL + '/functions/v1/data';

  var sess = null;
  var me = null;

  function readSess() {
    try { sess = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
    catch (e) { sess = null; }
    return sess;
  }
  function writeSess(s) {
    sess = s;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function dropSess() {
    sess = null; me = null;
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  function authFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json', 'apikey': SB_KEY }, opts.headers || {});
    return fetch(SB_URL + path, opts);
  }

  /* ---- 로그인 ---- */
  async function login(email, password) {
    var r = await authFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: String(email || '').trim(), password: String(password || '') })
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.access_token) {
      var msg = d.error_description || d.msg || d.message || '';
      if (/invalid login/i.test(msg)) msg = '이메일 또는 비밀번호가 맞지 않습니다.';
      else if (/email not confirmed/i.test(msg)) msg = '아직 승인되지 않은 계정입니다.';
      else if (!msg) msg = '로그인에 실패했습니다.';
      throw new Error(msg);
    }
    writeSess({
      at: d.access_token,
      rt: d.refresh_token,
      exp: Date.now() + (d.expires_in || 3600) * 1000,
      last: Date.now()
    });
    return d;
  }

  /* ---- 토큰 갱신 ---- */
  async function refresh() {
    if (!sess || !sess.rt) throw new Error('login_required');
    var r = await authFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: sess.rt })
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.access_token) { dropSess(); throw new Error('login_required'); }
    writeSess({
      at: d.access_token,
      rt: d.refresh_token || sess.rt,
      exp: Date.now() + (d.expires_in || 3600) * 1000,
      last: sess.last
    });
    return d;
  }

  /* ---- 유효한 토큰 얻기 ---- */
  async function token() {
    if (!sess) readSess();
    if (!sess || !sess.at) throw new Error('login_required');
    if (Date.now() - (sess.last || 0) > MAX_IDLE_MS) { dropSess(); throw new Error('login_required'); }
    if (Date.now() > (sess.exp || 0) - 60000) await refresh();
    sess.last = Date.now();
    writeSess(sess);
    return sess.at;
  }

  /* ---- 데이터 함수 호출 ---- */
  async function call(action, extra, namespace) {
    var t = await token();
    var body = Object.assign({ action: action, namespace: namespace || '' }, extra || {});
    var r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + t },
      body: JSON.stringify(body)
    });
    if (r.status === 401) { dropSess(); throw new Error('login_required'); }
    if (r.status === 403) throw new Error('권한이 없습니다.');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  /* ---- 내 정보 (세션이 아직 살아있는지 확인용) ---- */
  async function whoami() {
    var d = await call('whoami', {}, '');
    me = d;
    return d;
  }

  /* ---- 비밀번호 변경 ---- */
  async function changePassword(newPw) {
    if (!newPw || String(newPw).length < 10) throw new Error('비밀번호는 10자 이상으로 정해 주세요.');
    var t = await token();
    var r = await fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + t },
      body: JSON.stringify({ password: String(newPw) })
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.msg || d.error_description || '비밀번호 변경에 실패했습니다.');
    return d;
  }

  function logout() {
    dropSess();
    try { location.reload(); } catch (e) {}
  }

  /* ======================================================================
     로그인 화면을 페이지에 붙인다.
     onReady(me) : 로그인 확인된 뒤 실행할 함수
     opts.title  : 잠금화면에 보일 제목
     ====================================================================== */
  function guard(onReady, opts) {
    opts = opts || {};
    var title = opts.title || '사내 자료';

    var css = document.createElement('style');
    css.textContent =
      '#ycgate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'padding:20px;background:linear-gradient(135deg,#7c5cc4,#57399b);font-family:inherit}' +
      '#ycgate .b{background:#fff;border-radius:20px;padding:30px 28px;max-width:360px;width:100%;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.25);text-align:center;box-sizing:border-box}' +
      '#ycgate h1{font-size:19px;font-weight:900;color:#57399b;margin:0 0 6px}' +
      '#ycgate p{font-size:12.5px;color:#8b7fa8;margin:0 0 18px;line-height:1.6}' +
      '#ycgate input{width:100%;padding:13px 14px;margin-top:9px;border:2px solid #e6e0f2;border-radius:11px;' +
      'font-size:15px;font-family:inherit;color:#2c2340;box-sizing:border-box}' +
      '#ycgate input:focus{outline:none;border-color:#7c5cc4}' +
      '#ycgate button{width:100%;margin-top:11px;padding:13px;border:none;border-radius:11px;background:#7c5cc4;' +
      'color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer}' +
      '#ycgate button:hover{background:#57399b}' +
      '#ycgate button:disabled{opacity:.6;cursor:default}' +
      '#ycgate .err{color:#d64f6a;font-size:12.5px;font-weight:700;margin-top:10px;min-height:17px}' +
      '#ycgate .lnk{background:none;color:#8b7fa8;font-size:12px;font-weight:700;margin-top:6px;padding:6px}' +
      '#ycgate .lnk:hover{background:none;color:#57399b;text-decoration:underline}' +
      'body.ycgated{overflow:hidden}';
    document.head.appendChild(css);

    var g = document.createElement('div');
    g.id = 'ycgate';
    g.innerHTML =
      '<div class="b">' +
      '<div style="font-size:34px;margin-bottom:8px">🔒</div>' +
      '<h1>' + title + '</h1>' +
      '<p>사내 자료입니다.<br>계정으로 로그인해 주세요.</p>' +
      '<input type="email" id="ycg-em" placeholder="이메일" autocomplete="username" inputmode="email">' +
      '<input type="password" id="ycg-pw" placeholder="비밀번호" autocomplete="current-password">' +
      '<button id="ycg-go">로그인</button>' +
      '<div class="err" id="ycg-err"></div>' +
      '<button class="lnk" id="ycg-ch">비밀번호 변경</button>' +
      '</div>';

    function mount() {
      document.body.appendChild(g);
      document.body.classList.add('ycgated');
      wire();
    }

    function open(info) {
      try { g.remove(); } catch (e) {}
      document.body.classList.remove('ycgated');
      onReady(info || me);
    }

    function wire() {
      var em = g.querySelector('#ycg-em');
      var pw = g.querySelector('#ycg-pw');
      var go = g.querySelector('#ycg-go');
      var err = g.querySelector('#ycg-err');
      var ch = g.querySelector('#ycg-ch');

      async function submit() {
        err.textContent = '';
        go.disabled = true; go.textContent = '확인 중…';
        try {
          await login(em.value, pw.value);
          var info = await whoami();
          open(info);
        } catch (e) {
          err.textContent = e.message || '로그인에 실패했습니다.';
          pw.value = ''; pw.focus();
        } finally {
          go.disabled = false; go.textContent = '로그인';
        }
      }

      go.onclick = submit;
      [em, pw].forEach(function (el) {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
        });
      });

      ch.onclick = async function () {
        err.textContent = '';
        if (!em.value || !pw.value) { err.textContent = '먼저 이메일과 현재 비밀번호를 넣어 주세요.'; return; }
        var np = prompt('새 비밀번호 (10자 이상)');
        if (!np) return;
        try {
          await login(em.value, pw.value);
          await changePassword(np);
          err.style.color = '#2e9e6b';
          err.textContent = '변경했습니다. 새 비밀번호로 로그인해 주세요.';
          dropSess(); pw.value = '';
        } catch (e) {
          err.style.color = '#d64f6a';
          err.textContent = e.message || '변경에 실패했습니다.';
        }
      };

      setTimeout(function () { (em.value ? pw : em).focus(); }, 120);
    }

    /* 이미 로그인돼 있으면 조용히 통과 */
    readSess();
    if (sess && sess.at) {
      whoami().then(open).catch(function () { mount(); });
    } else {
      mount();
    }
  }

  global.YC = {
    login: login,
    logout: logout,
    token: token,
    call: call,
    whoami: whoami,
    changePassword: changePassword,
    guard: guard,
    get me() { return me; }
  };
})(window);
