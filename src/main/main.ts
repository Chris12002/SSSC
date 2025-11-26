import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { saveHtmlFile} from './utils/fileutils';
import { fileURLToPath } from 'url';
import Store from 'electron-store'
import {ServerLogonFields, SchemaSource} from '../shared/types';
import DatabaseService from './services/databaseService';
import SchemaExtractorService from './services/schemaExtractorService';
;

let mainWindow: BrowserWindow;

// Enable remote debugging
app.commandLine.appendSwitch('remote-debugging-port', '9222');

const store = new Store({
  encryptionKey: 'mf23r03j8f43£tj3t439th430jt3', // TODO: Add method for generating key in situ
});

const databaseService = DatabaseService.getInstance();


ipcMain.handle('get-stored-credentials', async () => {
  const credentials: ServerLogonFields = store.get('logonFields', null);
  if (!credentials) {
    return null;
  }
  return {...credentials,
         password: ''};
});

ipcMain.handle('store-credentials', async (event, credentials: ServerLogonFields) => {
  store.set('logonFields', credentials);
});

ipcMain.handle('set-credentials', async (event, credentials: ServerLogonFields) => {
  await databaseService.setConfig(credentials);
});

ipcMain.handle('clear-stored-credentials', async () => {
  store.delete('logonFields');
});

ipcMain.handle('get-databases', async () => {

  return await databaseService.getDatabases();

});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icon.png'),
  });

  const startUrl = `file://${path.join(__dirname, '..', 'renderer', 'index.html')}`;
  mainWindow.loadURL(startUrl);
}

app.whenReady().then(async () => {
    const config = store.get('logonFields');

    if (config) {      
      await databaseService.setConfig(config);
    }

    store.openInEditor
    createWindow();
  });

// IPC Handlers
ipcMain.handle('getProcedures', async () => {
  return await databaseService.getProcedures();
});

ipcMain.handle('getSnapshots', async (event, procName: string) => {
  return await databaseService.getSnapshots(procName);
});

ipcMain.handle('getSnapshotData', async (event, snapshotId: number) => {

  const snapshot = await databaseService.getSnapshotContent(snapshotId);

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
ipcMain.handle('update-db', async (event, dbName) => {
  const credentialsManager = DatabaseService.getInstance();

  await credentialsManager.changeDatabase(dbName);

  return { status: 'success', message: dbName };
  
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

ipcMain.handle('show-folder-dialog', async (event, title?: string) => {
  const defaultPath = store.get('lastScriptsFolder', app.getPath('documents'));

  const options = {
    title: title || 'Select Scripts Folder',
    defaultPath: defaultPath,
    properties: ['openDirectory'] as const,
  };

  const { canceled, filePaths } = await dialog.showOpenDialog(options);

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  } else {
    const folderPath = filePaths[0];
    store.set('lastScriptsFolder', folderPath);
    return { canceled: false, folderPath };
  }
});

ipcMain.handle('extract-schema', async (event, source: SchemaSource) => {
  if (source.type !== 'database' || !source.credentials || !source.database) {
    throw new Error('Invalid database source configuration');
  }

  const extractor = new SchemaExtractorService();
  try {
    await extractor.connect(source.credentials, source.database);
    const objects = await extractor.extractAllObjects();
    return objects;
  } finally {
    await extractor.disconnect();
  }
});


