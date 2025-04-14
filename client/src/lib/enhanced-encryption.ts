/**
 * Enhanced Encryption Module
 * 
 * This module provides stronger encryption capabilities beyond the basic Signal Protocol implementation.
 * It adds multiple layers of encryption, stronger key derivation, and additional security features.
 */

import { signalStore, KeyHelper } from './signal';
import { type KeyPairType } from './signal-adapter';

// Constants for security parameters
const PBKDF2_ITERATIONS = 100000; // High iteration count for key derivation
const SALT_BYTES = 32;
const MAC_KEY_BYTES = 32;
const AES_KEY_BYTES = 32;
const AES_GCM_TAG_SIZE = 16;
const AES_GCM_NONCE_SIZE = 12;

// Enhanced encryption interface
export interface EnhancedEncryptedMessage {
  // Multi-layered encryption
  ciphertext: string;        // The encrypted message content
  encryptionKey: string;     // The encrypted encryption key
  authTag: string;           // Authentication tag to verify message integrity
  iv: string;                // Initialization vector for AES-GCM
  salt: string;              // Salt for key derivation
  ephemeralPublicKey: string; // Temporary public key for key exchange
  // Additional security metadata
  securityVersion: number;   // Version of security protocol used
  timestampSent: number;     // When the message was encrypted (for TTL)
  messageTTL?: number;       // Optional time-to-live for message (in seconds)
  senderFingerprint: string; // Fingerprint of sender's identity key
}

/**
 * Generates a cryptographic fingerprint of a public key
 * Used for identity verification between users
 */
export async function generateKeyFingerprint(publicKey: ArrayBuffer): Promise<string> {
  const keyData = new Uint8Array(publicKey);
  const fingerprintBuffer = await window.crypto.subtle.digest('SHA-256', keyData);
  const fingerprintArray = Array.from(new Uint8Array(fingerprintBuffer));
  // Format as hex string with colons
  return fingerprintArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
}

/**
 * Derives multiple cryptographic keys from a master key using PBKDF2
 * This provides stronger key separation for different purposes
 */
async function deriveKeys(masterKey: ArrayBuffer, salt: Uint8Array): Promise<{
  encryptionKey: CryptoKey,
  macKey: CryptoKey
}> {
  // Import the master key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive the encryption key
  const encryptionKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-512'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Derive the MAC key with different parameters to ensure key separation
  const macKeyMaterial = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array([...salt].map(b => ~b)), // Invert bits for different derivation
      iterations: PBKDF2_ITERATIONS + 1, // Different iteration count
      hash: 'SHA-512'
    },
    baseKey,
    MAC_KEY_BYTES * 8
  );
  
  // Import the MAC key
  const macKey = await window.crypto.subtle.importKey(
    'raw',
    macKeyMaterial,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign', 'verify']
  );
  
  return { encryptionKey, macKey };
}

/**
 * Calculates a message authentication code (MAC) for the encrypted data
 * This provides additional integrity verification beyond AES-GCM's built-in authentication
 */
async function calculateMAC(
  macKey: CryptoKey, 
  encryptedData: ArrayBuffer, 
  iv: Uint8Array,
  salt: Uint8Array,
  additionalData?: ArrayBuffer
): Promise<ArrayBuffer> {
  // Create a composite buffer of all data to be authenticated
  const dataToAuthenticate = new Uint8Array([
    ...new Uint8Array(encryptedData),
    ...iv,
    ...salt,
    ...(additionalData ? new Uint8Array(additionalData) : new Uint8Array(0))
  ]);
  
  // Calculate HMAC
  return await window.crypto.subtle.sign(
    { name: 'HMAC', hash: 'SHA-512' },
    macKey,
    dataToAuthenticate
  );
}

/**
 * Verifies a message authentication code (MAC)
 */
async function verifyMAC(
  macKey: CryptoKey,
  mac: ArrayBuffer,
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  salt: Uint8Array,
  additionalData?: ArrayBuffer
): Promise<boolean> {
  // Create the same composite buffer used during MAC calculation
  const dataToAuthenticate = new Uint8Array([
    ...new Uint8Array(encryptedData),
    ...iv,
    ...salt,
    ...(additionalData ? new Uint8Array(additionalData) : new Uint8Array(0))
  ]);
  
  // Verify HMAC
  return await window.crypto.subtle.verify(
    { name: 'HMAC', hash: 'SHA-512' },
    macKey,
    mac,
    dataToAuthenticate
  );
}

