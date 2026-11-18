const {DatabaseSync}=require('node:sqlite');
const path=require('path');
const express=require('express'),bcrypt=require('bcryptjs'),
helmet=require('helmet'),rateLimit=require('express-rate-limit'),crypto=require('crypto');
const db=new DatabaseSync(process.env.DB_PATH||'playthelist.db');db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,pass TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,created INTEGER);
CREATE TABLE IF NOT EXISTS playlists(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL COLLATE NOCASE,UNIQUE(user_id,name));
CREATE TABLE IF NOT EXISTS songs(id INTEGER PRIMARY KEY,playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,video_id TEXT NOT NULL,title TEXT NOT NULL,UNIQUE(playlist_id,video_id));
CREATE TABLE IF NOT EXISTS friends(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(user_id,friend_id));
CREATE TABLE IF NOT EXISTS shares(playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(playlist_id,to_user_id));
`);
const app=express(),PROD=process.env.NODE_ENV==='production';
app.disable('x-powered-by');
if(PROD)app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","https://www.youtube.com"],
frameSrc:["https://www.youtube.com"],imgSrc:["'self'","https://i.ytimg.com","data:"],styleSrc:["'self'","'unsafe-inline'"],
connectSrc:["'self'"],upgradeInsecureRequests:null}},hsts:PROD,referrerPolicy:{policy:'strict-origin-when-cross-origin'}}));
app.use(express.json({limit:'10kb'}));
app.use(express.static(path.join(__dirname,'public')));
// CSRF: מקבלים רק JSON + cookie מסוג SameSite=Strict
app.use('/api',(q,s,n)=>{if(q.method!=='GET'&&!q.is('application/json'))return s.status(415).json({error:'bad request'});n()});
const authLimiter=rateLimit({windowMs:15*60*1000,limit:20,message:{error:'יותר מדי ניסיונות, נסו שוב מאוחר יותר'}});
const err=(s,c,m)=>s.status(c).json({error:m});
const str=(v,max)=>typeof v==='string'&&v.length<=max?v.trim():null;
const setCookie=(s,t,age)=>s.setHeader('Set-Cookie',`sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${PROD?'; Secure':''}`);
function auth(q,s,n){const m=/(?:^|;\s*)sid=([a-f0-9]{64})/.exec(q.headers.cookie||'');
 const r=m&&db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.created>?').get(m[1],Date.now()-30*864e5);
 if(!r)return err(s,401,'לא מחובר');q.user=r;q.token=m[1];n()}
function startSession(s,uid){const t=crypto.randomBytes(32).toString('hex');
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(t,uid,Date.now());setCookie(s,t,30*86400)}
const DUMMY=bcrypt.hashSync('x',12);

app.post('/api/register',authLimiter,(q,s)=>{
 const u=str(q.body.username,20),p=typeof q.body.password==='string'?q.body.password:null;
 if(!u||!/^[A-Za-z0-9_]{3,20}$/.test(u))return err(s,400,'שם משתמש: 3-20 תווים, אותיות באנגלית/מספרים/_');
 if(!p||!/^[\x21-\x7E]{6,72}$/.test(p))return err(s,400,'סיסמה: 6-72 תווים באנגלית בלבד (אותיות, מספרים וסימנים), בלי רווחים ובלי עברית');
 try{const r=db.prepare('INSERT INTO users(username,pass) VALUES(?,?)').run(u,bcrypt.hashSync(p,12));
  startSession(s,r.lastInsertRowid);s.json({username:u})}
 catch(e){if(/UNIQUE|constraint/i.test(e.message))return err(s,409,'שם המשתמש כבר תפוס');throw e}});
app.post('/api/login',authLimiter,(q,s)=>{
 const u=str(q.body.username,20),p=typeof q.body.password==='string'?q.body.password.slice(0,72):'';
 const r=u&&db.prepare('SELECT id,username,pass FROM users WHERE username=?').get(u);
 const ok=bcrypt.compareSync(p,r?r.pass:DUMMY);
 if(!r||!ok)return err(s,401,'שם משתמש או סיסמה שגויים');
 startSession(s,r.id);s.json({username:r.username})});
app.post('/api/logout',auth,(q,s)=>{db.prepare('DELETE FROM sessions WHERE token=?').run(q.token);setCookie(s,'',0);s.json({})});
app.get('/api/me',auth,(q,s)=>s.json({username:q.user.username}));

app.get('/api/playlists',auth,(q,s)=>{
 const songs=db.prepare('SELECT id,video_id,title FROM songs WHERE playlist_id=? ORDER BY id');
 const own=db.prepare('SELECT id,name FROM playlists WHERE user_id=? ORDER BY name').all(q.user.id).map(p=>({...p,songs:songs.all(p.id)}));
 const sh=db.prepare('SELECT p.id,p.name,u.username owner FROM shares x JOIN playlists p ON p.id=x.playlist_id JOIN users u ON u.id=p.user_id WHERE x.to_user_id=? ORDER BY p.name').all(q.user.id).map(p=>({...p,songs:songs.all(p.id)}));
 s.json({own,shared:sh})});
const getOrCreatePl=(uid,name)=>{const r=db.prepare('SELECT id FROM playlists WHERE user_id=? AND name=?').get(uid,name);
 return r?r.id:db.prepare('INSERT INTO playlists(user_id,name) VALUES(?,?)').run(uid,name).lastInsertRowid};
app.post('/api/playlists',auth,(q,s)=>{const n=str(q.body.name,40);if(!n)return err(s,400,'שם פלייליסט לא תקין');
 if(db.prepare('SELECT 1 FROM playlists WHERE user_id=? AND name=?').get(q.user.id,n))return err(s,409,'כבר יש לך פלייליסט בשם הזה');
 s.json({id:getOrCreatePl(q.user.id,n)})});
app.delete('/api/playlists/:id',auth,(q,s)=>{db.prepare('DELETE FROM playlists WHERE id=? AND user_id=?').run(+q.params.id,q.user.id);s.json({})});

function videoId(u){try{const x=new URL(u);const h=x.hostname.replace(/^www\.|^m\.|^music\./,'');let id=null;
 if(h==='youtu.be')id=x.pathname.slice(1);else if(h==='youtube.com'){id=x.searchParams.get('v')||(/^\/(shorts|embed|live)\/([^/?]+)/.exec(x.pathname)||[])[2]}
 return /^[\w-]{11}$/.test(id||'')?id:null}catch{return null}}
app.post('/api/songs',auth,async(q,s)=>{
 const id=videoId(str(q.body.url,300)||''),name=str(q.body.playlist,40);
 if(!id)return err(s,400,'קישור יוטיוב לא תקין');if(!name)return err(s,400,'חסר שם פלייליסט');
 let title;try{const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id),{signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw 0;title=String((await r.json()).title).slice(0,200)}catch{return err(s,400,'הסרטון לא נמצא או לא ניתן להשמעה')}
 const pid=getOrCreatePl(q.user.id,name);
 try{db.prepare('INSERT INTO songs(playlist_id,video_id,title) VALUES(?,?,?)').run(pid,id,title);s.json({title})}
 catch{err(s,409,'השיר כבר קיים בפלייליסט')}});
app.delete('/api/songs/:id',auth,(q,s)=>{db.prepare('DELETE FROM songs WHERE id=? AND playlist_id IN(SELECT id FROM playlists WHERE user_id=?)').run(+q.params.id,q.user.id);s.json({})});

app.get('/api/friends',auth,(q,s)=>s.json(db.prepare('SELECT u.username FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=? ORDER BY u.username').all(q.user.id).map(r=>r.username)));
app.post('/api/friends',auth,(q,s)=>{const u=str(q.body.username,20);const f=u&&db.prepare('SELECT id FROM users WHERE username=?').get(u);
 if(!f)return err(s,404,'משתמש לא נמצא');if(f.id===q.user.id)return err(s,400,'אי אפשר להוסיף את עצמך');
 const ins=db.prepare('INSERT OR IGNORE INTO friends VALUES(?,?)');ins.run(q.user.id,f.id);ins.run(f.id,q.user.id);s.json({})});
app.delete('/api/friends/:u',auth,(q,s)=>{const f=db.prepare('SELECT id FROM users WHERE username=?').get(q.params.u);
 if(f){const d=db.prepare('DELETE FROM friends WHERE user_id=? AND friend_id=?');d.run(q.user.id,f.id);d.run(f.id,q.user.id);
  db.prepare('DELETE FROM shares WHERE to_user_id=? AND playlist_id IN(SELECT id FROM playlists WHERE user_id=?)').run(f.id,q.user.id);
  db.prepare('DELETE FROM shares WHERE to_user_id=? AND playlist_id IN(SELECT id FROM playlists WHERE user_id=?)').run(q.user.id,f.id)}
 s.json({})});
app.post('/api/share',auth,(q,s)=>{const pid=+q.body.playlistId,u=str(q.body.username,20);
 const p=db.prepare('SELECT id FROM playlists WHERE id=? AND user_id=?').get(pid,q.user.id);
 const f=u&&db.prepare('SELECT u.id FROM friends x JOIN users u ON u.id=x.friend_id WHERE x.user_id=? AND u.username=?').get(q.user.id,u);
 if(!p||!f)return err(s,400,'אפשר לשתף רק עם חברים');
 db.prepare('INSERT OR IGNORE INTO shares VALUES(?,?)').run(pid,f.id);s.json({})});

app.use((e,q,s,n)=>{console.error(e);err(s,500,'שגיאת שרת')});
app.listen(process.env.PORT||3000,()=>console.log('playTheList on http://localhost:'+(process.env.PORT||3000)));
