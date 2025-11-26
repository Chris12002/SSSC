// @ts-nocheck
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { getProcedures, getSnapshots, getSnapshotContent } from './db.js';
import { parseStringPromise } from 'xml2js';
import { saveHtmlFile} from './utils/fileutils.js';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

let mainWindow: BrowserWindow;

const store = new Store();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = `file://${path.join(__dirname, 'index.html')}`;
  mainWindow.loadURL(startUrl);
}

app.whenReady().then(() => {
    // Set default configuration values if they don't exist
    store.set('dbConfig', {
      user: '',
      password: '',
      server: '',
      database: '',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    });
    store.openInEditor
    createWindow();
  });

// IPC Handlers
ipcMain.handle('getProcedures', async () => {
  return await getProcedures();
});

ipcMain.handle('getSnapshots', async (event, procName: string) => {
  return await getSnapshots(procName);
});

ipcMain.handle('getSnapshotData', async (event, snapshotId: number) => {

  const snapshot = await getSnapshotContent(snapshotId);

  // Check if snapshot exists, return empty string if undefined
  return snapshot?.ObjectReference || '';  

});

ipcMain.handle('saveHtmlFile', async (event, outputPath: string, diffHtml: string, fileName: string) => {
 
  try {
    const result = await saveHtmlFile(outputPath, diffHtml);
    return { status: 'success', message: result };
  } catch (error) {
      return { status: 'error', message: error };
  }

});

// Listen for 'update-db' messages from the renderer process to update the database target.
ipcMain.on('update-db', (event, dbName) => {

   const currentConfig = store.get('dbConfig', {});

   const updatedConfig = {
       ...currentConfig,
       database: dbName,  // Update the database name
   };

   store.set('dbConfig', updatedConfig);

  event.reply('db-updated', dbName);
});

ipcMain.handle('show-save-dialog', async (event, defaultFileName) => {
  // Retrieve the last saved directory from the store
  const defaultPath = store.get('lastSavedDirectory', app.getPath('documents'));

  const options = {
    title: 'Save Diff HTML',
    defaultPath: path.join(defaultPath, defaultFileName),
    filters: [{ name: 'HTML Files', extensions: ['html'] }],
  };

  const { canceled, filePath } = await dialog.showSaveDialog(options);

  if (canceled) {
    return { canceled: true };
  } else {
    // Store the directory for future use
    store.set('lastSavedDirectory', path.dirname(filePath));
    return { canceled: false, filePath };
  }
});


