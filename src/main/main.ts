import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import crypto from 'crypto';
import path from 'path';
import Store from 'electron-store';
import { SchemaSource, ServerLogonFields } from '../shared/types';
import DatabaseService from './services/databaseService';
import SchemaExtractorService from './services/schemaExtractorService';
import { saveHtmlFile } from './utils/fileutils';
import {
  buildCredentialId,
  deleteSecret,
  ensureSecret,
  getSecret,
  setSecret,
} from './services/keychainService';

interface CredentialsMetadata {
  server: string;
  username: string;
  credentialId: string;
  saveCredentials: boolean;
}

type StoreSchema = {
  logonFields?: CredentialsMetadata | (ServerLogonFields & { credentialId?: string });
  lastSavedDirectory?: string;
  lastScriptsFolder?: string;
};

type LegacyStoreSchema = StoreSchema & {
  logonFields?: ServerLogonFields;
};

const LEGACY_ENCRYPTION_KEY = 'mf23r03j8f43£tj3t439th430jt3';
const CREDENTIAL_SERVICE = `${app.getName()}-credentials`;
const CONFIG_SERVICE = `${app.getName()}-config`;
const CONFIG_KEY_ACCOUNT = 'store-encryption-key';

let mainWindow: BrowserWindow;
let store: Store<StoreSchema> | null = null;

// Enable remote debugging
app.commandLine.appendSwitch('remote-debugging-port', '9222');

const persistenceReady = initializePersistence();
const databaseService = DatabaseService.getInstance();

async function ensureEncryptionKey(): Promise<{ key: string; created: boolean }> {
  const { secret, created } = await ensureSecret(CONFIG_SERVICE, CONFIG_KEY_ACCOUNT, () =>
    crypto.randomBytes(32).toString('hex'),
  );
  return { key: secret, created };
}

function getStore(): Store<StoreSchema> {
  if (!store) {
    throw new Error('Configuration store has not been initialised.');
  }
  return store;
}

async function migrateLegacyCredentials(legacyCredentials?: ServerLogonFields | null) {
  if (!legacyCredentials) {
    return;
  }

  if (!legacyCredentials.server || !legacyCredentials.username) {
    getStore().delete('logonFields');
    return;
  }

  const credentialId =
    legacyCredentials.credentialId || buildCredentialId(legacyCredentials.server, legacyCredentials.username);

  if (!legacyCredentials.saveCredentials) {
    await deleteSecret(CREDENTIAL_SERVICE, credentialId);
    getStore().delete('logonFields');
    return;
  }

  if (legacyCredentials.password) {
    await setSecret(CREDENTIAL_SERVICE, credentialId, legacyCredentials.password);
  }

  const metadata: CredentialsMetadata = {
    server: legacyCredentials.server,
    username: legacyCredentials.username,
    credentialId,
    saveCredentials: Boolean(legacyCredentials.saveCredentials),
  };

  getStore().set('logonFields', metadata);
}

async function initializePersistence() {
  await app.whenReady();
  const { key: encryptionKey, created } = await ensureEncryptionKey();

  if (created) {
    const legacyStore = new Store<LegacyStoreSchema>({
      encryptionKey: LEGACY_ENCRYPTION_KEY,
      clearInvalidConfig: true,
    });
    const legacyData = legacyStore.store;
    store = new Store<StoreSchema>({
      encryptionKey,
      clearInvalidConfig: true,
    });

    const { logonFields: legacyLogonFields, ...persistedValues } = legacyData;
    if (Object.keys(persistedValues).length > 0) {
      store.store = persistedValues;
    }
    await migrateLegacyCredentials(legacyLogonFields);
  } else {
    store = new Store<StoreSchema>({
      encryptionKey,
      clearInvalidConfig: true,
    });
    await migrateLegacyCredentials(store.get('logonFields') as ServerLogonFields | undefined);
  }
}

async function getStoredPassword(credentialId?: string): Promise<string | null> {
  if (!credentialId) {
    return null;
  }
  return await getSecret(CREDENTIAL_SERVICE, credentialId);
}

async function hydrateCredentials(credentials: ServerLogonFields): Promise<ServerLogonFields> {
  if (credentials.password) {
    return credentials;
  }

  const password = await getStoredPassword(credentials.credentialId);
  if (!password) {
    throw new Error('No stored password found for the provided credentials.');
  }

  return { ...credentials, password };
}

ipcMain.handle('get-stored-credentials', async () => {
  await persistenceReady;
  const stored = getStore().get('logonFields');
  if (!stored || !('credentialId' in stored) || !stored.credentialId) {
    return null;
  }
  const { password: _password, ...metadata } = stored as CredentialsMetadata & Partial<ServerLogonFields>;
  return metadata;
});

ipcMain.handle('store-credentials', async (event, credentials: ServerLogonFields) => {
  await persistenceReady;
  const storage = getStore();
  const credentialId = buildCredentialId(credentials.server, credentials.username);

  if (!credentials.saveCredentials) {
    const existing = storage.get('logonFields');
    if (existing && 'credentialId' in existing && existing.credentialId) {
      await deleteSecret(CREDENTIAL_SERVICE, existing.credentialId);
    } else {
      await deleteSecret(CREDENTIAL_SERVICE, credentialId);
    }
    storage.delete('logonFields');
    return;
  }
  const existing = storage.get('logonFields');
  if (existing && 'credentialId' in existing && existing.credentialId && existing.credentialId !== credentialId) {
    await deleteSecret(CREDENTIAL_SERVICE, existing.credentialId);
  }
  if (credentials.password) {
    await setSecret(CREDENTIAL_SERVICE, credentialId, credentials.password);
  }

  const metadata: CredentialsMetadata = {
    server: credentials.server,
    username: credentials.username,
    credentialId,
    saveCredentials: credentials.saveCredentials,
  };

  storage.set('logonFields', metadata);
});

ipcMain.handle('set-credentials', async (event, credentials: ServerLogonFields) => {
  await persistenceReady;
  const hydrated = await hydrateCredentials(credentials);
  await databaseService.setConfig(hydrated);
});

ipcMain.handle('clear-stored-credentials', async () => {
  await persistenceReady;
  const stored = getStore().get('logonFields');
  if (stored && 'credentialId' in stored && stored.credentialId) {
    await deleteSecret(CREDENTIAL_SERVICE, stored.credentialId);
  }
  getStore().delete('logonFields');
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
  await persistenceReady;
  const stored = getStore().get('logonFields') as CredentialsMetadata | undefined;

  if (stored?.credentialId && stored.saveCredentials) {
    const password = await getStoredPassword(stored.credentialId);
    if (password) {
      await databaseService.setConfig({ ...stored, password });
    }
  }

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
  await persistenceReady;
  const storage = getStore();
  // Retrieve the last saved directory from the store
  const defaultPath =
    (storage.get('lastSavedDirectory', app.getPath('documents')) as string) || app.getPath('documents');

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
    storage.set('lastSavedDirectory', path.dirname(filePath));
    return { canceled: false, filePath };
  }
});

ipcMain.handle('show-folder-dialog', async (event, title?: string) => {
  await persistenceReady;
  const storage = getStore();
  const defaultPath =
    (storage.get('lastScriptsFolder', app.getPath('documents')) as string) || app.getPath('documents');

  const options = {
    title: title || 'Select Scripts Folder',
    defaultPath: defaultPath,
    properties: ['openDirectory'] as Array<'openDirectory'>,
  };

  const { canceled, filePaths } = await dialog.showOpenDialog(options);

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  } else {
    const folderPath = filePaths[0];
    storage.set('lastScriptsFolder', folderPath);
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


