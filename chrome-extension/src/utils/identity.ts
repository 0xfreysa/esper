import { Identity } from '@semaphore-protocol/identity';
import { sha256 } from './misc';

export async function getIdentity(): Promise<Identity | null> {
  const identityStorageId = await sha256('identity');
  try {
    const storage = await chrome.storage.sync.get(identityStorageId);
    const identity = storage[identityStorageId];
    if (!identity) {
      return null;
    }
    return new Identity(identity);
  } catch (e) {
    return null;
  }
}

export async function getIdentityOrCreate(): Promise<Identity> {
  const identityStorageId = await sha256('identity');
  try {
    const storage = await chrome.storage.sync.get(identityStorageId);
    const identity = storage[identityStorageId];
    if (!identity) {
      return createIdentity();
    }
    return new Identity(identity);
  } catch (e) {
    return createIdentity();
  }
}

export async function saveIdentity(identity: Identity): Promise<void> {
  const identityStorageId = await sha256('identity');
  try {
    await chrome.storage.sync.set({
      [identityStorageId]: identity.privateKey.toString(), // Only PRIVATE KEY is enough to reconstruct the identity
    });
  } catch (e) {
    console.error('Error saving identity', e);
  }
}

export async function createIdentity(): Promise<Identity> {
  const identity = new Identity();
  await saveIdentity(identity);
  return identity;
}

export function getPublicKey(identity: Identity): string {
  const publicKey = identity.publicKey;
  const x = publicKey[0].toString(16);
  const y = publicKey[1].toString(16);
  return `${x},${y}`;
}

export function getShortenedPublicKey(identity: Identity): string {
  return getPublicKey(identity).slice(0, 63) + '...';
}

export function getPrivateKey(identity: Identity): string {
  const privateKey = identity.privateKey.toString();
  const uint8Array = privateKey.split(',').map((part) => parseInt(part, 10));
  const buffer = Buffer.from(uint8Array);
  return buffer.toString('hex');
}
