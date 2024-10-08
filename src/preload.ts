const { contextBridge, ipcRenderer } = require('electron');

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
});
