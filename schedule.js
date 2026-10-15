/* 교육일정 관리 모듈 (간호교육 참석현황 대시보드 · 간호교육팀 운영 대시보드 공용)
 * 한 곳(이 파일)에서만 관리하고, 두 대시보드가 같은 파일을 불러와 같은 화면을 보여 줍니다.
 *   EduSchedule.mount(요소, { call: body => Promise<json>, sessions: () => 실제실시기록배열, names: 구분코드→이름 })
 *   call    : 서버(교육일정 API)로 요청을 보내는 함수. 로그인·권한은 호출하는 대시보드가 처리합니다.
 *   sessions: 참석 명단 기준 실시 기록(id,k,d,dts,t,n1,n2). 없으면 빈 배열(실시 기록 대조만 빠집니다).
 */
(function () {
'use strict';
let OPT = {}, ROOT = null;
const Q = s => ROOT && ROOT.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => (n ?? 0).toLocaleString('ko-KR');
const md = d => { const [, m, dd] = String(d).split('-'); return `${+m}/${+dd}`; };
const NAMES = () => (typeof OPT.names === 'function' ? OPT.names() : OPT.names) || {};
let _sc = null, _sr = null;
function sessions9() {   // 서버 원본(n1=0, n2>0 이면 시트2 인원 사용)과 대시보드 가공본 모두 허용
  const raw = (typeof OPT.sessions === 'function' ? OPT.sessions() : OPT.sessions) || [];
  if (raw === _sr && _sc) return _sc;
  _sr = raw; _sc = raw.map(s => { const dts = [].concat(s.dts || []); return {...s, dts, n1: (s.n1 === 0 && s.n2 > 0) ? s.n2 : (s.n1 || 0)}; });
  return _sc;
}
function draw() { if (!ROOT) return; ROOT.innerHTML = render9(); bind9(); }
function dlg9() {
  let d = document.getElementById('dlg-sched9');
  if (!d) {
    d = document.createElement('dialog'); d.id = 'dlg-sched9';
    d.innerHTML = '<div class="dh"><div><h3></h3><p></p></div><button class="x" aria-label="닫기">×</button></div><div class="db"></div>';
    d.querySelector('.x').addEventListener('click', () => d.close()); document.body.appendChild(d);
  }
  return d;
}
function showImg9(title, sub, url, big) {
  const d = dlg9(); d.querySelector('h3').textContent = title; d.querySelector('p').textContent = sub || '';
  d.querySelector('.db').innerHTML = `<img src="${url}" alt="포스터" style="width:100%;height:auto;border-radius:8px">` + (big ? '<a class="btn" id="pz9" href="#">새 창에서 크게 보기</a>' : '');
  if (big) d.querySelector('#pz9').addEventListener('click', async ev => { ev.preventDefault(); const b = await (await fetch(url)).blob(); window.open(URL.createObjectURL(b), '_blank'); });
  d.style.width = 'min(900px,96vw)'; d.addEventListener('close', () => { d.style.width = ''; }, {once: true}); d.showModal();
}
const S9 = {data: null, loading: false, err: '', view: 'cal', month: '', all: false, act: true, X: null, A: null, Aload: '', mx: false, MX: {}, cmp: null, draft: null, edit: null, busy: '', msg: ''};
const COLS9 = [['g', '구분', 90], ['t', '교육명', 210], ['tg', '대상', 110], ['d', '일자', 104], ['s', '시작', 62], ['e', '종료', 62], ['p', '장소', 110], ['i', '강사', 90], ['n', '비고', 100], ['x', '실시 정보', 110]];
const api9 = body => OPT.call(body);
const ym9 = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const today9 = () => { const d = new Date(); return ym9() + '-' + String(d.getDate()).padStart(2, '0'); };
const shift9 = (m, k) => { const [y, mo] = m.split('-').map(Number), d = new Date(y, mo - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const wd9 = d => '일월화수목금토'[new Date(d + 'T00:00:00').getDay()];
const hue9 = g => { let h = 0; for (const c of String(g || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const dOK9 = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(new Date(d + 'T00:00:00'));
const bad9 = r => !String(r.t || '').trim() || !dOK9(r.d);
const msg9 = e => { const m = String(e.message || e); return /unknown action|토큰이 올바르지/.test(m) ? '서버(Apps Script)에 교육일정 기능이 아직 배포되지 않았습니다. 서버 코드 추가·새 버전 배포 후 다시 시도하세요.' : m; };
async function load9() {
  S9.loading = true; S9.err = ''; draw();
  try {
    const j = await api9({action: 'schedlist'}); S9.data = {rows: j.rows || [], posters: j.posters || []};
    if (!S9.month) { const ms = [...new Set(S9.data.rows.map(r => r.d.slice(0, 7)))].sort(); S9.month = ms.includes(ym9()) || !ms.length ? ym9() : ms[ms.length - 1]; }
  } catch (e) { S9.data = null; S9.err = msg9(e); }
  S9.loading = false; draw();
}
// 포스터 사진을 긴 변 2000px 이하 JPEG로 줄여 전송량을 줄임
function img9(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const r = Math.min(1, 2000 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.88));
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이미지를 읽을 수 없습니다. JPG·PNG 파일을 올려 주세요.')); };
    im.src = url;
  });
}
async function pick9(file) {
  if (!file) return;
  S9.busy = '포스터를 AI가 읽는 중… (30초 정도 걸릴 수 있습니다)'; S9.msg = ''; S9.draft = null; S9.edit = null; draw();
  try {
    const url = await img9(file), j = await api9({action: 'schedextract', image: url.split(',')[1], mime: 'image/jpeg'});
    if (!j.rows || !j.rows.length) throw new Error('일정을 찾지 못했습니다. 더 선명한 이미지로 다시 올려 보세요.');
    S9.draft = {rows: j.rows.map(r => ({...r})), month: j.month || '', name: file.name, url};
    if (j.month) S9.month = j.month;
  } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
  if (S9.draft) ROOT.querySelector('#dr9')?.scrollIntoView({behavior: 'smooth', block: 'start'});
}
async function save9() {
  const d = S9.draft; if (!d) return;
  if (d.rows.some(bad9)) { S9.msg = '⚠ 빨간 칸(교육명·일자 형식 2026-10-07)을 고친 뒤 저장하세요.'; return draw(); }
  S9.busy = '저장하는 중…'; S9.msg = ''; draw();
  try {
    const j = await api9({action: 'schedsave', rows: d.rows, poster: d.url ? {image: d.url.split(',')[1], mime: 'image/jpeg', name: d.name, month: d.month} : null});
    S9.data = {rows: j.rows, posters: j.posters}; S9.cmp = null; S9.draft = null;
    S9.msg = `저장했습니다: ${j.added}건` + (j.skipped ? ` · 이미 등록된 ${j.skipped}건은 건너뜀` : '') + calMsg9(j);
  } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
async function esave9() {
  const o = {id: S9.edit.id || ''}; ROOT.querySelectorAll('[data-e9]').forEach(i => { o[i.dataset.e9] = i.value.trim(); });
  S9.edit = o;
  if (bad9(o)) { S9.msg = '⚠ 교육명과 일자(2026-10-07 형식)를 입력하세요.'; return draw(); }
  S9.busy = '저장하는 중…'; S9.msg = ''; draw();
  try {
    const j = o.id ? await api9({action: 'schedupdate', row: o}) : await api9({action: 'schedsave', rows: [o]});
    S9.data = {rows: j.rows, posters: j.posters || S9.data.posters}; S9.cmp = null; S9.month = o.d.slice(0, 7); S9.edit = null;
    S9.msg = (o.id ? '수정했습니다.' : (j.skipped ? '같은 날짜·교육명·시작시간의 일정이 이미 있어 추가하지 않았습니다.' : '추가했습니다.')) + calMsg9(j);
  } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
async function del9(ids, what) {
  if (!confirm(what + ' 삭제할까요?')) return;
  S9.busy = '삭제하는 중…'; draw();
  try { const j = await api9({action: 'scheddelete', ids}); S9.data.rows = j.rows; S9.cmp = null; S9.edit = null; S9.msg = '삭제했습니다.' + calMsg9(j); } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
const calMsg9 = j => !j.cal ? '' : j.cal.ok ? (j.cal.added || j.cal.updated || j.cal.deleted ? ' · 구글 캘린더에도 반영했습니다' : '') : ' · ⚠ 구글 캘린더 반영 실패: ' + j.cal.err;
async function calSync9() {
  S9.busy = '구글 캘린더에 반영하는 중…'; S9.msg = ''; draw();
  try { const j = await api9({action: 'schedcalsync'}); S9.msg = j.added ? `구글 캘린더 「간호교육 일정」에 ${j.added}건을 추가했습니다.` : '이미 모두 구글 캘린더에 반영되어 있습니다.'; } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
async function loadA9(m) {
  S9.Aload = m;
  try { const j = await api9({action: 'schedactual', month: m}); S9.A = {month: m, rows: j.rows || []}; } catch (e) { S9.A = {month: m, rows: [], err: String(e.message || e)}; }
  S9.Aload = ''; draw();
}
async function cmp9() {
  S9.busy = '원내교육실시현황과 대조하는 중…'; S9.msg = ''; draw();
  try { S9.cmp = await api9({action: 'schedcompare'}); } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
async function view9(pid) {
  S9.busy = '포스터를 불러오는 중…'; draw();
  try {
    const j = await api9({action: 'schedposter', pid}), url = `data:${j.mime};base64,${j.image}`, p = S9.data.posters.find(x => x.id === pid) || {};
    showImg9((p.month ? p.month + ' ' : '') + '교육일정 포스터', p.name || '', url, true);
  } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
async function pdel9(pid) {
  const p = S9.data.posters.find(x => x.id === pid); if (!p) return;
  const n = S9.data.rows.filter(r => r.pid === pid).length;
  if (!confirm(`「${p.month} ${p.name}」 포스터를 삭제할까요?\n(드라이브 휴지통으로 이동합니다)`)) return;
  const withRows = n > 0 && confirm(`이 포스터에서 등록한 일정 ${n}건도 함께 삭제할까요?\n확인 = 일정도 삭제 / 취소 = 일정은 그대로 두고 포스터만 삭제`);
  S9.busy = '삭제하는 중…'; draw();
  try { const j = await api9({action: 'schedposterdel', pid, rows: withRows}); S9.data = {rows: j.rows, posters: j.posters}; S9.cmp = null; S9.msg = '삭제했습니다.'; } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
function act9(el) {
  const a = el.dataset.a9, v = el.dataset.v, id = el.dataset.id;
  if (a === 'rl') { S9.err = ''; S9.data = null; return draw(); }
  if (a === 'prev') { S9.month = shift9(S9.month || ym9(), -1); return draw(); }
  if (a === 'next') { S9.month = shift9(S9.month || ym9(), 1); return draw(); }
  if (a === 'today') { S9.month = ym9(); return draw(); }
  if (a === 'view') { S9.view = v; return draw(); }
  if (a === 'newd') { S9.edit = {id: '', g: '', t: '', tg: '', d: v, s: '', e: '', p: '', i: '', n: '', x: ''}; S9.msg = ''; draw(); return Q('#ed9')?.scrollIntoView({behavior: 'smooth', block: 'center'}); }
  if (a === 'xadd') { const x = S9.X && S9.X.extra[+v]; if (!x) return; S9.edit = {id: '', g: kn9(x.a), t: x.a.s.t, tg: '', d: x.d, s: '', e: '', p: '', i: '', n: '시트 실시 기록에서 추가'}; S9.msg = ''; draw(); return Q('#ed9')?.scrollIntoView({behavior: 'smooth', block: 'center'}); }
  if (a === 'cal') return calSync9();
  if (a === 'mx') { S9.mx = v === '1'; return draw(); }
  if (a === 'xedit') return xedit9(id);
  if (a === 'act') { S9.act = !S9.act; return draw(); }
  if (a === 'all') { S9.all = !S9.all; return draw(); }
  if (a === 'new') { S9.edit = {id: '', g: '', t: '', tg: '', d: (S9.month || ym9()) + '-01', s: '', e: '', p: '', i: '', n: '', x: ''}; S9.msg = ''; draw(); return Q('#ed9')?.scrollIntoView({behavior: 'smooth', block: 'center'}); }
  if (a === 'edit') { const r = S9.data.rows.find(x => x.id === id); if (r) { S9.edit = {...r}; S9.msg = ''; draw(); Q('#ed9')?.scrollIntoView({behavior: 'smooth', block: 'center'}); } return; }
  if (a === 'ecancel') { S9.edit = null; return draw(); }
  if (a === 'esave') return esave9();
  if (a === 'edel') return del9([S9.edit.id], '이 일정을');
  if (a === 'del') { const r = S9.data.rows.find(x => x.id === id); return del9([id], `「${r ? r.t : ''}」 일정을`); }
  if (a === 'dsave') return save9();
  if (a === 'dcancel') { S9.draft = null; S9.msg = ''; return draw(); }
  if (a === 'dadd') { S9.draft.rows.push({g: '', t: '', tg: '', d: (S9.draft.month || S9.month || ym9()) + '-01', s: '', e: '', p: '', i: '', n: '', x: ''}); return draw(); }
  if (a === 'ddel') { S9.draft.rows.splice(+v, 1); return draw(); }
  if (a === 'dview') return showImg9('업로드한 포스터', S9.draft.name || '', S9.draft.url, false);
  if (a === 'cmp') return cmp9();
  if (a === 'pv') return view9(v);
  if (a === 'pdel') return pdel9(v);
}
// 실제 실시 기록(참석 명단 기준 SESS)과 포스터 일정을 대조: 같은 날짜 + 비슷한 교육명이면 같은 교육으로 봄
const nrm9 = t => { t = String(t || '').toLowerCase().replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)?/g, ''); const m = t.match(/^(?:직무교육|재직직무|전담직무|전담 직무|선임교육|선임간호사 교육|파트장 ?직무(?:교육)?|파트장 ?교육|파트장 역량강화|bnp|재직술기|전략적 문제해결|소아 직무교육|gs 직무교육|무엇이든 물어보살)\s*[:_]\s*(.+)$/); if (m) t = m[1]; return t.replace(/[^0-9a-z가-힣]/g, ''); };
const big9 = n => { const h = new Set(); for (let i = 0; i < n.length - 1; i++) h.add(n.substr(i, 2)); return h; };
function sim9(x, y) {
  const a = nrm9(x), b = nrm9(y); if (!a || !b) return 0; if (a === b) return 1;
  const sub = a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a)) ? 0.9 : 0;
  const A = big9(a), B = big9(b); if (!A.size || !B.size) return sub;
  const sm = A.size <= B.size ? A : B, bg = A.size <= B.size ? B : A; let c = 0; sm.forEach(h => { if (bg.has(h)) c++; });
  return Math.max(sub, c / sm.size);
}
const cat9 = (g, k) => { g = String(g || ''); if (/파트장/.test(g)) return k === 'PTL'; if (/선임/.test(g)) return k === 'SEN'; if (/술기/.test(g)) return k === 'EMG' || k === 'TOP'; if (/직무/.test(g)) return ['REG', 'EMG', 'TOP', 'DED'].includes(k); return false; };
function match9(m, rows) {
  const today = today9(), res = {st: {}, extra: [], n: 0};
  const acts = sessions9().map(s => ({s, ds: [...new Set((s.dts.length ? s.dts : [s.d]).filter(d => d && d.slice(0, 7) === m))]})).filter(a => a.ds.length);
  res.n = acts.length;
  const slot = (a, d) => a.s.id + '|' + d, usedS = new Set(), usedR = new Set(), put = (r, a, d, st, sc) => { res.st[r.id] = {st, a, d, sc}; usedR.add(r.id); usedS.add(slot(a, d)); };
  const pairs = []; rows.forEach(r => acts.forEach(a => pairs.push({r, a, sc: sim9(r.t, a.s.t), same: a.ds.includes(r.d)})));
  const pass = (f, st) => pairs.filter(f).sort((x, y) => y.sc - x.sc).forEach(p => { if (!usedR.has(p.r.id) && !usedS.has(slot(p.a, p.r.d))) put(p.r, p.a, p.r.d, st, p.sc); });
  pass(p => p.same && p.sc >= 0.6, 'ok');         // 같은 날짜 + 교육명 비슷
  pass(p => p.same && p.sc >= 0.25, 'guess');    // 같은 날짜 + 교육명 일부 일치
  const days = [...new Set(rows.map(r => r.d))];  // 같은 날짜에 남은 일정·실시가 1:1이면 교육명이 달라도 같은 교육으로 판단
  days.forEach(d => {
    const rs = rows.filter(r => r.d === d && !usedR.has(r.id)), as = acts.filter(a => a.ds.includes(d) && !usedS.has(slot(a, d)));
    if (rs.length === 1 && as.length === 1) return put(rs[0], as[0], d, 'guess', sim9(rs[0].t, as[0].s.t));
    rs.forEach(r => { // 같은 날짜에 실시가 여러 건이면 구분(직무·술기·파트장·선임)이 맞는 것 중 교육명이 가장 비슷한 1건
      const left = as.filter(a => !usedS.has(slot(a, d))), ok = left.filter(a => cat9(r.g, a.s.k)), pool = ok.length ? ok : [];
      const best = pool.map(a => ({a, sc: sim9(r.t, a.s.t)})).sort((x, y) => y.sc - x.sc)[0];
      if (best && (pool.length === 1 || best.sc > 0.1)) put(r, best.a, d, 'guess', best.sc);
    });
  });
  rows.forEach(r => { // 날짜가 다른 비슷한 교육(±): 날짜 변경 가능성
    if (usedR.has(r.id)) return;
    let best = null, bs = 0; acts.forEach(a => { const sc = sim9(r.t, a.s.t); if (!a.ds.includes(r.d) && sc > bs && a.ds.some(d => !usedS.has(slot(a, d)))) { bs = sc; best = a; } });
    if (best && bs >= 0.8) { const d = best.ds.filter(x => !usedS.has(slot(best, x))).sort((x, y) => Math.abs(new Date(x) - new Date(r.d)) - Math.abs(new Date(y) - new Date(r.d)))[0]; put(r, best, d, 'near', bs); }
    else res.st[r.id] = {st: r.d <= today ? 'none' : 'future'};
  });
  const A = S9.A && S9.A.month === m ? S9.A.rows.filter(x => !isMx9(x)) : [], usedA = new Set(); // 시트2 원본 기록(구분과 무관): 6개 구분에 안 잡히는 교육(신규간호사 교육 등)도 대조
  const pending = () => rows.filter(r => !usedR.has(r.id) && res.st[r.id] && (res.st[r.id].st === 'none' || res.st[r.id].st === 'future'));
  const claimed = x => acts.some(a => a.ds.includes(x.d) && sim9(x.t, a.s.t) >= 0.6);
  const putA = (r, x, sc) => { res.st[r.id] = {st: 'guess', a: {s: {t: x.t, n1: x.n, k: ''}, ds: [x.d]}, d: x.d, sc, sheet: true}; usedR.add(r.id); usedA.add(x); };
  pairs.length = 0; pending().forEach(r => A.forEach(x => { if (x.d === r.d) pairs.push({r, x, sc: sim9(r.t, x.t)}); }));
  pairs.filter(p => p.sc >= 0.25).sort((p, q) => q.sc - p.sc).forEach(p => { if (!usedR.has(p.r.id) && !usedA.has(p.x)) putA(p.r, p.x, p.sc); });
  days.forEach(d => { const rs = pending().filter(r => r.d === d), xs = A.filter(x => x.d === d && !usedA.has(x) && !claimed(x)); if (rs.length === 1 && xs.length === 1) putA(rs[0], xs[0], 0); });
  acts.forEach(a => a.ds.forEach(d => { if (!usedS.has(slot(a, d))) res.extra.push({d, a}); }));
  res.extra.sort((x, y) => x.d.localeCompare(y.d));
  return res;
}
const kn9 = a => NAMES()[a.s.k] || a.s.k || '';
const ovr9 = id => { const r = S9.data && S9.data.rows.find(x => x.id === id); return r && r.x ? r.x : ''; };
const actTag9 = id => {
  const bd = (cls, txt, tip) => `<span class="cp ${cls} xb9" data-a9="xedit" data-id="${esc(id)}" role="button" title="${esc(tip)} · 눌러서 직접 입력">${txt}</span>`;
  const o = ovr9(id); if (o) return bd(/미실시|취소|연기|불참|중단/.test(o) ? 'no' : 'usr', esc(o), '직접 입력한 실시 정보');
  const c = S9.X && S9.X.st[id]; if (!c) return '';
  if (c.st === 'ok') return bd('ok', `실시 ${fmt(c.a.s.n1)}명`, `실제 실시 기록과 일치 · 참석 ${fmt(c.a.s.n1)}명`);
  if (c.st === 'guess') return bd('ok', `실시 ${fmt(c.a.s.n1)}명 · 명칭 상이`, `같은 날짜에 실시된 「${c.a.s.t}」과 같은 교육으로 판단(교육명이 다름) · 참석 ${fmt(c.a.s.n1)}명`);
  if (c.st === 'near') return bd('wn', `실시일 ${md(c.d)}`, `비슷한 교육이 ${c.d}에 실시됨(${c.a.s.t})`);
  return c.st === 'none' ? bd('no', '기록 없음', '날짜가 지났지만 같은 날짜의 참석 기록이 없습니다') : '';
};
async function xedit9(id) {
  const r = S9.data.rows.find(x => x.id === id); if (!r) return;
  const v = prompt(`「${r.t}」 ${r.d.slice(5)}\n실시 정보를 직접 적으세요. (예: 미실시, 다음 달로 이동, 보수교육으로 대체)\n비우고 확인하면 자동 판정으로 돌아갑니다.`, r.x || ''); if (v === null) return;
  S9.busy = '저장하는 중…'; S9.msg = ''; draw();
  try { const j = await api9({action: 'schedupdate', row: {...r, x: v.trim()}}); S9.data.rows = j.rows; S9.msg = '실시 정보를 저장했습니다.' + calMsg9(j); } catch (e) { S9.msg = '⚠ ' + msg9(e); }
  S9.busy = ''; draw();
}
// 부서이동자·부서별 특성화 교육(시트2_분류결과의 대시보드 분류 기준)을 날짜별로 묶어 달력에 함께 표시
const mxc9 = x => x.c || (/부서\s*이동/.test(x.t) ? '부서이동자 교육' : '');
const isMx9 = x => { const c = mxc9(x); return c === '부서이동자 교육' || c === '부서별 특성화 교육'; };
function mx9(m) {
  if (!S9.mx || !S9.A || S9.A.month !== m) return {};
  const by = {}; S9.A.rows.forEach(x => {
    if (!isMx9(x)) return; const c = mxc9(x), k = c === '부서이동자 교육' ? x.d + '|M' : x.d + '|S|' + nrm9(x.t);
    const o = by[k] || (by[k] = {d: x.d, c, t: c === '부서이동자 교육' ? '부서이동자 교육' : x.t, n: 0}); o.n += x.n;
  });
  const out = {}; Object.values(by).forEach(o => (out[o.d] ??= []).push(o)); return out;
}
const cmpTag9 = id => { const c = S9.cmp && S9.cmp.items && S9.cmp.items[id]; if (!c) return ''; return c.st === 'ok' ? '<span class="cp ok" title="원내교육실시현황과 일치">✓</span>' : c.st === 'date' ? `<span class="cp wn" title="원내교육실시현황에는 ${esc(c.md)}로 등록됨">날짜 다름</span>` : '<span class="cp no" title="원내교육실시현황에서 찾지 못함">현황 없음</span>'; };
function cal9(rows, m) {
  const [Y, M] = m.split('-').map(Number), first = new Date(Y, M - 1, 1).getDay(), last = new Date(Y, M, 0).getDate(), by = {};
  rows.forEach(r => (by[r.d] ??= []).push(r));
  const byA = {}; ((S9.X && S9.X.extra) || []).forEach(x => (byA[x.d] ??= []).push(x)); const MX = S9.MX || {};
  let cells = ''; for (let i = 0; i < first; i++) cells += '<div class="cd0"></div>';
  for (let d = 1; d <= last; d++) {
    const ds = `${m}-${String(d).padStart(2, '0')}`, w = (first + d - 1) % 7, ev = (by[ds] || []).sort((a, b) => a.s.localeCompare(b.s));
    cells += `<div class="cd${w === 0 ? ' su' : w === 6 ? ' sa' : ''}${ds === today9() ? ' td' : ''}"><b>${d}</b><button class="addd9" data-a9="newd" data-v="${ds}" title="이 날짜에 일정 추가" aria-label="${d}일에 일정 추가">＋</button>${ev.map(r => `<button class="ev9" style="--h:${hue9(r.g)}" data-a9="edit" data-id="${esc(r.id)}" title="${esc([r.g, r.t, r.tg && '대상: ' + r.tg, (r.s || r.e) && (r.s + '~' + r.e), r.p && '장소: ' + r.p, r.i && '강사: ' + r.i].filter(Boolean).join(' · '))}">${r.s ? `<i>${esc(r.s)}</i> ` : ''}${esc(r.t)}${cmpTag9(r.id)}${actTag9(r.id)}</button>`).join('')}${(byA[ds] || []).map(x => `<button class="ev9 act" data-a9="xadd" data-v="${S9.X.extra.indexOf(x)}" style="--h:${hue9(kn9(x.a))}" title="실제 실시 기록(포스터에 없음) · ${esc(kn9(x.a))} · ${esc(x.a.s.t)} · 참석 ${fmt(x.a.s.n1)}명 — 누르면 일정에 추가">${esc(x.a.s.t)} <span class="cp ok">실시 ${fmt(x.a.s.n1)}명</span></button>`).join('')}${(MX[ds] || []).map(o => `<div class="ev9 mx" title="${esc(o.c)} · ${esc(o.t)} · ${fmt(o.n)}명(시트2 기준)">${esc(o.t)} <span class="cp">${fmt(o.n)}명</span></div>`).join('')}</div>`;
  }
  return `<div class="cwrap9"><div class="cal9">${['일', '월', '화', '수', '목', '금', '토'].map(x => `<div class="ch">${x}</div>`).join('')}${cells}</div></div>`;
}
function list9(rows) {
  if (!rows.length) return '<p class="hint" style="margin:8px 0">등록된 일정이 없습니다. 위에서 포스터를 올리거나 「일정 추가」를 눌러 입력하세요.</p>';
  return `<div class="tw" style="max-height:none"><table class="tl9"><thead><tr><th>일자</th><th>시간</th><th>구분</th><th>교육명</th><th>대상</th><th>장소</th><th>강사</th>${S9.cmp ? '<th>원내현황</th>' : ''}${S9.X ? '<th>실시 기록</th>' : ''}<th></th></tr></thead><tbody>${rows.map(r => `<tr><td class="nw">${esc(r.d.slice(5))} (${wd9(r.d)})</td><td class="nw">${esc(r.s)}${r.e ? '~' + esc(r.e) : ''}</td><td><span class="kc" style="--h:${hue9(r.g)}"><i></i>${esc(r.g)}</span></td><td>${esc(r.t)}${r.n ? `<br><small class="mut">${esc(r.n)}</small>` : ''}</td><td>${esc(r.tg)}</td><td>${esc(r.p)}</td><td>${esc(r.i)}</td>${S9.cmp ? `<td class="nw">${cmpTag9(r.id)}</td>` : ''}${S9.X ? `<td class="nw">${actTag9(r.id)}</td>` : ''}<td class="nw"><button class="btn" data-a9="edit" data-id="${esc(r.id)}">수정</button> <button class="btn" data-a9="del" data-id="${esc(r.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>`;
}
function render9() {
  if (!S9.data && !S9.loading && !S9.err) setTimeout(load9, 0);
  if (S9.err) return `<div class="callout warn">${esc(S9.err)}</div><p style="margin-top:10px"><button class="btn" data-a9="rl">다시 불러오기</button></p>`;
  if (!S9.data) return `<div class="callout">교육일정을 불러오는 중…</div>`;
  const m = S9.month || ym9(), all = S9.data.rows.slice().sort((a, b) => a.d.localeCompare(b.d) || a.s.localeCompare(b.s)), inM = all.filter(r => r.d.slice(0, 7) === m);
  const posM = S9.data.posters.filter(p => p.month === m || inM.some(r => r.pid === p.id));
  const inp = (k, v, w, cls) => `<input class="i9${cls ? ' ' + cls : ''}" style="min-width:${w}px" value="${esc(v)}" ${/(="x"|:x")/.test(k) ? 'list="x9" placeholder="예: 미실시" ' : ''}${k}>`;
  const draft = S9.draft ? `<section class="card" id="dr9"><div class="tools"><div><h2>AI가 읽은 일정 확인 <small>${S9.draft.rows.length}건${S9.draft.month ? ' · ' + esc(S9.draft.month) : ''}</small></h2><p class="hint" style="margin:0">포스터와 비교하며 잘못 읽은 칸을 고친 뒤 저장하세요. 빨간 칸은 비었거나 일자 형식(2026-10-07)이 아닙니다. 저장하면 포스터 사진도 함께 보관됩니다.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-a9="dview">포스터 보기</button><button class="btn" data-a9="dadd">행 추가</button><button class="btn" data-a9="dcancel">취소</button><button class="btn pri" data-a9="dsave">${S9.draft.rows.length}건 저장</button></div></div>
      <div class="tw" style="max-height:none;margin-top:12px"><table class="tl9"><thead><tr>${COLS9.map(c => `<th>${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>${S9.draft.rows.map((r, i) => `<tr>${COLS9.map(c => `<td>${inp(`data-d9="${i}:${c[0]}"`, r[c[0]], c[2], (c[0] === 't' && !String(r.t || '').trim()) || (c[0] === 'd' && !dOK9(r.d)) ? 'bad' : '')}</td>`).join('')}<td><button class="btn" data-a9="ddel" data-v="${i}" title="이 행 빼기">✕</button></td></tr>`).join('')}</tbody></table></div></section>` : '';
  const E = S9.edit, edit = E ? `<section class="card" id="ed9"><h2>${E.id ? '일정 수정' : '일정 추가'}</h2><div class="ef9">${COLS9.map(c => `<label><span>${c[1]}${c[0] === 't' || c[0] === 'd' ? ' *' : ''}</span>${inp(`data-e9="${c[0]}"`, E[c[0]], 0, (c[0] === 't' && !String(E.t || '').trim()) || (c[0] === 'd' && !dOK9(E.d)) ? 'bad' : '')}</label>`).join('')}</div>
      <p class="hint" style="margin:10px 0 0">일자는 2026-10-07 형식, 시간은 14:00 형식으로 적습니다. 「실시 정보」에 적은 내용(예: 미실시, 연기)은 자동 판정 대신 달력·목록에 그대로 표시됩니다. 비우면 시트 기록과 자동 대조한 결과가 표시됩니다.</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" data-a9="esave">저장</button><button class="btn" data-a9="ecancel">취소</button>${E.id ? '<button class="btn" data-a9="edel">삭제</button>' : ''}</div></section>` : '';
  let cmp = '';
  if (S9.cmp && S9.cmp.items) {
    const c = inM.map(r => S9.cmp.items[r.id] || {st: 'none'}), n = k => c.filter(x => x.st === k).length, om = (S9.cmp.onlyMaster || []).filter(x => x.d.slice(0, 7) === m);
    cmp = `<section class="card"><h2>원내교육실시현황 대조 <small>${esc(m)}</small></h2><p class="hint">일정표와 「원내교육실시현황」의 날짜·교육명을 비교한 결과입니다. 교육명이 조금 달라도 비슷하면 같은 교육으로 봅니다.</p>
      <div class="cg9"><span class="cp ok">✓ 일치 ${n('ok')}건</span><span class="cp wn">날짜 다름 ${n('date')}건</span><span class="cp no">현황에 없음 ${n('none')}건</span><span class="cp no">일정표에 없음 ${om.length}건</span></div>
      ${om.length ? `<p class="hint" style="margin:12px 0 6px">원내교육실시현황에는 있지만 이 달 일정표에 없는 교육</p><div class="tw" style="max-height:none"><table class="tl9"><thead><tr><th>일자</th><th>구분</th><th>교육명</th><th>대상</th></tr></thead><tbody>${om.map(x => `<tr><td class="nw">${esc(x.d.slice(5))} (${wd9(x.d)})</td><td>${esc(x.g)}</td><td>${esc(x.t)}</td><td>${esc(x.tg)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${inM.some(r => (S9.cmp.items[r.id] || {}).st === 'date') ? `<p class="hint" style="margin:12px 0 6px">날짜가 다른 교육</p><div class="tw" style="max-height:none"><table class="tl9"><thead><tr><th>교육명</th><th>일정표</th><th>원내현황</th></tr></thead><tbody>${inM.filter(r => (S9.cmp.items[r.id] || {}).st === 'date').map(r => `<tr><td>${esc(r.t)}</td><td class="nw">${esc(r.d.slice(5))} (${wd9(r.d)})</td><td class="nw">${esc(S9.cmp.items[r.id].md.slice(5))}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
  }
  if ((S9.act || S9.mx) && (!S9.A || S9.A.month !== m) && S9.Aload !== m) setTimeout(() => loadA9(m), 0);
  S9.X = S9.act ? match9(m, inM) : null; S9.MX = mx9(m);
  const shown = S9.all ? all : inM;
  const main = `<section class="card"><div class="tools"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button class="btn" data-a9="prev" aria-label="이전 달">◀</button><h2 style="margin:0;min-width:96px;text-align:center">${m.replace('-', '년 ')}월</h2><button class="btn" data-a9="next" aria-label="다음 달">▶</button><button class="btn" data-a9="today">오늘</button><span class="note">${inM.length}건</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="tg" role="group" aria-label="보기"><button data-a9="view" data-v="cal" aria-pressed="${S9.view === 'cal'}">달력</button><button data-a9="view" data-v="list" aria-pressed="${S9.view === 'list'}">목록</button></div>${S9.view === 'list' ? `<button class="chip" data-a9="all" aria-pressed="${S9.all}">전체 기간</button>` : ''}<button class="chip" data-a9="act" aria-pressed="${S9.act}" title="참석 명단(시트) 기준으로 실제 실시된 교육을 달력에 함께 표시">실제 실시 표시</button><div class="tg" role="group" aria-label="부서이동자·특성화 교육"><button data-a9="mx" data-v="0" aria-pressed="${!S9.mx}" title="부서이동자·부서별 특성화 교육을 뺀 달력">부서이동자·특성화 제외</button><button data-a9="mx" data-v="1" aria-pressed="${S9.mx}" title="시트2에 기록된 부서이동자·부서별 특성화 교육을 달력에 함께 표시">포함</button></div><button class="btn" data-a9="new">＋ 일정 추가</button><button class="btn" data-a9="cmp">원내현황 대조</button><button class="btn" data-a9="cal" title="일정을 내 구글 캘린더(「간호교육 일정」)에 반영">구글 캘린더 반영</button>${posM.map(p => `<button class="btn" data-a9="pv" data-v="${esc(p.id)}">포스터 보기</button>`).join('')}</div></div>
      <div style="margin-top:12px">${S9.view === 'cal' ? cal9(inM, m) : list9(shown)}</div></section>`;
  let actCard = '';
  if (S9.X) {
    const X = S9.X, L = Object.entries(X.st), c = k => L.filter(([id, v]) => v.st === k && !(byId[id] && byId[id].x)).length, tr = (a, rows) => rows.length ? `<div class="tw" style="max-height:none;margin-bottom:10px"><table class="tl9"><thead><tr>${a}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '';
    const byId = Object.fromEntries(inM.map(r => [r.id, r]));
    const gs = L.filter(([, v]) => v.st === 'guess').map(([id, v]) => [byId[id], v]), noRec = L.filter(([, v]) => v.st === 'none').map(([id]) => byId[id]).filter(r => r && !r.x), near = L.filter(([, v]) => v.st === 'near').map(([id, v]) => [byId[id], v]);
    actCard = `<section class="card"><h2>실제 실시 교육 대조 <small>${esc(m)}</small></h2><p class="hint">시트(참석 명단)에서 분류된 교육과 포스터 일정을 비교합니다. 같은 날짜이고 교육명이 비슷하면 같은 교육으로 봅니다. 부서이동자·부서별 특성화 교육은 교육명이 없어 제외됩니다.</p>
      <div class="cg9"><span class="cp ok">일치 ${c('ok') + c('guess')}건${c('guess') ? ` (교육명 상이 ${c('guess')}건 포함)` : ''}</span><span class="cp wn">날짜 다름 ${c('near')}건</span><span class="cp no">기록 없음 ${c('none')}건</span><span class="cp no">포스터에 없는 실시 ${X.extra.length}건</span><span class="note">이 달 실시 기록 ${X.n}건</span></div>
      <div style="margin-top:12px">${X.extra.length ? '<p class="hint" style="margin:0 0 6px">포스터 일정에는 없지만 실제 실시된 교육</p>' + tr('<th>일자</th><th>구분</th><th>교육명</th><th>참석</th>', X.extra.map(x => `<tr><td class="nw">${esc(x.d.slice(5))} (${wd9(x.d)})</td><td>${esc(kn9(x.a))}</td><td>${esc(x.a.s.t)}</td><td class="nw">${fmt(x.a.s.n1)}명</td></tr>`)) : ''}
      ${gs.length ? '<p class="hint" style="margin:0 0 6px">같은 날짜에 실시되어 같은 교육으로 판단한 항목(교육명이 다름 · 시트2 원본 기록 포함 · 맞는지 확인)</p>' + tr('<th>일자</th><th>포스터 교육명</th><th>시트 교육명</th><th>참석</th>', gs.map(([r, v]) => `<tr><td class="nw">${esc(r.d.slice(5))} (${wd9(r.d)})</td><td>${esc(r.t)}</td><td>${esc(v.a.s.t)}</td><td class="nw">${fmt(v.a.s.n1)}명</td></tr>`)) : ''}
      ${near.length ? '<p class="hint" style="margin:0 0 6px">비슷한 교육이 다른 날짜에 실시된 일정(날짜 변경 가능성)</p>' + tr('<th>교육명</th><th>포스터 일정</th><th>실시일</th><th>참석</th>', near.map(([r, v]) => `<tr><td>${esc(r.t)}</td><td class="nw">${esc(r.d.slice(5))} (${wd9(r.d)})</td><td class="nw">${esc(md(v.d))}</td><td class="nw">${fmt(v.a.s.n1)}명</td></tr>`)) : ''}
      ${noRec.length ? '<p class="hint" style="margin:0 0 6px">날짜가 지났지만 실시 기록이 없는 포스터 일정(미실시·미입력 확인 필요)</p>' + tr('<th>일자</th><th>구분</th><th>교육명</th>', noRec.map(r => `<tr><td class="nw">${esc(r.d.slice(5))} (${wd9(r.d)})</td><td>${esc(r.g)}</td><td>${esc(r.t)}</td></tr>`)) : ''}</div></section>`;
  }
  const cnt = id => S9.data.rows.filter(r => r.pid === id).length;
  const post = `<section class="card"><h2>보관한 포스터 <small>${S9.data.posters.length}장</small></h2>${S9.data.posters.length ? `<div class="tw" style="max-height:none"><table class="tl9"><thead><tr><th>월</th><th>파일</th><th>일정</th><th>등록</th><th></th></tr></thead><tbody>${S9.data.posters.slice().sort((a, b) => b.month.localeCompare(a.month)).map(p => `<tr><td class="nw">${esc(p.month)}</td><td>${esc(p.name)}</td><td class="nw">${cnt(p.id)}건</td><td class="nw">${esc(p.by)} · ${esc(p.at)}</td><td class="nw"><button class="btn" data-a9="pv" data-v="${esc(p.id)}">보기</button> <button class="btn" data-a9="pdel" data-v="${esc(p.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint" style="margin:0">아직 보관한 포스터가 없습니다.</p>'}</section>`;
  const up = `<section class="card"><h2>포스터 올리기</h2><p class="hint">교육일정 포스터 사진(JPG·PNG)을 올리면 AI가 구분·교육명·대상·일시·장소·강사를 읽어 표로 보여 줍니다. 확인·수정 후 저장하세요.</p>
      <label class="up9" id="dz9"><input type="file" id="f9" accept="image/*" hidden><b>이미지 선택</b> 또는 여기로 끌어다 놓기</label></section>`;
  return `<div class="sched9">${S9.busy ? `<div class="callout" style="margin-bottom:12px">⏳ ${esc(S9.busy)}</div>` : ''}${S9.msg ? `<div class="callout${S9.msg[0] === '⚠' ? ' warn' : ''}" style="margin-bottom:12px">${esc(S9.msg)}</div>` : ''}${edit}${main}${actCard}${cmp}${up}${draft}${post}<datalist id="x9"><option value="미실시"><option value="실시"><option value="연기"><option value="취소"><option value="대체 실시"><option value="온라인 실시"></datalist></div>`;
}

function bind9() {
  ROOT.querySelectorAll('[data-a9]').forEach(b => b.addEventListener('click', ev => { if (b.dataset.a9 !== 'xedit' && ev.target.closest('[data-a9="xedit"]')) return; act9(b); }));
  ROOT.querySelectorAll('[data-d9]').forEach(i => i.addEventListener('change', () => { const [n, k] = i.dataset.d9.split(':'); S9.draft.rows[+n][k] = i.value.trim(); i.classList.toggle('bad', (k === 't' && !i.value.trim()) || (k === 'd' && !dOK9(i.value.trim()))); }));
  Q('#f9')?.addEventListener('change', e => { pick9(e.target.files[0]); e.target.value = ''; });
  const dz = Q('#dz9'); if (dz) { dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('on'); }); dz.addEventListener('dragleave', () => dz.classList.remove('on')); dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('on'); pick9(e.dataTransfer.files[0]); }); }
}
const CSS9 = `/* 교육일정 관리 */
.i9{width:100%;height:30px;border:1px solid var(--line2);border-radius:6px;padding:0 6px;background:var(--surface);color:var(--ink);font-size:12.5px}.i9.bad{border-color:#dc2626;background:color-mix(in srgb,#dc2626 8%,var(--surface))}
.tl9{width:100%;border-collapse:collapse;font-size:12.5px}.tl9 th{position:sticky;top:0;background:var(--sunk);text-align:left;padding:7px 8px;font-weight:600;border-bottom:1px solid var(--line2);white-space:nowrap}.tl9 td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}.tl9 .nw{white-space:nowrap}.mut{color:var(--muted)}
.btn.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.up9{display:block;padding:26px 16px;border:2px dashed var(--line2);border-radius:12px;text-align:center;cursor:pointer;color:var(--ink2);font-size:13.5px}.up9:hover,.up9.on{border-color:var(--accent);background:var(--accent-soft)}.up9 b{color:var(--accent)}
.ef9{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.ef9 label{display:grid;gap:4px;font-size:12px;color:var(--muted)}.ef9 label:nth-child(2){grid-column:span 2}
.cwrap9{overflow-x:auto}.cal9{display:grid;grid-template-columns:repeat(7,minmax(104px,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line);min-width:760px}
.cal9 .ch{padding:6px;text-align:center;font-size:12px;font-weight:600;background:var(--sunk);border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.cal9 .cd,.cal9 .cd0{min-height:96px;padding:4px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:3px;min-width:0}.cal9 .cd0{background:var(--sunk)}
.cal9 .cd>b{font-size:12px;color:var(--ink2)}.cal9 .cd.su>b{color:#dc2626}.cal9 .cd.sa>b{color:#2563eb}.cal9 .cd.td{background:var(--accent-soft)}
.ev9{--h:210;display:block;width:100%;text-align:left;border:0;border-left:3px solid hsl(var(--h) 60% 50%);border-radius:4px;background:color-mix(in srgb,hsl(var(--h) 60% 50%) 16%,var(--surface));color:var(--ink);padding:3px 5px;font-size:11.5px;line-height:1.35;cursor:pointer;word-break:keep-all}.ev9 i{font-style:normal;font-weight:700;color:var(--ink2)}
.cp{display:inline-block;margin-left:4px;padding:0 6px;border-radius:999px;font-size:10.5px;font-weight:600;line-height:1.7;background:var(--sunk);border:1px solid var(--line2)}.cp.usr{color:#6d28d9}.cp.ok{color:#15803d}.cp.wn{color:#b45309}.cp.no{color:#b91c1c}.cg9{display:flex;gap:8px;flex-wrap:wrap}.cg9 .cp{margin:0;font-size:12.5px;padding:2px 10px}
.cal9 .cd{position:relative}.addd9{position:absolute;top:2px;right:3px;width:20px;height:20px;border:0;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:13px;line-height:1;cursor:pointer;opacity:0}.cal9 .cd:hover .addd9,.addd9:focus{opacity:1}@media (hover:none){.addd9{opacity:.65}}
.xb9{cursor:pointer}.xb9:hover{outline:1px solid var(--accent)}
.ev9.mx{--h:280;background:transparent;border:1px dotted hsl(var(--h) 40% 55%);border-left:3px solid hsl(var(--h) 40% 55%);cursor:default;color:var(--ink2)}
.ev9.act{background:transparent;border:1px dashed hsl(var(--h) 60% 50%);border-left-width:3px;cursor:pointer}
.tl9 .kc i{background:hsl(var(--h) 60% 50%)}
`;
function css9() {
  if (document.getElementById('sched9-css')) return;
  const st = document.createElement('style'); st.id = 'sched9-css';
  st.textContent = CSS9 + '#dlg-sched9{border:1px solid var(--line2);border-radius:16px;background:var(--surface);color:var(--ink);padding:0;width:min(560px,94vw);max-height:88vh}#dlg-sched9::backdrop{background:rgba(11,18,32,.5)}#dlg-sched9 .dh{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px 18px;border-bottom:1px solid var(--line)}#dlg-sched9 .dh h3{margin:0;font-size:16px}#dlg-sched9 .dh p{margin:4px 0 0;font-size:12px;color:var(--muted)}#dlg-sched9 .db{padding:14px 18px 18px;overflow:auto;max-height:78vh;display:grid;gap:14px}#dlg-sched9 .x{border:0;background:none;font-size:22px;cursor:pointer;color:var(--ink2);line-height:1}';
  document.head.appendChild(st);
}
// 다른 화면에 갔다 와도 보던 달·데이터를 유지합니다(요소만 새로 붙임)
window.EduSchedule = {
  version: '1',
  mount(el, opt) { OPT = opt || {}; ROOT = el; css9(); draw(); },
  reload() { S9.data = null; S9.err = ''; S9.A = null; S9.cmp = null; draw(); }
};
})();
