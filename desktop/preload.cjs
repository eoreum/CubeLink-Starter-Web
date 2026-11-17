const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cubelinkDesktop',Object.freeze({version:'1.8.0',request:(route,body)=>ipcRenderer.invoke('arduino:request',route,body)}));
