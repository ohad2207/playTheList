const $=s=>document.querySelector(s),M=$('#main');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(p,m='GET',b){const r=await fetch('/api'+p,{method:m,headers:b?{'Content-Type':'application/json'}:{},body:b?JSON.stringify(b):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||'שגיאה');e.status=r.status;throw e}return j}
let S={me:null,own:[],shared:[],friends:[]},tab='home',open=null;
const all=()=>[...S.own,...S.shared],thumb=v=>`https://i.ytimg.com/vi/${v}/mqdefault.jpg`;
const loopOf=id=>localStorage.getItem('loop'+id)==='1';
async function load(){const p=await api('/playlists');S.own=p.own;S.shared=p.shared;S.friends=await api('/friends')}
async function boot(){try{S.me=(await api('/me')).username;await load()}catch{S.me=null}render()}
function render(){$('#nav').hidden=!S.me;if(!S.me)return authView();
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
 ({home:homeView,library:libView,add:addView,friends:friendsView})[tab]()}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;open=null;render()});

function authView(reg=false){M.innerHTML=`<div class="auth"><h1>playTheList</h1>
<input id="u" placeholder="שם משתמש (באנגלית)" lang="en" autocapitalize="off" spellcheck="false" autocomplete="username" maxlength="20" dir="ltr">
<input id="p" type="password" placeholder="סיסמה (באנגלית בלבד)" lang="en" inputmode="latin" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="${reg?'new-password':'current-password'}" maxlength="72" dir="ltr">
<label class="muted"><input type="checkbox" id="sp" style="width:auto;margin:0 6px">הצגת סיסמה</label><br>
${reg?'<small class="muted">שם משתמש: 3-20 תווים באנגלית/מספרים/_ · סיסמה: לפחות 6 תווים באנגלית</small>':''}
<div class="err" id="e"></div><button class="btn" id="go">${reg?'יצירת חשבון':'התחברות'}</button><br>
<button class="muted" id="sw">${reg?'יש לי כבר חשבון':'אין לי חשבון - הרשמה'}</button></div>`;
 $('#sw').onclick=()=>authView(!reg);
 $('#sp').onchange=e=>$('#p').type=e.target.checked?'text':'password';
 const en=(el,re)=>el.oninput=()=>{const v=el.value.replace(re,'');if(v!==el.value){el.value=v;$('#e').textContent='יש לכתוב באנגלית בלבד - החליפו את המקלדת לאנגלית (Alt+Shift)'}};
 en($('#p'),/[^\x21-\x7E]/g);en($('#u'),/[^A-Za-z0-9_]/g);
 $('#go').onclick=async()=>{try{await api(reg?'/register':'/login','POST',{username:$('#u').value,password:$('#p').value});await boot()}catch(e){$('#e').textContent=e.message}};
 $('#p').onkeydown=e=>{if(e.key==='Enter')$('#go').click()}}

