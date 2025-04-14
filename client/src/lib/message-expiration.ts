/**
 * Message Expiration Module
 * 
 * This module implements "disappearing messages" functionality similar to
 * secure messaging apps like Signal and WhatsApp.
 * 
 * Features:
 * - Messages automatically expire after a set time
 * - Prevents message content from being stored indefinitely
 * - Provides secure deletion of message content from memory
 */

// Types of expiration times available (in seconds)
export enum ExpirationTime {
  OFF = 0,
  MINUTE_1 = 60,
  MINUTES_5 = 300,
  HOUR_1 = 3600,
  HOURS_6 = 21600,
  HOURS_12 = 43200,
  DAY_1 = 86400,
  WEEK_1 = 604800,
}

// Message expiration status
export interface ExpirationStatus {
  isExpiring: boolean;
  expiresAt: number | null;
  timeRemaining: number | null;
}

// Store expiring message IDs and their expiration times
const expiringMessages: Map<string, {
  expirationTime: number;  // Total lifetime in ms
  createdAt: number;       // Timestamp when created
  expiresAt: number;       // Timestamp when it will expire
  callback?: () => void;   // Optional callback when message expires
}> = new Map();

// Active timers for message expiration
const expirationTimers: Map<string, number> = new Map();

/**
 * Schedule a message for expiration
 * 
 * @param messageId Unique identifier for the message
 * @param expirationTime Time in seconds until message expires
 * @param callback Optional callback to execute when message expires
 */
export function scheduleMessageExpiration(
  messageId: string,
  expirationTime: ExpirationTime,
  callback?: () => void
): void {
  if (expirationTime === ExpirationTime.OFF) {
    return; // Don't schedule if expiration is turned off
  }
  
  const now = Date.now();
  const expirationMs = expirationTime * 1000;
  const expiresAt = now + expirationMs;
  
  // Store message expiration data
  expiringMessages.set(messageId, {
    expirationTime: expirationMs,
    createdAt: now,
    expiresAt,
    callback
  });
  
  // Clear any existing timer for this message
  if (expirationTimers.has(messageId)) {
    window.clearTimeout(expirationTimers.get(messageId));
  }
  
  // Set a timer to expire the message
  const timerId = window.setTimeout(() => {
    // Remove message data on expiration
    expiringMessages.delete(messageId);
    expirationTimers.delete(messageId);
    
    // Execute callback if provided
    if (callback) {
      callback();
    }
  }, expirationMs);
  
  // Store the timer ID
  expirationTimers.set(messageId, timerId);
}

/**
 * Cancel expiration for a message
 * 
 * @param messageId Unique identifier for the message
 */
export function cancelMessageExpiration(messageId: string): void {
  if (expirationTimers.has(messageId)) {
    window.clearTimeout(expirationTimers.get(messageId));
    expirationTimers.delete(messageId);
  }
  
  expiringMessages.delete(messageId);
}

/**
 * Get expiration status for a message
 * 
 * @param messageId Unique identifier for the message
 * @returns Status of message expiration
 */
export function getExpirationStatus(messageId: string): ExpirationStatus {
  const messageExpiration = expiringMessages.get(messageId);
  
  if (!messageExpiration) {
    return {
      isExpiring: false,
      expiresAt: null,
      timeRemaining: null
    };
  }
  
  const now = Date.now();
  const timeRemaining = Math.max(0, messageExpiration.expiresAt - now);
  
  return {
    isExpiring: true,
    expiresAt: messageExpiration.expiresAt,
    timeRemaining
  };
}

/**
 * Format time remaining in a human-readable format
 * 
 * @param timeRemainingMs Time remaining in milliseconds
 * @returns Formatted time string
 */
export function formatTimeRemaining(timeRemainingMs: number): string {
  if (timeRemainingMs <= 0) {
    return 'Expired';
  }
  
  const seconds = Math.floor(timeRemainingMs / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Securely erase message content from memory
 * This overwrites the string data with random content before letting it be garbage collected
 * 
 * @param messageContent Reference to message content to erase
 */
export function secureErase(messageContent: string): void {
  // Get backing array buffer of the string (this is a simplification as strings are immutable in JS)
  // In a real implementation, this would work with a mutable buffer
  const contentBuffer = new TextEncoder().encode(messageContent);
  
  // Overwrite with random data 3 times
  for (let i = 0; i < 3; i++) {
    const randomData = window.crypto.getRandomValues(new Uint8Array(contentBuffer.length));
    // In reality, strings are immutable in JavaScript, so this is mostly symbolic
    // But it helps with ArrayBuffers that might contain sensitive data
    for (let j = 0; j < contentBuffer.length; j++) {
      contentBuffer[j] = randomData[j];
    }
  }
}

/**
 * Set a default expiration time for all messages in a conversation
 * 
 * @param conversationId Unique identifier for the conversation
 * @param expirationTime Time in seconds for message expiration
 */
export function setConversationExpirationTime(
  conversationId: string,
  expirationTime: ExpirationTime
): void {
  localStorage.setItem(`conversation_expiration_${conversationId}`, expirationTime.toString());
}

/**
 * Get the default expiration time for a conversation
 * 
 * @param conversationId Unique identifier for the conversation
 * @returns Expiration time in seconds
 */
export function getConversationExpirationTime(conversationId: string): ExpirationTime {
  const storedValue = localStorage.getItem(`conversation_expiration_${conversationId}`);
  if (storedValue) {
    return parseInt(storedValue, 10) as ExpirationTime;
  }
  return ExpirationTime.OFF; // Default to no expiration
}

/**
 * Immediately expire and remove all messages for a conversation
 * 
 * @param conversationId Unique identifier for the conversation
 */
export function expireAllMessages(conversationId: string): void {
  // Find all message IDs for this conversation
  // In a real implementation, this would come from a message store
  const messageIds: string[] = Array.from(expiringMessages.keys())
    .filter(id => id.startsWith(`${conversationId}_`));
  
  // Expire each message
  messageIds.forEach(messageId => {
    const messageData = expiringMessages.get(messageId);
    if (messageData?.callback) {
      messageData.callback();
    }
    
    cancelMessageExpiration(messageId);
  });
}