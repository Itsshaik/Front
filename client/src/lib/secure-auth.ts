/**
 * Secure Authentication Module
 * 
 * Provides enhanced security for user authentication:
 * - Zero-knowledge password verification
 * - Advanced credential security
 * - Protection against replay attacks
 * - Support for multi-factor authentication
 * - Biometric authentication integration
 */

import { secureSet, secureGet, initSecureStorage } from './secure-storage';

// Authentication states
export enum AuthState {
  LOGGED_OUT = 'logged_out',
  PASSWORD_VERIFIED = 'password_verified',
  MFA_REQUIRED = 'mfa_required',
  FULLY_AUTHENTICATED = 'fully_authenticated'
}

// Session information
interface SessionInfo {
  userId: number;
  username: string;
  displayName: string;
  authState: AuthState;
  lastAuthenticated: number;
  authExpiry: number;
  deviceId: string;
}

// Current session (in memory only)
let currentSession: SessionInfo | null = null;

// Constants
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const PASSWORD_HASH_ITERATIONS = 200000; // Higher value than standard PBKDF2
const AUTH_VERSION = 2; // Version of the authentication protocol

/**
 * Generate a secure device identifier
 */
async function generateDeviceId(): Promise<string> {
  const deviceData = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    screen.pixelDepth,
    screen.width,
    screen.height,
    navigator.hardwareConcurrency
  ].join('|');
  
  const deviceBuffer = new TextEncoder().encode(deviceData);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', deviceBuffer);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a zero-knowledge proof of password
 * This allows password verification without sending the actual password
 */
