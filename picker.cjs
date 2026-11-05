const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('capturePicker',{
  choose:id=>ipcRenderer.send('commbee-capture-choice',typeof id==='string'?id:null),
  onSources:callback=>ipcRenderer.once('commbee-capture-sources',(_event,sources)=>callback(sources)),
});
