/**
 * Type definitions for bytebuffer
 */

declare module 'bytebuffer' {
  export interface ByteBufferStatic {
    /**
     * Wraps a buffer or a string to a ByteBuffer
     */
    wrap(buffer: ArrayBuffer | string, encoding?: string): ByteBuffer;
    
    /**
     * Allocates a new ByteBuffer
     */
    allocate(capacity?: number, littleEndian?: boolean): ByteBuffer;
  }
  
  export interface ByteBuffer {
    /**
     * Converts this ByteBuffer to a string
     */
    toString(encoding?: string): string;
    
    /**
     * Converts this ByteBuffer to an ArrayBuffer
     */
    toArrayBuffer(): ArrayBuffer;
    
    /**
     * Gets the capacity of this ByteBuffer
     */
    capacity(): number;
    
    /**
     * Gets the offset of this ByteBuffer
     */
    offset: number;
    
    /**
     * Gets the limit of this ByteBuffer
     */
    limit: number;
    
    /**
     * Resets this ByteBuffer's offset
     */
    reset(): ByteBuffer;
    
    /**
     * Clears this ByteBuffer's offsets
     */
    clear(): ByteBuffer;
    
    /**
     * Flips this ByteBuffer
     */
    flip(): ByteBuffer;
    
    /**
     * Sets this ByteBuffer's limit
     */
    limit(limit: number): ByteBuffer;
    
    /**
     * Sets this ByteBuffer's offset
     */
    offset(offset: number): ByteBuffer;
    
    /**
     * Marks an offset on this ByteBuffer
     */
    mark(offset?: number): ByteBuffer;
    
    /**
     * Resets this ByteBuffer's offset to the marked offset
     */
    reset(): ByteBuffer;
    
    /**
     * Advances the offset by the given number of bytes
     */
    skip(length: number): ByteBuffer;
  }
  
  const ByteBuffer: ByteBufferStatic;
  export default ByteBuffer;
}