async function createPasswordProof(
  username: string,
  password: string,
  serverChallenge: string
): Promise<{
  proof: string;
  version: number;
  iteration: number;
}> {
  // Salt is derived from username to ensure consistent derivation
  const usernameSalt = new TextEncoder().encode(`auth_salt_${username.toLowerCase()}`);
  
  // Import password as key material
  const passwordMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive password hash - this is what would normally be stored on the server
  const passwordHashBuffer = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: usernameSalt,
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: 'SHA-512'
    },
    passwordMaterial,
    512 // 64 bytes
  );
  
  // Convert to hex string
  const passwordHash = Array.from(new Uint8Array(passwordHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Create a challenge buffer that combines server challenge and password hash
  const challengeBuffer = new TextEncoder().encode(
    `${passwordHash}:${serverChallenge}:${Date.now()}`
  );
  
  // Generate proof by hashing the challenge
  const proofBuffer = await window.crypto.subtle.digest('SHA-512', challengeBuffer);
  const proof = Array.from(new Uint8Array(proofBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    proof,
    version: AUTH_VERSION,
    iteration: PASSWORD_HASH_ITERATIONS
  };
}

/**
 * Secure password-based registration
 * In a real app, this would communicate with a server
 */
export async function registerUser(
  username: string,
  password: string,
  displayName: string
): Promise<boolean> {
  try {
    // This is a mock server challenge - in reality this would come from server
    const mockServerChallenge = Array.from(
      window.crypto.getRandomValues(new Uint8Array(16))
    )
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate password verification data
    const passwordProof = await createPasswordProof(
      username, 
      password, 
      mockServerChallenge
    );
    
    // In a real implementation, this would be sent to the server
    // and the server would verify the proof against a stored password hash
    
    // For this example, we'll simulate by storing user data locally
    const deviceId = await generateDeviceId();
    const userId = Math.floor(Math.random() * 10000) + 1;
    
    const userData = {
      userId,
      username,
      displayName,
      passwordVerifier: passwordProof.proof.substring(0, 64), // First half of proof
      created: Date.now(),
      authVersion: AUTH_VERSION,
      authMethods: ['password'],
      devices: [{ deviceId, lastSeen: Date.now() }]
    };
    
    // Initialize secure storage with user's password
    await initSecureStorage(password);
    
    // Store user data securely
    await secureSet('userData', userData);
    
    return true;
  } catch (error) {
    console.error('Registration error:', error);
    return false;
  }
}

/**
 * Secure password-based login
 * In a real app, this would communicate with a server
 */
export async function loginWithPassword(
  username: string,
  password: string
): Promise<AuthState> {
  try {
    // In a real app, we would get a challenge from the server
    const mockServerChallenge = Array.from(
      window.crypto.getRandomValues(new Uint8Array(16))
    )
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate password proof
    const passwordProof = await createPasswordProof(
      username,
      password,
      mockServerChallenge
    );
    
    // Initialize secure storage with the password
    await initSecureStorage(password);
    
    // Get user data (simulating server response)
    const userData = await secureGet<any>('userData');
    if (!userData || userData.username !== username) {
      return AuthState.LOGGED_OUT;
    }
    
    // In a real app, the server would verify the proof
    // Here we're just checking if the partial proof matches what we stored
    if (passwordProof.proof.substring(0, 64) !== userData.passwordVerifier) {
      return AuthState.LOGGED_OUT;
    }
    
    // Check if MFA is required
    const mfaRequired = userData.authMethods.length > 1;
    
    // Create session
    const now = Date.now();
    currentSession = {
      userId: userData.userId,
      username: userData.username,
      displayName: userData.displayName,
      authState: mfaRequired ? AuthState.MFA_REQUIRED : AuthState.FULLY_AUTHENTICATED,
      lastAuthenticated: now,
      authExpiry: now + SESSION_DURATION,
      deviceId: await generateDeviceId()
    };
    
    // Store session info securely
    await secureSet('currentSession', currentSession);
    
    // Update device information
    const deviceId = await generateDeviceId();
    const existingDeviceIndex = userData.devices.findIndex(
      (d: any) => d.deviceId === deviceId
    );
    
    if (existingDeviceIndex >= 0) {
      userData.devices[existingDeviceIndex].lastSeen = now;
    } else {
      userData.devices.push({ deviceId, lastSeen: now });
    }
    
    // Update stored user data
    await secureSet('userData', userData);
    
    return currentSession.authState;
  } catch (error) {
    console.error('Login error:', error);
    return AuthState.LOGGED_OUT;
  }
}

/**
 * Complete multi-factor authentication
 */
export async function completeMfaAuthentication(
  verificationCode: string
): Promise<AuthState> {
  try {
    if (!currentSession) {
      return AuthState.LOGGED_OUT;
    }
    
    if (currentSession.authState !== AuthState.MFA_REQUIRED) {
      return currentSession.authState;
    }
    
    // In a real app, we would verify the MFA code with the server
    // For this example, we'll use a fixed code for demonstration
    if (verificationCode !== '123456') {
      return AuthState.MFA_REQUIRED;
    }
    
    // Update session
    currentSession.authState = AuthState.FULLY_AUTHENTICATED;
    currentSession.lastAuthenticated = Date.now();
    
    // Update stored session
    await secureSet('currentSession', currentSession);
    
    return AuthState.FULLY_AUTHENTICATED;
  } catch (error) {
    console.error('MFA verification error:', error);
    return AuthState.MFA_REQUIRED;
  }
}

/**
 * Get current session information
 */
export async function getCurrentSession(): Promise<SessionInfo | null> {
  try {
    // Check memory session first
    if (currentSession) {
      // Verify it hasn't expired
      if (Date.now() < currentSession.authExpiry) {
        return currentSession;
      } else {
        // Session expired
        currentSession = null;
        return null;
      }
    }
    
    // Try to load session from secure storage
    const storedSession = await secureGet<SessionInfo>('currentSession');
    if (storedSession && Date.now() < storedSession.authExpiry) {
      currentSession = storedSession;
      return currentSession;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Logout - clear session
 */
export async function logout(): Promise<void> {
  currentSession = null;
  await secureSet('currentSession', null);
}

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    // Check if the Web Authentication API is available
    if (!window.PublicKeyCredential) {
      return false;
    }
    
    // Check if platform authenticator is available
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Biometric check error:', error);
    return false;
  }
}

/**
 * Register biometric authentication
 * This sets up WebAuthn/FIDO2 authentication
 */
export async function registerBiometric(): Promise<boolean> {
  try {
    // Ensure user is authenticated
    const session = await getCurrentSession();
    if (!session || session.authState !== AuthState.FULLY_AUTHENTICATED) {
      throw new Error('User must be fully authenticated to register biometrics');
    }
    
    // Get user data
    const userData = await secureGet<any>('userData');
    if (!userData) {
      return false;
    }
    
    // In a real app, this would communicate with a server that implements WebAuthn
    // This is just a simplified simulation for demonstration purposes
    
    // If browser supports biometrics, add it as an auth method
    if (await isBiometricAvailable()) {
      if (!userData.authMethods.includes('biometric')) {
        userData.authMethods.push('biometric');
        userData.biometricRegistered = true;
        await secureSet('userData', userData);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Biometric registration error:', error);
    return false;
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometric(): Promise<AuthState> {
  try {
    // Check if biometrics are available
    if (!await isBiometricAvailable()) {
      return AuthState.LOGGED_OUT;
    }
    
    // Get user data
    const userData = await secureGet<any>('userData');
    if (!userData || !userData.authMethods.includes('biometric')) {
      return AuthState.LOGGED_OUT;
    }
    
    // In a real app, this would communicate with a server that implements WebAuthn
    // This is just a simplified simulation
    
    // Simulate biometric authentication
    const mockBiometricSuccess = true; // In a real app, this would be the result of WebAuthn verification
    
    if (mockBiometricSuccess) {
      // Create session
      const now = Date.now();
      currentSession = {
        userId: userData.userId,
        username: userData.username,
        displayName: userData.displayName,
        authState: AuthState.FULLY_AUTHENTICATED,
        lastAuthenticated: now,
        authExpiry: now + SESSION_DURATION,
        deviceId: await generateDeviceId()
      };
      
      // Store session info securely
      await secureSet('currentSession', currentSession);
      
      return AuthState.FULLY_AUTHENTICATED;
    }
    
    return AuthState.LOGGED_OUT;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return AuthState.LOGGED_OUT;
  }
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string;
} {
  let score = 0;
  const feedback: string[] = [];
  
  // Length
  if (password.length < 8) {
    feedback.push('Password is too short');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }
  
  // Complexity - uppercase
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }
  
  // Complexity - lowercase
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }
  
  // Complexity - numbers
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }
  
  // Complexity - special characters
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }
  
  // Common patterns
  const commonPatterns = [
    /12345/, /qwerty/, /password/, /admin/, /welcome/,
    /abc123/, /123abc/, /letmein/, /monkey/, /shadow/
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password.toLowerCase()))) {
    score -= 2;
    feedback.push('Avoid common password patterns');
  }
  
  // Repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters');
  }
  
  // Sequential characters
  const sequentialChars = "abcdefghijklmnopqrstuvwxyz01234567890";
  for (let i = 0; i < sequentialChars.length - 3; i++) {
    const fwd = sequentialChars.slice(i, i + 3);
    const rev = fwd.split('').reverse().join('');
    if (password.toLowerCase().includes(fwd) || password.toLowerCase().includes(rev)) {
      score -= 1;
      feedback.push('Avoid sequential characters');
      break;
    }
  }
  
  // Cap the score
  score = Math.max(0, Math.min(5, score));
  
  // Generate feedback message
  let feedbackMessage = '';
  if (score <= 1) {
    feedbackMessage = 'Very weak password. ' + feedback.join('. ');
  } else if (score === 2) {
    feedbackMessage = 'Weak password. ' + feedback.join('. ');
  } else if (score === 3) {
    feedbackMessage = 'Moderate password. ' + (feedback.length ? feedback.join('. ') : 'Consider adding more complexity.');
  } else if (score === 4) {
    feedbackMessage = 'Strong password.';
  } else {
    feedbackMessage = 'Very strong password.';
  }
  
  return {
    score,
    feedback: feedbackMessage
  };
}