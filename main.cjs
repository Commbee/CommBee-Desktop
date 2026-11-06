const {app,BrowserWindow,Menu,session,dialog,shell,desktopCapturer,ipcMain,systemPreferences}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {SITE,trusted,external}=require('./policy.cjs');
const {installDesktopServices}=require('./desktop-services.cjs');
let main;
const grants=new Set();
const allowed=new Set(['media','display-capture','notifications','clipboard-sanitized-write','fullscreen']);
const pickerUrl=pathToFileURL(path.join(__dirname,'picker.html')).href;
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(main){if(main.isMinimized())main.restore();main.show();main.focus();}});
  app.whenReady().then(()=>{installDesktopServices({app,ipcMain,dialog,shell,getWindow:()=>main});createWindow();});
}
async function capturePicker(request,callback){
  if(!trusted(request.securityOrigin)||!request.frame||request.frame!==request.frame.top){callback(null);return;}
  let picker,finished=false;
  const finish=value=>{if(finished)return;finished=true;ipcMain.removeListener('commbee-capture-choice',choose);if(picker&&!picker.isDestroyed())picker.close();try{callback(value);}catch{}};
  let sources=[];
  const choose=(event,id)=>{
    if(!picker||event.sender!==picker.webContents||event.senderFrame?.url!==pickerUrl)return;
    const source=sources.find(s=>s.id===id);
    finish(source?{video:source,...(request.audioRequested&&process.platform==='win32'?{audio:'loopback'}:{})}:null);
  };
  try{
    sources=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:320,height:180},fetchWindowIcons:false});
    if(!sources.length||!main||main.isDestroyed()){finish(null);return;}
    picker=new BrowserWindow({parent:main,modal:true,width:780,height:620,minWidth:400,minHeight:400,title:'Choose what to share · CommBee',autoHideMenuBar:true,icon:path.join(__dirname,'assets/icon.png'),webPreferences:{preload:path.join(__dirname,'picker.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false}});
    picker.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    picker.webContents.on('will-navigate',event=>event.preventDefault());
    ipcMain.on('commbee-capture-choice',choose);
    picker.once('closed',()=>finish(null));
    picker.webContents.once('did-finish-load',()=>picker.webContents.send('commbee-capture-sources',sources.map(s=>({id:s.id,name:s.name,image:s.thumbnail.toDataURL()}))));
    await picker.loadFile('picker.html');
  }catch{finish(null);}
}
function createWindow(){
  const ses=session.fromPartition('persist:commbee');
  ses.setPermissionCheckHandler((wc,permission,origin)=>trusted(origin)&&trusted(wc?.getURL())&&allowed.has(permission)&&(permission==='display-capture'||grants.has(permission)));
  ses.setPermissionRequestHandler(async(wc,permission,callback,details)=>{
    if(!trusted(wc?.getURL())||!trusted(details.requestingUrl||details.securityOrigin||wc.getURL())||!allowed.has(permission)){callback(false);return;}
    if(permission==='display-capture'){callback(true);return;}
    if(grants.has(permission)){callback(true);return;}
    const kinds=permission==='media'?(details.mediaTypes||['camera','microphone']).join(' and '):permission;
    try{
      const {response}=await dialog.showMessageBox(main,{type:'question',title:'CommBee permissions',message:'Allow CommBee to use '+kinds+'?',detail:'Only allow access when you are starting this feature.',buttons:['Allow','Not now'],defaultId:1,cancelId:1});
      let approved=response===0;
      if(approved&&permission==='media'&&process.platform==='darwin')for(const type of details.mediaTypes||[])if(['video','audio'].includes(type))approved=(await systemPreferences.askForMediaAccess(type==='video'?'camera':'microphone'))&&approved;
      if(approved)grants.add(permission);callback(approved);
    }catch{callback(false);}
  });
  ses.setDisplayMediaRequestHandler(capturePicker,{useSystemPicker:process.platform==='darwin'});
  main=new BrowserWindow({width:1380,height:900,minWidth:390,minHeight:560,title:'CommBee',backgroundColor:'#f8f8f1',icon:path.join(__dirname,'assets/icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),partition:'persist:commbee',contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false}});
  main.webContents.setUserAgent(main.webContents.getUserAgent()+' CommBeeDesktop/'+app.getVersion());
  const openExternal=url=>{if(external(url))shell.openExternal(url).catch(()=>{});};
  main.webContents.setWindowOpenHandler(({url})=>{if(trusted(url))main.loadURL(url);else openExternal(url);return{action:'deny'};});
  main.webContents.on('will-navigate',(event,url)=>{if(!trusted(url)){event.preventDefault();openExternal(url);}});
  main.webContents.on('will-redirect',(event,url)=>{if(!trusted(url))event.preventDefault();});
  main.webContents.on('will-attach-webview',event=>event.preventDefault());
  main.webContents.on('did-fail-load',(_event,code,_description,url,isMainFrame)=>{if(isMainFrame&&code!==-3&&trusted(url))main.loadFile('offline.html').catch(()=>{});});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform==='darwin'?[{role:'appMenu'}]:[]),
    {label:'CommBee',submenu:[{label:'Home',click:()=>main.loadURL(SITE)},{label:'Retry connection',click:()=>main.loadURL(SITE)},{type:'separator'},{role:'quit'}]},
    {role:'editMenu'},
    {label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
    {label:'Help',submenu:[{label:'Open CommBee in browser',click:()=>shell.openExternal(SITE)},{label:'About CommBee',click:()=>dialog.showMessageBox(main,{message:'CommBee Desktop '+app.getVersion(),detail:'CommBee is owned by Psyku G.\nAn internet connection is required.'})}]},
  ]));
  main.loadURL(SITE).catch(()=>{});
  main.on('closed',()=>{main=null;grants.clear();});
}
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
