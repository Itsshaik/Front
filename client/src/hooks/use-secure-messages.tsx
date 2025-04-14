import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMessages } from '@/contexts/message-context';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UseSecureMessagesProps {
  contactId?: number;
}

export function useSecureMessages({ contactId }: UseSecureMessagesProps = {}) {
  const { user } = useAuth();
  const { selectedContact, selectContact, sendMessage: contextSendMessage } = useMessages();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize secure session with contact
  const initializeSecureSession = useCallback(async (targetContactId: number) => {
    if (!user) return false;
    
    try {
      setIsInitializing(true);
      
      // Check if session exists
      const sessionResponse = await fetch(`/api/sessions/${user.id}/${targetContactId}`, {
        credentials: 'include',
      });
      
      // If session exists, we don't need to initialize
      if (sessionResponse.ok) {
        return true;
      }
      
      // Get contact's public key
      const contactResponse = await fetch(`/api/users/${targetContactId}`, {
        credentials: 'include',
      });
      
      if (!contactResponse.ok) {
        throw new Error('Failed to get contact information');
      }
      
      const contactData = await contactResponse.json();
      
      if (!contactData.publicKey) {
        throw new Error('Contact has no public key');
      }
      
      // Create a new session
      const sessionData = {
        userId: user.id,
        contactId: targetContactId,
        sessionData: JSON.stringify({
          initialized: true,
          timestamp: new Date().toISOString(),
        }),
      };
      
      const createSessionResponse = await apiRequest('POST', '/api/sessions', sessionData);
      
      if (!createSessionResponse.ok) {
        throw new Error('Failed to create secure session');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize secure session:', error);
      toast({
        title: 'Security Setup Failed',
        description: 'Could not establish a secure connection with this contact.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [user, toast]);

  // Use the contact ID from props or from selected contact
  const currentContactId = contactId || selectedContact?.id;

  // Initialize session when contact changes
  useEffect(() => {
    if (currentContactId && user) {
      initializeSecureSession(currentContactId);
    }
  }, [currentContactId, user, initializeSecureSession]);

  // Send an encrypted message
  const sendSecureMessage = useCallback(async (text: string, attachment?: File) => {
    if (!user || !currentContactId) {
      toast({
        title: 'Cannot Send Message',
        description: 'No contact selected or you are not logged in.',
        variant: 'destructive',
      });
      return false;
    }
    
    // Use the message context to send the message
    return await contextSendMessage(text, attachment);
  }, [user, currentContactId, contextSendMessage, toast]);

  return {
    isInitializing,
    sendSecureMessage,
    initializeSecureSession,
  };
}