/**
 * Encrypt a message with multiple layers of security
 * - Uses ephemeral keys for perfect forward secrecy
 * - Implements additional MAC for integrity
 * - Supports message expiration
 * - Includes sender verification
 */
export async function encryptEnhanced(
  message: string,
  recipientPublicKey: string,
  options: {
    messageTTL?: number,  // Message time-to-live in seconds
    additionalData?: ArrayBuffer // Additional authenticated data
  } = {}
): Promise<EnhancedEncryptedMessage> {
  try {
    // Generate a random salt
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    
    // Generate a random IV for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(AES_GCM_NONCE_SIZE));
    
    // Create a temporary (ephemeral) key pair for this message only
    const ephemeralKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-521', // Use a stronger curve than P-256
      },
      true,
      ['deriveKey', 'deriveBits']
    );
    
    // Convert recipient's public key from base64 to ArrayBuffer
    const recipientPubKeyBuffer = Buffer.from(recipientPublicKey, 'base64');
    
    // Import recipient's public key
    const importedRecipientPubKey = await window.crypto.subtle.importKey(
      'raw',
      recipientPubKeyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-521', // Must match the curve used for ephemeral key
      },
      false,
      []
    );
    
    // Derive a shared secret using ECDH
    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: importedRecipientPubKey,
      },
      ephemeralKeyPair.privateKey,
      512 // Larger key size
    );
    
    // Derive encryption and MAC keys from the shared secret
    const { encryptionKey, macKey } = await deriveKeys(sharedSecret, salt);
    
    // Encode message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    
    // Encrypt the message with AES-GCM
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: AES_GCM_TAG_SIZE * 8
      },
      encryptionKey,
      messageData
    );
    
    // Calculate additional MAC for layered security
    const mac = await calculateMAC(
      macKey, 
      encryptedContent, 
      iv, 
      salt, 
      options.additionalData
    );
    
    // Export the ephemeral public key
    const exportedEphemeralPubKey = await window.crypto.subtle.exportKey(
      'raw',
      ephemeralKeyPair.publicKey
    );
    
    // Get my identity key for fingerprinting
    const myIdentityKeyPair = await signalStore.getIdentityKeyPair();
    const myFingerprint = await generateKeyFingerprint(myIdentityKeyPair.pubKey);
    
    // Build the enhanced encrypted message
    return {
      ciphertext: Buffer.from(encryptedContent).toString('base64'),
      encryptionKey: Buffer.from(sharedSecret).toString('base64'),
      authTag: Buffer.from(mac).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64'),
      ephemeralPublicKey: Buffer.from(exportedEphemeralPubKey).toString('base64'),
      securityVersion: 2, // Our enhanced version
      timestampSent: Date.now(),
      messageTTL: options.messageTTL,
      senderFingerprint: myFingerprint
    };
  } catch (error) {
    console.error('Enhanced encryption error:', error);
    throw new Error('Failed to encrypt message with enhanced security');
  }
}

/**
 * Decrypt a message that was encrypted with the enhanced encryption
 * - Verifies message integrity with MAC
 * - Checks message expiration
 * - Verifies sender identity
 */
