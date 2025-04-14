// Import our custom Signal Protocol adapter
import { KeyHelper, type KeyPairType } from './signal-adapter';
import { signalStore } from './signal';

// Generate a key pair for identity
export async function generateIdentityKeyPair(): Promise<{ publicKey: Buffer, privateKey: Buffer }> {
  const keyPair = await KeyHelper.generateIdentityKeyPair();
  return {
    publicKey: Buffer.from(keyPair.pubKey),
    privateKey: Buffer.from(keyPair.privKey),
  };
}

// Generate a signed pre-key
export async function generateSignedPreKey(identityKeyPair: KeyPairType, keyId: number) {
  return await KeyHelper.generateSignedPreKey(identityKeyPair, keyId);
}

// Generate a unique registration ID
export async function generateRegistrationId() {
  return KeyHelper.generateRegistrationId();
}

// Encrypt a message for a recipient
export async function encryptMessage(message: string, recipientPublicKey: string): Promise<{
  encryptedContent: string;
  encryptedKey: string;
  iv: string;
}> {
  try {
    // Generate a random AES key for message encryption
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encode message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    // Encrypt the message with AES-GCM
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      messageData
    );

    // Export the AES key
    const exportedKey = await window.crypto.subtle.exportKey('raw', key);

    // Convert recipient's public key from base64 to ArrayBuffer
    const recipientPubKey = Buffer.from(recipientPublicKey, 'base64');

    // Create a temporary Elliptic Curve key pair
    const ephemeralKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    // Import recipient's public key
    const importedPubKey = await window.crypto.subtle.importKey(
      'raw',
      recipientPubKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      []
    );

    // Derive a shared secret
    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: importedPubKey,
      },
      ephemeralKeyPair.privateKey,
      256
    );

    // Use the shared secret to encrypt the AES key
    const sharedKey = await window.crypto.subtle.importKey(
      'raw',
      sharedSecret,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt']
    );

    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      sharedKey,
      exportedKey
    );

    // Export the ephemeral public key
    const exportedEphemeralPubKey = await window.crypto.subtle.exportKey(
      'raw',
      ephemeralKeyPair.publicKey
    );

    // Return encrypted message, encrypted AES key, and IV
    // Create a combined buffer for the ephemeral public key and encrypted key
    const ephemeralPubKeyArray = new Uint8Array(exportedEphemeralPubKey);
    const encryptedKeyArray = new Uint8Array(encryptedKey);
    
    // Create a new array with enough space for both arrays
    const combinedArray = new Uint8Array(ephemeralPubKeyArray.length + encryptedKeyArray.length);
    
    // Copy the arrays into the combined array
    combinedArray.set(ephemeralPubKeyArray, 0);
    combinedArray.set(encryptedKeyArray, ephemeralPubKeyArray.length);
    
    return {
      encryptedContent: Buffer.from(encryptedContent).toString('base64'),
      encryptedKey: Buffer.from(combinedArray).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt a message using our private key
export async function decryptMessage(
  encryptedContent: string,
  encryptedKey: string,
  iv: string
): Promise<string> {
  try {
    // Convert base64 strings back to ArrayBuffers
    const encryptedData = Buffer.from(encryptedContent, 'base64');
    const ivData = Buffer.from(iv, 'base64');
    const encryptedKeyData = Buffer.from(encryptedKey, 'base64');

    // Get our identity key pair from the store
    const identityKeyPair = await signalStore.getIdentityKeyPair();
    
    // Extract the ephemeral public key and the encrypted AES key
    const ephemeralPubKey = encryptedKeyData.slice(0, 65);
    const actualEncryptedKey = encryptedKeyData.slice(65);

    // Import the ephemeral public key
    const importedEphemeralPubKey = await window.crypto.subtle.importKey(
      'raw',
      ephemeralPubKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      []
    );

    // Import our private key
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      identityKeyPair.privKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      ['deriveBits']
    );

    // Derive the shared secret
    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: importedEphemeralPubKey,
      },
      privateKey,
      256
    );

    // Use the shared secret to decrypt the AES key
    const sharedKey = await window.crypto.subtle.importKey(
      'raw',
      sharedSecret,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    const decryptedKeyData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData,
      },
      sharedKey,
      actualEncryptedKey
    );

    // Import the decrypted AES key
    const decryptedKey = await window.crypto.subtle.importKey(
      'raw',
      decryptedKeyData,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    // Decrypt the message content
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData,
      },
      decryptedKey,
      encryptedData
    );

    // Decode the decrypted content to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}
