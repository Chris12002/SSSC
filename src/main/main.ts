import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import crypto from 'crypto';
import path from 'path';
import Store from 'electron-store';
import { SchemaSource, ServerLogonFields } from '../shared/types';
import DatabaseService from './services/databaseService';
import SchemaExtractorService from './services/schemaExtractorService';
import FolderParserService from './services/folderParserService';
import SchemaComparisonService from './services/schemaComparisonService';
import { saveHtmlFile, saveTextFile } from './utils/fileutils';
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
  credentials?: Record<string, CredentialsMetadata>;
  logonFields?: CredentialsMetadata | (ServerLogonFields & { credentialId?: string });
  lastSavedDirectory?: string;
  lastScriptsFolder?: string;
};

type LegacyStoreSchema = StoreSchema & {
  logonFields?: CredentialsMetadata | (ServerLogonFields & { credentialId?: string });
};

const DEFAULT_SOURCE_ID = 'default';

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

function getStoredCredentialMap(): Record<string, CredentialsMetadata> {
  return getStore().get('credentials') || {};
}

function persistCredentialMap(map: Record<string, CredentialsMetadata>) {
  getStore().set('credentials', map);
}

async function migrateLegacyCredentials(
  legacyCredentials?: CredentialsMetadata | (ServerLogonFields & { credentialId?: string }) | null,
) {
  if (!legacyCredentials) {
    getStore().delete('logonFields');
    return;
  }

  if (!legacyCredentials.server || !legacyCredentials.username) {
    getStore().delete('logonFields');
    return;
  }

  const sourceId = DEFAULT_SOURCE_ID;
  const credentialId =
    'credentialId' in legacyCredentials && legacyCredentials.credentialId
      ? legacyCredentials.credentialId
      : buildCredentialId(legacyCredentials.server, legacyCredentials.username, sourceId);

  if (!legacyCredentials.saveCredentials) {
    await deleteSecret(CREDENTIAL_SERVICE, credentialId);
    getStore().delete('logonFields');
    return;
  }

  if ('password' in legacyCredentials && legacyCredentials.password) {
    await setSecret(CREDENTIAL_SERVICE, credentialId, legacyCredentials.password);
  }

  const metadata: CredentialsMetadata = {
    server: legacyCredentials.server,
    username: legacyCredentials.username,
    credentialId,
    saveCredentials: Boolean(legacyCredentials.saveCredentials),
  };

  const credentialMap = getStoredCredentialMap();
  credentialMap[sourceId] = metadata;
  persistCredentialMap(credentialMap);
  getStore().delete('logonFields');
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

function resolveCredentialMetadata(sourceId: string): { key: string; metadata: CredentialsMetadata } | null {
  const credentialMap = getStoredCredentialMap();
  if (credentialMap[sourceId]) {
    return { key: sourceId, metadata: credentialMap[sourceId] };
  }

  if (credentialMap[DEFAULT_SOURCE_ID]) {
    return { key: DEFAULT_SOURCE_ID, metadata: credentialMap[DEFAULT_SOURCE_ID] };
  }
  return null;
}

async function hydrateCredentials(sourceId: string, credentials: ServerLogonFields): Promise<ServerLogonFields> {
  if (credentials.password) {
    return credentials;
  }

  const resolved = resolveCredentialMetadata(sourceId);
  const credentialId = credentials.credentialId || resolved?.metadata.credentialId;
  const password = await getStoredPassword(credentialId);
  if (!password) {
    throw new Error('No stored password found for the provided credentials.');
  }

  return { ...credentials, password, credentialId };
}

ipcMain.handle('get-stored-credentials', async (event, sourceId: string) => {
  await persistenceReady;
  const resolved = resolveCredentialMetadata(sourceId);
  if (!resolved) {
    return null;
  }
  const { password: _password, ...metadata } = resolved.metadata as CredentialsMetadata & Partial<ServerLogonFields>;
  return { ...metadata, sourceId: resolved.key };
});

ipcMain.handle('store-credentials', async (event, sourceId: string, credentials: ServerLogonFields) => {
  await persistenceReady;
  const credentialMap = getStoredCredentialMap();
  const existingEntry = credentialMap[sourceId];
  const resolved = existingEntry ? { key: sourceId, metadata: existingEntry } : resolveCredentialMetadata(sourceId);
  const credentialId = buildCredentialId(credentials.server, credentials.username, sourceId);

  if (!credentials.saveCredentials) {
    if (resolved?.metadata.credentialId) {
      await deleteSecret(CREDENTIAL_SERVICE, resolved.metadata.credentialId);
    } else {
      await deleteSecret(CREDENTIAL_SERVICE, credentialId);
    }
    const keyToDelete = credentialMap[sourceId] ? sourceId : resolved?.key;
    if (keyToDelete && credentialMap[keyToDelete]) {
      delete credentialMap[keyToDelete];
    }
    persistCredentialMap(credentialMap);
    return;
  }

  if (existingEntry && existingEntry.credentialId && existingEntry.credentialId !== credentialId) {
    await deleteSecret(CREDENTIAL_SERVICE, existingEntry.credentialId);
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

  credentialMap[sourceId] = metadata;
  persistCredentialMap(credentialMap);
});

ipcMain.handle('set-credentials', async (event, sourceId: string, credentials: ServerLogonFields) => {
  await persistenceReady;
  const hydrated = await hydrateCredentials(sourceId, credentials);
  await databaseService.setConfig(hydrated);
});

ipcMain.handle('clear-stored-credentials', async (event, sourceId: string) => {
  await persistenceReady;
  const credentialMap = getStoredCredentialMap();
  const resolved = resolveCredentialMetadata(sourceId);
  if (resolved?.metadata.credentialId) {
    await deleteSecret(CREDENTIAL_SERVICE, resolved.metadata.credentialId);
  }
  if (resolved) {
    delete credentialMap[resolved.key];
    persistCredentialMap(credentialMap);
  }
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
  const resolved = resolveCredentialMetadata(DEFAULT_SOURCE_ID);

  if (resolved?.metadata.credentialId && resolved.metadata.saveCredentials) {
    const password = await getStoredPassword(resolved.metadata.credentialId);
    if (password) {
      await databaseService.setConfig({ ...resolved.metadata, password });
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

ipcMain.handle('saveTextFile', async (event, outputPath: string, content: string) => {
  try {
    const result = await saveTextFile(outputPath, content);
    return { status: 'success', message: result };
  } catch (error) {
      return { status: 'error', message: error };
  }
});

ipcMain.handle('show-save-sql-dialog', async (event, defaultFileName: string) => {
  await persistenceReady;
  const storage = getStore();
  const defaultPath =
    (storage.get('lastSavedDirectory', app.getPath('documents')) as string) || app.getPath('documents');

  const options = {
    title: 'Save SQL Script',
    defaultPath: path.join(defaultPath, defaultFileName),
    filters: [{ name: 'SQL Files', extensions: ['sql'] }],
  };

  const { canceled, filePath } = await dialog.showSaveDialog(options);

  if (canceled) {
    return { canceled: true };
  } else {
    storage.set('lastSavedDirectory', path.dirname(filePath!));
    return { canceled: false, filePath };
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

ipcMain.handle('parse-folder', async (event, folderPath: string) => {
  const parser = new FolderParserService();
  return await parser.parseFolder(folderPath);
});

ipcMain.handle('compare-schemas', async (event, source: SchemaSource, target: SchemaSource) => {
  const comparisonService = new SchemaComparisonService();
  return await comparisonService.compare(source, target);
});

ipcMain.handle('execute-scripts', async (event, target: SchemaSource, scripts: string[]) => {
  if (target.type !== 'database' || !target.credentials || !target.database) {
    throw new Error('Invalid database target configuration');
  }

  const extractor = new SchemaExtractorService();
  try {
    await extractor.connect(target.credentials, target.database);
    const result = await extractor.executeScripts(scripts);
    return result;
  } finally {
    await extractor.disconnect();
  }
});