function homeView(){const a=all();
 if(!a.length){M.innerHTML=`<h1>היי ${esc(S.me)} 👋</h1><p class="muted">עוד אין פלייליסטים. עברו ללשונית "הוספה" כדי להתחיל.</p>`;return}
 M.innerHTML=`<h1>היי ${esc(S.me)} 👋</h1><div class="cubes">${a.slice(0,6).map(p=>`<button class="cube" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div>`+
 a.slice(0,4).map(p=>`<h2>${esc(p.name)}</h2><div class="row">${p.songs.map((s,i)=>`<button class="card" data-p="${p.id}" data-i="${i}"><img loading="lazy" src="${thumb(s.video_id)}" alt=""><small>${esc(s.title)}</small></button>`).join('')||'<span class="muted">ריק</span>'}</div>`).join('');
 M.querySelectorAll('.cube').forEach(b=>b.onclick=()=>{tab='library';open=+b.dataset.p;render()});
 M.querySelectorAll('.card').forEach(b=>b.onclick=()=>play(all().find(p=>p.id==b.dataset.p),+b.dataset.i))}

function libView(){const a=all(),p=a.find(x=>x.id===open);if(!p){open=null;
 M.innerHTML=`<h1>הספרייה</h1>`+(a.map(p=>`<button class="li" data-p="${p.id}"><div class="t"><b>${esc(p.name)}</b><br><small class="muted">${p.songs.length} שירים${p.owner?' · מאת '+esc(p.owner):''}</small></div></button>`).join('')||'<p class="muted">אין פלייליסטים עדיין</p>');
 M.querySelectorAll('.li').forEach(b=>b.onclick=()=>{open=+b.dataset.p;render()});return}
 const mine=!p.owner;
 M.innerHTML=`<button class="muted" id="bk">→ חזרה</button><h1>${esc(p.name)}</h1>${p.owner?`<p class="muted">שותף איתך על ידי ${esc(p.owner)}</p>`:''}
 <button class="btn" id="pl">▶ ניגון</button> <button class="btn alt tog ${loopOf(p.id)?'on':''}" id="lp">🔁 לופ</button>
 ${mine?`<div><select id="fs"><option value="">שיתוף עם חבר...</option>${S.friends.map(f=>`<option>${esc(f)}</option>`).join('')}</select></div>`:''}
 <div id="sl">${p.songs.map((s,i)=>`<div class="li"><button class="li" style="border:0" data-i="${i}"><img src="${thumb(s.video_id)}" alt=""><span class="t">${esc(s.title)}</span></button>${mine?`<button data-d="${s.id}">🗑</button>`:''}</div>`).join('')}</div>
 ${mine?'<button class="muted" id="dp">מחיקת פלייליסט</button>':''}`;
 $('#bk').onclick=()=>{open=null;render()};$('#pl').onclick=()=>play(p,0);
 $('#lp').onclick=()=>{localStorage.setItem('loop'+p.id,loopOf(p.id)?'0':'1');render()};
 M.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>play(p,+b.dataset.i));
 M.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{await api('/songs/'+b.dataset.d,'DELETE');await load();render()});
 if(mine){$('#fs').onchange=async e=>{if(!e.target.value)return;try{await api('/share','POST',{playlistId:p.id,username:e.target.value});alert('שותף!')}catch(x){alert(x.message)}e.target.value=''};
  $('#dp').onclick=async()=>{if(confirm('למחוק את הפלייליסט?')){await api('/playlists/'+p.id,'DELETE');open=null;await load();render()}}}}

function addView(){M.innerHTML=`<h1>הוספת שיר</h1><input id="url" placeholder="קישור מיוטיוב" dir="ltr">
<select id="sel">${S.own.map(p=>`<option>${esc(p.name)}</option>`).join('')}<option value="">+ פלייליסט חדש</option></select>
<input id="nn" placeholder="שם הפלייליסט החדש" maxlength="40" ${S.own.length?'hidden':''}>
<div class="err" id="e"></div><button class="btn" id="go">הוסף</button>`;
 const sync=()=>$('#nn').hidden=$('#sel').value!=='';$('#sel').onchange=sync;sync();
 $('#go').onclick=async()=>{const name=$('#sel').value||$('#nn').value;$('#e').style.color='#ff6b6b';
  try{const r=await api('/songs','POST',{url:$('#url').value,playlist:name});await load();addView();$('#e').style.color='#1db954';$('#e').textContent='נוסף: '+r.title}catch(e){$('#e').textContent=e.message}}}

function friendsView(){M.innerHTML=`<h1>חברים</h1><input id="fu" placeholder="שם משתמש של חבר" dir="ltr" maxlength="20"><button class="btn" id="fa">הוספה</button><div class="err" id="e"></div>
${S.friends.map(f=>`<div class="li"><span class="t">${esc(f)}</span><button data-f="${esc(f)}">✖</button></div>`).join('')||'<p class="muted">אין חברים עדיין</p>'}
<hr><button class="muted" id="lo">התנתקות (${esc(S.me)})</button>`;
 $('#fa').onclick=async()=>{try{await api('/friends','POST',{username:$('#fu').value});await load();friendsView()}catch(e){$('#e').textContent=e.message}};
 M.querySelectorAll('[data-f]').forEach(b=>b.onclick=async()=>{await api('/friends/'+encodeURIComponent(b.dataset.f),'DELETE');await load();friendsView()});
 $('#lo').onclick=async()=>{await api('/logout','POST',{});location.reload()}}

// נגן
let yt,ready=false,Q=[],qi=0,qp=null;
window.onYouTubeIframeAPIReady=()=>{yt=new YT.Player('yt',{width:120,height:68,playerVars:{playsinline:1},events:{onReady:()=>ready=true,onStateChange:e=>{if(e.data===0)next(true)}}})};
function play(p,i){if(!ready)return alert('הנגן עדיין נטען, נסו שוב');if(!p.songs.length)return;Q=p.songs;qp=p;qi=i;cur()}
function cur(){const s=Q[qi];yt.loadVideoById(s.video_id);$('#np').hidden=false;$('#npt').textContent=s.title;$('#npp').textContent=qp.name+(loopOf(qp.id)?' · 🔁':'')}
function next(auto){if(qi+1<Q.length)qi++;else if(loopOf(qp.id))qi=0;else if(auto)return;else qi=0;cur()}
$('#bnext').onclick=()=>next(false);$('#bprev').onclick=()=>{qi=(qi-1+Q.length)%Q.length;cur()};
$('#bpp').onclick=()=>yt.getPlayerState()===1?yt.pauseVideo():yt.playVideo();
boot();
