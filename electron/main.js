const {app,BrowserWindow,dialog}=require('electron'),fs=require('fs'),path=require('path');
let url='';try{url=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8')).url||''}catch{}
if(!app.requestSingleInstanceLock())app.quit();
app.whenReady().then(()=>{
 if(!/^https?:\/\//.test(url)){dialog.showErrorBox('playTheList','כתובת השרת לא הוגדרה בבנייה');return app.quit()}
 const w=new BrowserWindow({width:1100,height:760,autoHideMenuBar:true,title:'playTheList',webPreferences:{backgroundThrottling:false}});
 w.webContents.on('did-fail-load',(e,c,d,u,main)=>{if(main)w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<body style="background:#121212;color:#fff;font-family:sans-serif;text-align:center;padding-top:20vh"><h2>אין חיבור לשרת</h2><button onclick="location.href=\''+url+'\'">נסה שוב</button>'))});
 w.loadURL(url)});
app.on('window-all-closed',()=>app.quit());
