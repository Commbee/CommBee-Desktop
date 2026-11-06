const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const {EventEmitter}=require('node:events');const {pathToFileURL}=require('node:url');
test('screen chooser denies untrusted frames and accepts only its own selected source',async()=>{
  const ipc=new EventEmitter();let queried=0,picker;
  class Window extends EventEmitter{
    constructor(){super();picker=this;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=()=>{};}
    isDestroyed(){return false;}close(){this.emit('closed');}async loadFile(){this.webContents.emit('did-finish-load');}
  }
  const electron={app:{requestSingleInstanceLock:()=>false,quit(){},on(){}},BrowserWindow:Window,ipcMain:ipc,desktopCapturer:{getSources:async()=>{queried++;return[{id:'screen:1',name:'Test screen',thumbnail:{toDataURL:()=>''}}];}}};
  const context={require:id=>id==='electron'?electron:id.startsWith('./')?require(path.resolve(__dirname,'..',id)):require(id),__dirname:path.resolve(__dirname,'..'),process,module:{exports:{}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../main.cjs'),'utf8')+'\nmodule.exports={capturePicker,setMain:value=>{main=value}};',context);
  const {capturePicker,setMain}=context.module.exports;setMain({isDestroyed:()=>false});
  let results=[];await capturePicker({securityOrigin:'https://evil.example',frame:{}},v=>results.push(v));assert.equal(results[0],null);assert.equal(queried,0);
  const frame={};frame.top=frame;
  await capturePicker({securityOrigin:'https://commbee-beta.onrender.com',frame,audioRequested:false},v=>results.push(v));
  assert.equal(results.length,1,'a trusted request must still await a user choice');
  ipc.emit('commbee-capture-choice',{sender:{},senderFrame:{url:'https://commbee-beta.onrender.com'}},'screen:1');assert.equal(results.length,1);
  ipc.emit('commbee-capture-choice',{sender:picker.webContents,senderFrame:{url:pathToFileURL(path.join(context.__dirname,'picker.html')).href}},'screen:1');
  assert.equal(results.length,2);assert.equal(results[1].video.id,'screen:1');assert.equal(ipc.listenerCount('commbee-capture-choice'),0);
});
