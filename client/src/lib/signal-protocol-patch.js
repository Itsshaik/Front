/**
 * Signal Protocol Library Patch
 * 
 * This file patches the libsignal-protocol library to work with our setup.
 * It creates a global ByteBuffer object that the library can use.
 */

// Import ByteBuffer
import ByteBuffer from 'bytebuffer';

// Make ByteBuffer available globally
window.ByteBuffer = ByteBuffer;

// Export for use in other files
export { ByteBuffer };