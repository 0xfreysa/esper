import { Identity } from '@semaphore-protocol/identity';
import { sha256 } from '../utils/misc';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { getIdentityOrCreate } from '../utils/identity';
import {
  getPrivateKey,
  getShortenedPublicKey,
  getPublicKey,
  getIdentity,
} from '../utils/identity';

export class IdentityManager {
  async getIdentity(): Promise<Identity> {
    try {
      const identity = await getIdentity();
      if (!identity) return this._createIdentity();
      else return identity;
    } catch (e) {
      return this._createIdentity();
    }
  }

  async _saveIdentity(identity: Identity): Promise<void> {
    const identityStorageId = await sha256('identity');
    try {
      await chrome.storage.sync.set({
        [identityStorageId]: identity.privateKey.toString(), // Only PRIVATE KEY is enough to reconstruct the identity
      });
    } catch (e) {
      console.error('Error saving identity', e);
    }
  }

  async _createIdentity(): Promise<Identity> {
    const identity = new Identity();
    await this._saveIdentity(identity);
    return identity;
  }

  getPublicKey(identity: Identity): string {
    return getPublicKey(identity);
  }

  getShortenedPublicKey(identity: Identity): string {
    return getShortenedPublicKey(identity);
  }

  getPrivateKey(identity: Identity): string {
    return getPrivateKey(identity);
  }
}

export const useIdentity = (): [
  Identity | null,
  Dispatch<SetStateAction<Identity | null>>,
] => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  useEffect(() => {
    (async () => {
      const identityManager = new IdentityManager();
      const identity = await identityManager.getIdentity();
      setIdentity(identity);
    })();
  }, []);
  return [identity, setIdentity];
};
