// Import our custom Signal Protocol adapter instead of the problematic libsignal library
import { KeyHelper, util, type KeyPairType, type PreKeyType, type SignedPreKeyType, type SessionType, type SignalProtocolStore as SignalProtocolStoreInterface } from './signal-adapter';

// Store implementation for Signal Protocol
export class SignalProtocolStore implements SignalProtocolStoreInterface {
  identityKeyPair: KeyPairType | null = null;
  registrationId: number | null = null;
  
  private preKeys: Map<number | string, KeyPairType> = new Map();
  private signedPreKeys: Map<number | string, KeyPairType> = new Map();
  private identityKeys: Map<string, ArrayBuffer> = new Map();
  private sessions: Map<string, SessionType> = new Map();
  
  constructor() {
    // Generate registration ID
    this.registrationId = KeyHelper.generateRegistrationId();
  }
  
  // Identity key methods
  async getIdentityKeyPair(): Promise<KeyPairType> {
    if (!this.identityKeyPair) {
      throw new Error('Identity key pair not available');
    }
    return this.identityKeyPair;
  }
  
  async putIdentityKeyPair(keyPair: KeyPairType): Promise<void> {
    this.identityKeyPair = keyPair;
  }
  
  async setIdentityKeyPair(keyPair: KeyPairType): Promise<void> {
    this.identityKeyPair = keyPair;
  }
  
  async getLocalRegistrationId(): Promise<number> {
    if (!this.registrationId) {
      throw new Error('Registration ID not available');
    }
    return this.registrationId;
  }
  
  // Pre-key methods
  async loadPreKey(keyId: string | number): Promise<KeyPairType> {
    const preKey = this.preKeys.get(keyId);
    if (!preKey) {
      throw new Error(`Pre key ${keyId} not found`);
    }
    return preKey;
  }
  
  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.preKeys.set(keyId, keyPair);
  }
  
  async removePreKey(keyId: string | number): Promise<void> {
    this.preKeys.delete(keyId);
  }
  
  // Signed pre-key methods
  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType> {
    const signedPreKey = this.signedPreKeys.get(keyId);
    if (!signedPreKey) {
      throw new Error(`Signed pre-key ${keyId} not found`);
    }
    return signedPreKey;
  }
  
  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.signedPreKeys.set(keyId, keyPair);
  }
  
  async removeSignedPreKey(keyId: string | number): Promise<void> {
    this.signedPreKeys.delete(keyId);
  }
  
  // Identity key methods
  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const existing = this.identityKeys.get(identifier);
    const changed = existing && !util.isEqual(existing, identityKey);
    this.identityKeys.set(identifier, identityKey);
    return changed || false;
  }
  
  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const trusted = this.identityKeys.get(identifier);
    if (!trusted) {
      // Trust on first use
      return true;
    }
    return util.isEqual(trusted, identityKey);
  }
  
  async getIdentityKey(identifier: string): Promise<ArrayBuffer | null> {
    const identityKey = this.identityKeys.get(identifier);
    return identityKey || null;
  }
  
  async getIdentity(identifier: string): Promise<ArrayBuffer | null> {
    return this.getIdentityKey(identifier);
  }
  
  // Session methods
  async loadSession(identifier: string): Promise<SessionType | null> {
    const session = this.sessions.get(identifier);
    return session || null;
  }
  
  async storeSession(identifier: string, session: SessionType): Promise<void> {
    this.sessions.set(identifier, session);
  }
  
  async removeSession(identifier: string): Promise<void> {
    this.sessions.delete(identifier);
  }
  
  async removeAllSessions(identifier: string): Promise<void> {
    // Convert keys to array before iterating to avoid TypeScript downlevelIteration error
    const sessionKeys = Array.from(this.sessions.keys());
    for (const key of sessionKeys) {
      if (key.startsWith(identifier)) {
        this.sessions.delete(key);
      }
    }
  }
  
  // Utility methods
  async generateIdentityKeyPair(): Promise<KeyPairType> {
    const keyPair = await KeyHelper.generateIdentityKeyPair();
    await this.setIdentityKeyPair(keyPair);
    return keyPair;
  }
  
  async generatePreKeys(startId: number, count: number): Promise<PreKeyType[]> {
    const preKeys: PreKeyType[] = [];
    for (let i = 0; i < count; i++) {
      const preKeyId = startId + i;
      const preKey = await KeyHelper.generatePreKey(preKeyId);
      await this.storePreKey(preKey.keyId, preKey.keyPair);
      preKeys.push(preKey);
    }
    return preKeys;
  }
  
  async generateSignedPreKey(keyId: number): Promise<SignedPreKeyType> {
    if (!this.identityKeyPair) {
      throw new Error('Identity key pair not available for signing');
    }
    
    const signedPreKey = await KeyHelper.generateSignedPreKey(this.identityKeyPair, keyId);
    await this.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);
    return signedPreKey;
  }
  
  // Initialize the store with all necessary keys
  async initialize(): Promise<void> {
    // Generate identity key pair if not already set
    if (!this.identityKeyPair) {
      await this.generateIdentityKeyPair();
    }
    
    // Generate pre-keys (typically 100)
    await this.generatePreKeys(1, 10); // Generate fewer for demo purposes
    
    // Generate signed pre-key
    await this.generateSignedPreKey(1);
  }
}

// Create a global store instance
export const signalStore = new SignalProtocolStore();

// Initialize the store
export async function initializeSignalProtocol(): Promise<void> {
  await signalStore.initialize();
}

// Export the KeyHelper and util for use in other files
export { KeyHelper, util };
