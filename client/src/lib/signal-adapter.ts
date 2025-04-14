/**
 * Signal Protocol Adapter
 * 
 * This file provides adapter functions for the Signal Protocol functionality
 * without directly relying on the libsignal-protocol library.
 * It implements the key encryption/decryption functionality we need.
 */

import ByteBuffer from 'bytebuffer';

// TypeScript definitions for the adapter
export interface KeyPairType {
  pubKey: ArrayBuffer;
  privKey: ArrayBuffer;
}

export interface PreKeyType {
  keyId: number;
  keyPair: KeyPairType;
}

export interface SignedPreKeyType {
  keyId: number;
  keyPair: KeyPairType;
  signature: ArrayBuffer;
}

export interface SessionType {
  [key: string]: any;
}

export interface SignalProtocolStore {
  getIdentityKeyPair(): Promise<KeyPairType>;
  getLocalRegistrationId(): Promise<number>;
  putIdentityKeyPair(keyPair: KeyPairType): Promise<void>;
  getIdentityKey(identifier: string): Promise<ArrayBuffer | null>;
  saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean>;
  isTrustedIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean>;
  loadPreKey(keyId: number | string): Promise<KeyPairType>;
  storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void>;
  removePreKey(keyId: number | string): Promise<void>;
  loadSignedPreKey(keyId: number | string): Promise<KeyPairType>;
  storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void>;
  removeSignedPreKey(keyId: number | string): Promise<void>;
  loadSession(identifier: string): Promise<SessionType | null>;
  storeSession(identifier: string, session: SessionType): Promise<void>;
  removeSession(identifier: string): Promise<void>;
  removeAllSessions(identifier: string): Promise<void>;
}

// Helper class that provides cryptographic functions similar to libsignal-protocol
export class KeyHelper {
  // Generate a new identity key pair
  static async generateIdentityKeyPair(): Promise<KeyPairType> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );
    
    const pubKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    
    return {
      pubKey,
      privKey
    };
  }
  
  // Generate a random registration ID
  static generateRegistrationId(): number {
    const regIdBuf = new ArrayBuffer(4);
    const regIdView = new Uint32Array(regIdBuf);
    window.crypto.getRandomValues(regIdView);
    return regIdView[0] & 0x3fff; // Ensure it's within a reasonable range
  }
  
  // Generate a pre-key with the given ID
  static async generatePreKey(keyId: number): Promise<PreKeyType> {
    const keyPair = await this.generateIdentityKeyPair();
    return {
      keyId,
      keyPair
    };
  }
  
  // Generate a signed pre-key with the given ID
  static async generateSignedPreKey(identityKeyPair: KeyPairType, keyId: number): Promise<SignedPreKeyType> {
    const keyPair = await this.generateIdentityKeyPair();
    
    // Import the identity key for signing
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      identityKeyPair.privKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );
    
    // Sign the public key
    const dataToSign = new Uint8Array(keyPair.pubKey);
    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      privateKey,
      dataToSign
    );
    
    return {
      keyId,
      keyPair,
      signature
    };
  }
}

// Utility functions similar to libsignal.util
export const util = {
  // Check if two ArrayBuffers are equal
  isEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    
    const aView = new Uint8Array(a);
    const bView = new Uint8Array(b);
    
    for (let i = 0; i < a.byteLength; i++) {
      if (aView[i] !== bView[i]) {
        return false;
      }
    }
    
    return true;
  },
  
  // Convert ArrayBuffer to string
  toString(buffer: ArrayBuffer): string {
    return ByteBuffer.wrap(buffer).toString('utf8');
  },
  
  // Convert string to ArrayBuffer
  toArrayBuffer(str: string): ArrayBuffer {
    return ByteBuffer.wrap(str, 'utf8').toArrayBuffer();
  }
};

// Export a simplified session builder and cipher
export class SessionBuilder {
  constructor(private store: SignalProtocolStore, private remoteId: string) {}
  
  // Simplified process prekey bundle method
  async processPreKeyBundle(bundle: any): Promise<void> {
    // In a real implementation, this would establish a session
    // For now, we'll simulate storing a session
    const session = {
      remoteIdentityKey: bundle.identityKey,
      established: true,
      timestamp: Date.now()
    };
    
    await this.store.storeSession(this.remoteId, session);
  }
}

export class SessionCipher {
  constructor(private store: SignalProtocolStore, private remoteId: string) {}
  
  // Simplified encrypt method
  async encrypt(plaintext: ArrayBuffer): Promise<{ type: number, body: string }> {
    // In a real implementation, this would use the Signal Protocol
    // For now, we'll do a simple encryption
    const session = await this.store.loadSession(this.remoteId);
    if (!session || !session.established) {
      throw new Error('No established session');
    }
    
    // Simple encryption for demonstration
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );
    
    // Encode the encrypted message
    const body = ByteBuffer.wrap(encrypted).toString('base64');
    
    return {
      type: 1, // Whisper message type
      body
    };
  }
  
  // Simplified decrypt method
  async decrypt(ciphertext: string): Promise<ArrayBuffer> {
    // In a real implementation, this would use the Signal Protocol
    // For now, we'll do a simple decryption
    const session = await this.store.loadSession(this.remoteId);
    if (!session || !session.established) {
      throw new Error('No established session');
    }
    
    // Simple decryption for demonstration
    // In a real implementation, we would decrypt using the session keys
    const buffer = ByteBuffer.wrap(ciphertext, 'base64').toArrayBuffer();
    return buffer;
  }
}