const { contextBridge, ipcRenderer } = require('electron');
import type {ServerLogonFields} from '../shared/types';


contextBridge.exposeInMainWorld('api', {
  getProcedures: () => ipcRenderer.invoke('getProcedures'),
  getSnapshots: (procName: string) => ipcRenderer.invoke('getSnapshots', procName),
  getDiff: (snapshotId1: number, snapshotId2: number) =>
    ipcRenderer.invoke('getDiff', snapshotId1, snapshotId2),
  getSnapshotData: (snapshotId: number) => ipcRenderer.invoke('getSnapshotData',snapshotId),
  saveHtmlFile: (outputPath: string, diffHtml: string) => ipcRenderer.invoke('saveHtmlFile', outputPath, diffHtml),
  saveDialog: async (defaultFileName: string) => {
    const result = await ipcRenderer.invoke('show-save-dialog', defaultFileName);
    return result;
  },
  getStoredCredentials: () => ipcRenderer.invoke('get-stored-credentials'),
  storeCredentials: (credentials: ServerLogonFields) => ipcRenderer.invoke('store-credentials', credentials),
  setCredentials: (credentials: ServerLogonFields) => ipcRenderer.invoke('set-credentials', credentials),    
  clearStoredCredentials: () => ipcRenderer.invoke('clear-stored-credentials'),
  getDatabases: () => ipcRenderer.invoke('get-databases'),
  updateDatabase: (dbName: string) => ipcRenderer.invoke('update-db', dbName),
});
