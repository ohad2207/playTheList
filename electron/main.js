const {app,BrowserWindow,dialog}=require('electron'),path=require('path');
if(!app.requestSingleInstanceLock())app.quit();
process.env.DB_PATH=path.join(app.getPath('userData'),'playthelist.db');
process.env.PORT='3000';
app.whenReady().then(()=>{
 try{require('../server.js')}catch(e){dialog.showErrorBox('playTheList',String(e));return app.quit()}
 const w=new BrowserWindow({width:1100,height:760,autoHideMenuBar:true,title:'playTheList',webPreferences:{backgroundThrottling:false}});
 const u='http://localhost:3000';let n=0;
 w.webContents.on('did-fail-load',()=>{if(n++<10)setTimeout(()=>w.loadURL(u),400)});
 w.loadURL(u)});
app.on('window-all-closed',()=>app.quit());
