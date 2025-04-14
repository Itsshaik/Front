/**
 * This file serves as a shim for the mocha-bytebuffer module.
 * It's needed because libsignal-protocol is directly requiring 'mocha-bytebuffer'.
 * We'll create a shim in our Vite setup to make this work.
 */

// Re-export ByteBuffer from the bytebuffer module
import ByteBuffer from 'bytebuffer';
export default ByteBuffer;