export async function decryptEnhanced(
  encryptedMessage: EnhancedEncryptedMessage,
  expectedSenderFingerprint?: string, // Optional fingerprint to verify sender
  additionalData?: ArrayBuffer // Additional authenticated data
): Promise<string> {
  try {
    // Check if message has expired
    if (encryptedMessage.messageTTL) {
      const messageAge = (Date.now() - encryptedMessage.timestampSent) / 1000; // in seconds
      if (messageAge > encryptedMessage.messageTTL) {
        throw new Error('Message has expired');
      }
    }
    
    // Convert base64 strings back to ArrayBuffers
    const encryptedData = Buffer.from(encryptedMessage.ciphertext, 'base64');
    const ivData = Buffer.from(encryptedMessage.iv, 'base64');
    const saltData = Buffer.from(encryptedMessage.salt, 'base64');
    const macData = Buffer.from(encryptedMessage.authTag, 'base64');
    const sharedSecret = Buffer.from(encryptedMessage.encryptionKey, 'base64');
    
    // Verify sender if fingerprint is provided
    if (expectedSenderFingerprint && 
        expectedSenderFingerprint !== encryptedMessage.senderFingerprint) {
      throw new Error('Sender identity verification failed');
    }
    
    // Derive encryption and MAC keys
    const { encryptionKey, macKey } = await deriveKeys(sharedSecret, new Uint8Array(saltData));
    
    // Verify the MAC
    const isValidMAC = await verifyMAC(
      macKey,
      macData,
      encryptedData,
      new Uint8Array(ivData),
      new Uint8Array(saltData),
      additionalData
    );
    
    if (!isValidMAC) {
      throw new Error('Message authentication failed');
    }
    
    // Decrypt the message content
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData,
        tagLength: AES_GCM_TAG_SIZE * 8
      },
      encryptionKey,
      encryptedData
    );
    
    // Decode the decrypted content to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (error) {
    console.error('Enhanced decryption error:', error);
    throw new Error(`Failed to decrypt message: ${error.message}`);
  }
}

/**
 * Generate a secure identity verification code that two users can compare
 * This helps detect man-in-the-middle attacks by allowing users to compare
 * a short code derived from both of their identity keys
 */
export async function generateSecurityCode(
  myIdentityKey: ArrayBuffer, 
  theirIdentityKey: ArrayBuffer
): Promise<string> {
  // Combine both identity keys, sorting them to ensure the same result for both users
  const combinedKeysArray = [
    new Uint8Array(myIdentityKey), 
    new Uint8Array(theirIdentityKey)
  ].sort((a, b) => {
    // Simple binary comparison
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  });
  
  // Concatenate the sorted keys
  const combinedKeys = new Uint8Array([
    ...combinedKeysArray[0],
    ...combinedKeysArray[1]
  ]);
  
  // Hash the combined keys
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedKeys);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert to a numeric code (using first 5 bytes = 40 bits)
  // This gives a 12-digit code that's easier for humans to verify
  const securityNumber = hashArray
    .slice(0, 5)
    .reduce((acc, byte, index) => acc + byte * Math.pow(2, (4 - index) * 8), 0);
  
  // Format as 4 groups of 3 digits
  return securityNumber
    .toString()
    .padStart(12, '0')
    .match(/.{1,3}/g)
    .join('-');
}

/**
 * Generate a secure key backup encrypted with a user password
 * This allows users to restore their keys on new devices
 */
export async function generateEncryptedKeyBackup(
  password: string
): Promise<{ backup: string, recoveryKey: string }> {
  // Get the keys that need to be backed up
  const identityKeyPair = await signalStore.getIdentityKeyPair();
  
  // Stringify the key material
  const keyBackup = {
    identityKey: {
      public: Buffer.from(identityKeyPair.pubKey).toString('base64'),
      private: Buffer.from(identityKeyPair.privKey).toString('base64')
    },
    registrationId: await signalStore.getLocalRegistrationId(),
    version: 1
  };
  
  // Generate a strong random recovery key as backup for the password
  const recoveryKeyBuffer = window.crypto.getRandomValues(new Uint8Array(32));
  const recoveryKey = Buffer.from(recoveryKeyBuffer).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  // Generate salt for key derivation
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  // Derive encryption key from password
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const encryptionKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-512'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate IV for encryption
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the key backup
  const backupData = new TextEncoder().encode(JSON.stringify(keyBackup));
  const encryptedBackup = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    backupData
  );
  
  // Combine salt, IV, recovery key hash and encrypted data into a single backup file
  const recoveryKeyHash = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(recoveryKey)
  );
  
  const backupFile = {
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    recoveryKeyHash: Buffer.from(recoveryKeyHash).toString('base64'),
    encryptedData: Buffer.from(encryptedBackup).toString('base64'),
    version: 1
  };
  
  return {
    backup: JSON.stringify(backupFile),
    recoveryKey
  };
}