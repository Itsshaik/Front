/**
 * Buffer Utilities
 * 
 * This module provides a compatibility layer for Buffer operations in the browser.
 * It uses the buffer package to provide Buffer functionality in the browser.
 */

import { Buffer as BufferPolyfill } from 'buffer';

// Make sure Buffer is available globally for browser environments
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  (window as any).Buffer = BufferPolyfill;
}

/**
 * Convert array buffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return BufferPolyfill.from(buffer).toString('base64');
}

/**
 * Convert base64 string to array buffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return BufferPolyfill.from(base64, 'base64');
}

/**
 * Convert array buffer to hex string
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to array buffer
 */
export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export { BufferPolyfill as Buffer };