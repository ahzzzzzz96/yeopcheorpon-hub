/* =========================================================
   자료실 애드온 — 백지현 SV · 직영매장 관리
   sv.html 맨 아래(</body> 바로 위)에 아래 한 줄만 추가하면 됩니다.
       <script src=archive-addon.js></script>
   기존 코드는 전혀 수정하지 않습니다.
   앞으로 자료 추가는 reports.json 파일만 고치면 됩니다.
   ========================================================= */

/* --- 자료실 전용 CSS 주입 --- */
(function(){
  if (document.getElementById("arc-style")) return;
  var s = document.createElement("style");
  s.id = "arc-style";
  s.textContent = ".arc-top{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:11px}\n.arc-search{position:relative;flex:1;min-width:190px}\n.arc-search input{width:100%;font:inherit;font-size:13px;padding:8px 11px 8px 30px;\n  border:1px solid var(--line);border-radius:8px;background:#fff;color:#1a1d23}\n.arc-search input:focus{outline:2px solid var(--accent);outline-offset:-1px}\n.arc-search svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);\n  width:14px;height:14px;stroke:#9aa1ad;fill:none;stroke-width:2}\n.arc-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px}\n.arc-chips .lbl{font-size:11px;color:#8d939f;font-weight:700;margin-right:1px}\n.arc-chip{font-size:12px;padding:4px 11px;border-radius:20px;border:1px solid var(--line);\n  background:#fff;color:#5b6270;cursor:pointer;font-family:inherit;white-space:nowrap}\n.arc-chip:hover{border-color:var(--accent);color:#1a1d23}\n.arc-chip.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}\n.arc-cnt{font-size:11.5px;color:#8d939f;margin:0 0 14px}\n.arc-sec{margin-bottom:20px}\n.arc-sec-h{display:flex;align-items:baseline;gap:8px;margin:0 0 9px;\n  padding-bottom:6px;border-bottom:1px solid var(--line)}\n.arc-sec-h b{font-size:13px;color:#1a1d23}\n.arc-sec-h span{font-size:11.5px;color:#9aa1ad}\n.arc-sec.fav .arc-sec-h b{color:#c98500}\n.arc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}\n.arc-card{background:#fff;border:1px solid var(--line);border-radius:11px;padding:15px 16px 13px;\n  display:flex;flex-direction:column;gap:9px;transition:box-shadow .14s,border-color .14s}\n.arc-card:hover{box-shadow:0 2px 10px rgba(20,24,32,.08);border-color:var(--accent)}\n.arc-card-t{display:flex;align-items:flex-start;gap:9px}\n.arc-card h4{font-size:14px;margin:0;line-height:1.4;flex:1;color:#1a1d23;font-weight:700}\n.arc-card .sub{font-size:12px;color:#5b6270;margin:0}\n.arc-star{background:none;border:0;cursor:pointer;padding:2px;line-height:0;flex-shrink:0}\n.arc-star svg{width:16px;height:16px;fill:none;stroke:#b6bcc6;stroke-width:1.9;stroke-linejoin:round}\n.arc-star:hover svg{stroke:#e0a300}\n.arc-star.on svg{fill:#e0a300;stroke:#e0a300}\n.arc-bd{display:flex;gap:4px;flex-wrap:wrap}\n.arc-bd span{font-size:10.5px;padding:2px 7px;border-radius:5px;background:#f3f5f8;\n  color:#5b6270;border:1px solid var(--line);white-space:nowrap}\n.arc-bd span.ty{background:rgba(0,0,0,.04);color:var(--accent);border-color:transparent;font-weight:700}\n.arc-st{display:flex;gap:13px;flex-wrap:wrap;padding:9px 0 1px;border-top:1px solid var(--line)}\n.arc-st .l{font-size:10px;color:#9aa1ad;white-space:nowrap}\n.arc-st .v{font-size:15px;font-weight:700;letter-spacing:-.02em;line-height:1.25;color:#1a1d23}\n.arc-st .v.good{color:#0a8a0a}.arc-st .v.bad{color:#c93a3a}\n.arc-note{font-size:11.5px;color:#5b6270;margin:0}\n.arc-ft{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:9px}\n.arc-ft .dt{font-size:11px;color:#9aa1ad;flex:1}\n.arc-open{font-size:11.5px;font-weight:700;padding:6px 12px;border-radius:7px;\n  background:var(--accent);color:#fff;text-decoration:none;white-space:nowrap}\n.arc-open:hover{filter:brightness(1.08)}\n.arc-msg{padding:34px 20px;text-align:center;color:#8d939f;font-size:13px;\n  border:1px dashed var(--line);border-radius:11px;background:#fff}\n.arc-msg code{background:#f3f5f8;padding:1px 5px;border-radius:4px;font-size:11.5px}";
  document.head.appendChild(s);
})();

