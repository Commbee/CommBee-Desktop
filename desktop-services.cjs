const {SITE}=require('./policy.cjs');
const RELEASES='https://github.com/Commbee/CommBee-Desktop/releases';
function versionParts(value){if(typeof value!=='string'||!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value))return null;return value.split('.').map(Number);}
function newer(latest,current){const a=versionParts(latest),b=versionParts(current);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
function updateInfo(data,current,platform,arch){if(!versionParts(data?.version))throw Error('Invalid desktop release version.');const version=data.version,base=RELEASES+'/download/v'+version+'/';const file=platform==='win32'&&arch==='x64'?`CommBee-${version}-win-x64.exe`:platform==='darwin'&&['x64','arm64'].includes(arch)?`CommBee-${version}-mac-${arch}.dmg`:platform==='linux'&&arch==='x64'?`CommBee-${version}-linux-x86_64.AppImage`:null;return{currentVersion:current,latestVersion:version,available:newer(version,current),releaseUrl:RELEASES+'/tag/v'+version,downloadUrl:file?base+file:RELEASES+'/tag/v'+version};}
function trustedSender(event,window){return !!window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&require('./policy.cjs').trusted(event.senderFrame?.url);}
function installDesktopServices({app,ipcMain,dialog,shell,getWindow,fetchRelease=fetch,platform=process.platform,arch=process.arch,fs=require('node:fs'),path=require('node:path')}){
 let cached=null,checkedAt=0,pending=null;
 const info=()=>({version:app.getVersion(),platform,arch,packaged:app.isPackaged,canUninstall:app.isPackaged});
 async function check(){if(cached&&Date.now()-checkedAt<60000)return cached;if(pending)return pending;pending=(async()=>{const response=await fetchRelease(SITE+'/desktop-release.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Could not check for desktop updates. Try again later.');const text=await response.text();if(text.length>20000)throw Error('Invalid desktop release response.');cached=updateInfo(JSON.parse(text),app.getVersion(),platform,arch);checkedAt=Date.now();return cached;})();try{return await pending;}finally{pending=null;}}
 function handle(name,fn){ipcMain.handle(name,async(event,...args)=>{if(!trustedSender(event,getWindow())||args.length)throw Error('Desktop action not allowed.');return fn();});}
 handle('commbee-desktop-info',info);handle('commbee-desktop-check',check);
 handle('commbee-desktop-update',async()=>{const release=await check();await shell.openExternal(release.downloadUrl);return{opened:true};});
 handle('commbee-desktop-uninstall',async()=>{
  if(!app.isPackaged)throw Error('Uninstall is available in the installed desktop app.');
  const window=getWindow(),detail=platform==='win32'?'The Windows uninstaller will open. Your CommBee account and rooms will remain.':platform==='darwin'?'Finder will show CommBee. Move the app to Trash to uninstall. Your account and rooms will remain.':'AppImage: delete the app file. Debian/Ubuntu package: remove CommBee using your Software manager. Your account and rooms will remain.';
  const choice=await dialog.showMessageBox(window,{type:'question',title:'Uninstall CommBee',message:'Uninstall CommBee Desktop?',detail,buttons:[platform==='win32'?'Open uninstaller':'Show app location','Cancel'],defaultId:1,cancelId:1});if(choice.response!==0)return{cancelled:true};
  const exe=app.getPath('exe');
  if(platform==='win32'){const file=path.join(path.dirname(exe),'Uninstall CommBee.exe');if(!fs.existsSync(file))throw Error('Uninstaller not found. Remove CommBee from Windows Settings → Apps → Installed apps.');const error=await shell.openPath(file);if(error)throw Error('Could not open the uninstaller. Use Windows Settings → Apps.');app.quit();return{opened:true};}
  const location=platform==='darwin'?path.resolve(path.dirname(exe),'../..'):process.env.APPIMAGE||exe;shell.showItemInFolder(location);return{opened:true,instructions:detail};
 });return{check,info};
}
module.exports={versionParts,newer,updateInfo,trustedSender,installDesktopServices};
