import { app, safeStorage } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface KeychainData {
  [service: string]: {
    [account: string]: string;
  };
}

let cache: KeychainData | null = null;

function getKeychainFilePath(): string {
  return path.join(app.getPath('userData'), 'keychain.json');
}

function loadKeychain(): KeychainData {
  if (cache) {
    return cache;
  }

  const filePath = getKeychainFilePath();
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    cache = JSON.parse(raw) as KeychainData;
  } catch (error) {
    cache = {};
  }
  return cache!;
}

function persistKeychain(data: KeychainData) {
  const filePath = getKeychainFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  cache = data;
}

function encryptSecret(secret: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(secret).toString('base64');
  }
  return Buffer.from(secret, 'utf-8').toString('base64');
}

function decryptSecret(encrypted: string): string {
  const buffer = Buffer.from(encrypted, 'base64');
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(buffer);
    } catch (error) {
      // Fall through to plaintext decode if decryption fails.
    }
  }
  return buffer.toString('utf-8');
}

export function buildCredentialId(server: string, username: string): string {
  return crypto.createHash('sha256').update(`${server}:${username}`).digest('hex');
}

export async function setSecret(service: string, account: string, secret: string): Promise<void> {
  const data = loadKeychain();
  const encrypted = encryptSecret(secret);
  data[service] = data[service] || {};
  data[service][account] = encrypted;
  persistKeychain(data);
}

export async function getSecret(service: string, account: string): Promise<string | null> {
  const data = loadKeychain();
  const encrypted = data[service]?.[account];
  if (!encrypted) {
    return null;
  }
  return decryptSecret(encrypted);
}

export async function deleteSecret(service: string, account: string): Promise<void> {
  const data = loadKeychain();
  if (data[service]?.[account]) {
    delete data[service][account];
    if (Object.keys(data[service]).length === 0) {
      delete data[service];
    }
    persistKeychain(data);
  }
}

export async function ensureSecret(
  service: string,
  account: string,
  generator: () => string,
): Promise<{ secret: string; created: boolean }> {
  const existing = await getSecret(service, account);
  if (existing) {
    return { secret: existing, created: false };
  }
  const secret = generator();
  await setSecret(service, account, secret);
  return { secret, created: true };
}
