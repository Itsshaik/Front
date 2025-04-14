import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import { User, Message, Session } from "@shared/schema";

interface Contact extends User {
  isVerified: boolean;
  lastMessage?: {
    text: string;
    time: Date;
    isRead: boolean;
  };
}

interface DecryptedMessage {
  id: number;
  text: string;
  senderId: number;
  receiverId: number;
  isRead: boolean;
  sentAt: Date;
  hasAttachment: boolean;
  attachmentType?: string | null;
  attachmentName?: string | null;
  attachmentSize?: string | null;
}

interface MessageContextType {
  contacts: Contact[];
  messages: DecryptedMessage[];
  selectedContact: Contact | null;
  isLoadingContacts: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  selectContact: (contact: Contact) => void;
  fetchContacts: () => Promise<void>;
  fetchMessages: (contact: Contact) => Promise<void>;
  sendMessage: (text: string, attachment?: File) => Promise<boolean>;
  addContact: (username: string) => Promise<boolean>;
  verifyContact: (contactId: number) => Promise<boolean>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    } else {
      setContacts([]);
      setMessages([]);
      setSelectedContact(null);
    }
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      setIsLoadingContacts(true);
      const response = await fetch(`/api/users/${user.id}/contacts`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      
      const contactsData = await response.json();
      
      // For each contact, fetch the last message
      const contactsWithLastMessage = await Promise.all(
        contactsData.map(async (contact: Contact) => {
          if (!user) return contact;
          
          try {
            const messagesResponse = await fetch(`/api/messages/${user.id}/${contact.id}`, {
              credentials: "include",
            });
            
            if (!messagesResponse.ok) {
              return contact;
            }
            
            const messagesData = await messagesResponse.json();
            
            if (messagesData.length > 0) {
              const lastMessage = messagesData[messagesData.length - 1];
              
              let decryptedText = "";
              try {
                decryptedText = await decryptMessage(
                  lastMessage.encryptedContent,
                  lastMessage.encryptedKey,
                  lastMessage.iv
                );
              } catch (error) {
                console.error("Failed to decrypt last message for contact", contact.id, error);
                decryptedText = "[Encrypted message]";
              }
              
              return {
                ...contact,
                lastMessage: {
                  text: decryptedText,
                  time: new Date(lastMessage.sentAt),
                  isRead: lastMessage.isRead,
                },
              };
            }
            
            return contact;
          } catch (error) {
            console.error("Error fetching last message for contact", contact.id, error);
            return contact;
          }
        })
      );
      
      setContacts(contactsWithLastMessage);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      toast({
        title: "Failed to Load Contacts",
        description: "Could not retrieve your contacts. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const fetchMessages = async (contact: Contact) => {
    if (!user) return;
    
    try {
      setIsLoadingMessages(true);
      setSelectedContact(contact);
      
      const response = await fetch(`/api/messages/${user.id}/${contact.id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const messagesData = await response.json();
      
      // Decrypt messages
      const decryptedMessages = await Promise.all(
        messagesData.map(async (message: Message) => {
          try {
            const decryptedText = await decryptMessage(
              message.encryptedContent,
              message.encryptedKey,
              message.iv
            );
            
            return {
              id: message.id,
              text: decryptedText,
              senderId: message.senderId,
              receiverId: message.receiverId,
              isRead: message.isRead,
              sentAt: new Date(message.sentAt),
              hasAttachment: message.hasAttachment,
              attachmentType: message.attachmentType,
              attachmentName: message.attachmentName,
              attachmentSize: message.attachmentSize,
            };
          } catch (error) {
            console.error("Failed to decrypt message", message.id, error);
            return {
              id: message.id,
              text: "[Encrypted message]",
              senderId: message.senderId,
              receiverId: message.receiverId,
              isRead: message.isRead,
              sentAt: new Date(message.sentAt),
              hasAttachment: message.hasAttachment,
              attachmentType: message.attachmentType,
              attachmentName: message.attachmentName,
              attachmentSize: message.attachmentSize,
            };
          }
        })
      );
      
      setMessages(decryptedMessages);
      
      // Mark messages as read
      if (messagesData.some((m: Message) => m.senderId === contact.id && !m.isRead)) {
        await apiRequest(
          "POST", 
          `/api/messages/${contact.id}/${user.id}/read`, 
          {}
        );
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast({
        title: "Failed to Load Messages",
        description: "Could not retrieve your messages. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async (text: string, attachment?: File): Promise<boolean> => {
    if (!user || !selectedContact) return false;
    
    try {
      setIsSendingMessage(true);
      
      // Prepare attachment data if present
      let hasAttachment = false;
      let attachmentType = null;
      let attachmentName = null;
      let attachmentSize = null;
      
      if (attachment) {
        hasAttachment = true;
        attachmentType = attachment.type;
        attachmentName = attachment.name;
        attachmentSize = attachment.size.toString();
      }
      
      // Encrypt the message
      const { encryptedContent, encryptedKey, iv } = await encryptMessage(
        text,
        selectedContact.publicKey || ""
      );
      
      // Send the message
      const response = await apiRequest("POST", "/api/messages", {
        senderId: user.id,
        receiverId: selectedContact.id,
        encryptedContent,
        encryptedKey,
        iv,
        hasAttachment,
        attachmentType,
        attachmentName,
        attachmentSize,
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const messageData = await response.json();
      
      // Add to local messages
      setMessages(prev => [
        ...prev,
        {
          id: messageData.id,
          text,
          senderId: user.id,
          receiverId: selectedContact.id,
          isRead: false,
          sentAt: new Date(messageData.sentAt),
          hasAttachment,
          attachmentType,
          attachmentName,
          attachmentSize,
        },
      ]);
      
      // Update contacts with last message
      setContacts(prev => 
        prev.map(contact => 
          contact.id === selectedContact.id
            ? {
                ...contact,
                lastMessage: {
                  text,
                  time: new Date(),
                  isRead: false,
                },
              }
            : contact
        )
      );
      
      return true;
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to Send Message",
        description: "Could not send your message. Please try again later.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSendingMessage(false);
    }
  };

  const addContact = async (username: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const response = await apiRequest("POST", `/api/users/${user.id}/contacts`, {
        contactUsername: username,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add contact");
      }
      
      await fetchContacts();
      toast({
        title: "Contact Added",
        description: `${username} has been added to your contacts.`,
      });
      return true;
    } catch (error) {
      console.error("Failed to add contact:", error);
      toast({
        title: "Failed to Add Contact",
        description: error instanceof Error ? error.message : "Could not add contact. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const verifyContact = async (contactId: number): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const response = await apiRequest(
        "POST", 
        `/api/users/${user.id}/contacts/${contactId}/verify`, 
        {}
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify contact");
      }
      
      // Update contact in state
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId
            ? { ...contact, isVerified: true }
            : contact
        )
      );
      
      if (selectedContact?.id === contactId) {
        setSelectedContact(prev => prev ? { ...prev, isVerified: true } : null);
      }
      
      toast({
        title: "Contact Verified",
        description: "You have successfully verified this contact's identity.",
      });
      return true;
    } catch (error) {
      console.error("Failed to verify contact:", error);
      toast({
        title: "Verification Failed",
        description: "Could not verify this contact's identity. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    fetchMessages(contact);
  };

  return (
    <MessageContext.Provider
      value={{
        contacts,
        messages,
        selectedContact,
        isLoadingContacts,
        isLoadingMessages,
        isSendingMessage,
        selectContact,
        fetchContacts,
        fetchMessages,
        sendMessage,
        addContact,
        verifyContact,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
}