/* 자료실 탭 — 기존 코드를 수정하지 않고 얹는 애드온 */
(function(){
  "use strict";
  var FAVK = "sv-archive-fav";
  var state = { data:null, type:"전체", owner:"전체", q:"", loading:false, err:null };

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function favs(){ try{ return JSON.parse(localStorage.getItem(FAVK)||"[]"); }catch(e){ return []; } }
  function favSet(a){ try{ localStorage.setItem(FAVK, JSON.stringify(a)); }catch(e){} }

  /* --- 1. 탭 버튼 추가 --- */
  var tabsEl = document.getElementById("tabs");
  if (tabsEl && !tabsEl.querySelector('[data-t="archive"]')) {
    var btn = document.createElement("button");
    btn.setAttribute("data-t", "archive");
    btn.textContent = "자료실";
    tabsEl.appendChild(btn);
  }

  /* --- 2. render() 감싸기 (기존 동작은 그대로 통과) --- */
  var origRender = window.render;
  window.render = function(){
    if (typeof tab !== "undefined" && tab === "archive") { archiveView(); }
    else { return origRender.apply(this, arguments); }
  };

  /* --- 3. 자료실 화면 --- */
  function archiveView(){
    var chip = document.getElementById("chipbar");
    if (chip) chip.innerHTML = "";
    var body = document.getElementById("body");
    if (!body) return;

    if (state.err) { body.innerHTML = shellHtml(errHtml()); bind(); return; }
    if (!state.data) {
      body.innerHTML = '<div class="arc-msg">자료 목록 불러오는 중…</div>';
      if (!state.loading) {
        state.loading = true;
        fetch("reports.json?v=" + Date.now())
          .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
          .then(function(j){
            state.data = (j.items||[]).slice().sort(function(a,b){
              return String(b.date||b.month||"").localeCompare(String(a.date||a.month||"")); });
            state.loading = false;
            if (tab === "archive") archiveView();
          })
          .catch(function(e){
            state.err = e.message || String(e); state.loading = false;
            if (tab === "archive") archiveView();
          });
      }
      return;
    }
    body.innerHTML = shellHtml(listHtml());
    bind();
  }

  function errHtml(){
    return '<div class="arc-msg">자료 목록(<code>reports.json</code>)을 불러오지 못했습니다.<br>' +
      '<span style="font-size:11.5px">' + esc(state.err) + '</span><br><br>' +
      '저장소 최상위에 <code>reports.json</code> 파일이 있는지 확인해 주세요.</div>';
  }

  function shellHtml(inner){
    var d = state.data || [];
    var types = ["전체"], owners = ["전체"], i;
    for (i=0;i<d.length;i++){
      if (d[i].type && types.indexOf(d[i].type)<0) types.push(d[i].type);
      if (d[i].owner && owners.indexOf(d[i].owner)<0) owners.push(d[i].owner);
    }
    var h = '<div class="arc-top"><div class="arc-search">' +
      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="search" id="arcQ" placeholder="제목 · 태그 · 담당자 검색" value="' + esc(state.q) + '"></div></div>';
    if (types.length > 2) h += chipRow("종류", types, state.type, "type");
    if (owners.length > 2) h += chipRow("담당", owners, state.owner, "owner");
    h += '<p class="arc-cnt" id="arcCnt"></p>';
    return h + '<div id="arcList">' + inner + '</div>';
  }

  function chipRow(label, arr, cur, kind){
    var h = '<div class="arc-chips"><span class="lbl">' + label + '</span>';
    for (var i=0;i<arr.length;i++){
      h += '<button class="arc-chip' + (arr[i]===cur?" on":"") + '" data-k="' + kind +
           '" data-v="' + esc(arr[i]) + '">' + esc(arr[i]) + '</button>';
    }
    return h + "</div>";
  }

  function match(x){
    if (state.type !== "전체" && x.type !== state.type) return false;
    if (state.owner !== "전체" && x.owner !== state.owner) return false;
    if (!state.q) return true;
    var hay = [x.title,x.subtitle,x.owner,x.type,x.period,x.note]
      .concat(x.tags||[]).join(" ").toLowerCase();
    return hay.indexOf(state.q) >= 0;
  }

  function cardHtml(x){
    var isFav = favs().indexOf(x.id) >= 0, i;
    var bd = '<span class="ty">' + esc(x.type||"자료") + '</span>';
    if (x.period) bd += '<span>' + esc(x.period) + '</span>';
    var tg = x.tags||[];
    for (i=0;i<tg.length;i++) bd += '<span>#' + esc(tg[i]) + '</span>';
    var st = "", ss = x.stats||[];
    for (i=0;i<ss.length;i++){
      st += '<div><div class="l">' + esc(ss[i].label) + '</div>' +
            '<div class="v ' + esc(ss[i].tone||"") + '">' + esc(ss[i].value) + '</div></div>';
    }
    return '<div class="arc-card">' +
      '<div class="arc-card-t"><h4>' + esc(x.title) + '</h4>' +
        '<button class="arc-star' + (isFav?" on":"") + '" data-fav="' + esc(x.id) + '" title="즐겨찾기">' +
        '<svg viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/></svg>' +
        '</button></div>' +
      (x.subtitle ? '<p class="sub">' + esc(x.subtitle) + '</p>' : "") +
      '<div class="arc-bd">' + bd + '</div>' +
      (st ? '<div class="arc-st">' + st + '</div>' : "") +
      (x.note ? '<p class="arc-note">' + esc(x.note) + '</p>' : "") +
      '<div class="arc-ft"><span class="dt">' + esc(x.date||"") + ' 등록</span>' +
      '<a class="arc-open" href="' + esc(x.file) + '" target="_blank" rel="noopener">열기 →</a></div>' +
    '</div>';
  }

  function listHtml(){
    var rows = (state.data||[]).filter(match), f = favs(), i;
    if (!rows.length) {
      return '<div class="arc-msg">' + ((state.data||[]).length
        ? "조건에 맞는 자료가 없습니다.<br>검색어나 필터를 바꿔보세요."
        : "아직 등록된 자료가 없습니다.") + "</div>";
    }
    var favRows = [], rest = [];
    for (i=0;i<rows.length;i++) (f.indexOf(rows[i].id)>=0 ? favRows : rest).push(rows[i]);

    var h = "";
    if (favRows.length) {
      h += '<div class="arc-sec fav"><div class="arc-sec-h"><b>★ 즐겨찾기</b>' +
           '<span>' + favRows.length + '건</span></div><div class="arc-grid">' +
           favRows.map(cardHtml).join("") + "</div></div>";
    }
    var groups = {}, keys = [];
    for (i=0;i<rest.length;i++){
      var k = rest[i].month || "기타";
      if (!groups[k]) { groups[k] = []; keys.push(k); }
      groups[k].push(rest[i]);
    }
    keys.sort().reverse();
    for (i=0;i<keys.length;i++){
      var m = /^(\d{4})-(\d{2})$/.exec(keys[i]);
      var label = m ? (m[1] + "년 " + (+m[2]) + "월") : keys[i];
      h += '<div class="arc-sec"><div class="arc-sec-h"><b>' + esc(label) + '</b>' +
           '<span>' + groups[keys[i]].length + '건</span></div><div class="arc-grid">' +
           groups[keys[i]].map(cardHtml).join("") + "</div></div>";
    }
    return h;
  }

  function repaint(){
    var l = document.getElementById("arcList");
    if (l) { l.innerHTML = listHtml(); bindList(); }
    updateCount();
  }
  function updateCount(){
    var c = document.getElementById("arcCnt");
    if (!c || !state.data) return;
    var n = state.data.filter(match).length, all = state.data.length;
    var filtered = state.q || state.type !== "전체" || state.owner !== "전체";
    c.textContent = filtered ? (n + "건 / 전체 " + all + "건") : ("전체 " + all + "건");
  }
  function bindList(){
    var stars = document.querySelectorAll("#arcList .arc-star");
    for (var i=0;i<stars.length;i++){
      stars[i].onclick = function(){
        var id = this.getAttribute("data-fav"), f = favs(), k = f.indexOf(id);
        if (k < 0) f.push(id); else f.splice(k, 1);
        favSet(f); repaint();
      };
    }
  }
  function bind(){
    var q = document.getElementById("arcQ");
    if (q) {
      q.oninput = function(){ state.q = this.value.trim().toLowerCase(); repaint(); };
    }
    var chips = document.querySelectorAll(".arc-chip");
    for (var i=0;i<chips.length;i++){
      chips[i].onclick = function(){
        var k = this.getAttribute("data-k"), v = this.getAttribute("data-v");
        if (k === "type") state.type = v; else state.owner = v;
        var sib = this.parentNode.querySelectorAll(".arc-chip");
        for (var j=0;j<sib.length;j++) sib[j].classList.toggle("on", sib[j] === this);
        repaint();
      };
    }
    bindList();
    updateCount();
  }
})();
