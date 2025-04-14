import {
  users, type User, type InsertUser,
  contacts, type Contact, type InsertContact,
  messages, type Message, type InsertMessage,
  sessions, type Session, type InsertSession
} from "@shared/schema";

export interface IStorage {
  // User Operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserKeys(userId: number, publicKey: string, identityKey: string): Promise<User | undefined>;
  
  // Contact Operations
  getContacts(userId: number): Promise<(User & { isVerified: boolean })[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  verifyContact(userId: number, contactUserId: number): Promise<Contact | undefined>;
  
  // Message Operations
  getMessages(senderId: number, receiverId: number): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<void>;
  
  // Session Operations
  getSession(userId: number, contactId: number): Promise<Session | undefined>;
  createOrUpdateSession(session: InsertSession): Promise<Session>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private messages: Map<number, Message>;
  private sessions: Map<string, Session>;
  
  private userIdCounter: number;
  private contactIdCounter: number;
  private messageIdCounter: number;
  private sessionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.messages = new Map();
    this.sessions = new Map();
    
    this.userIdCounter = 1;
    this.contactIdCounter = 1;
    this.messageIdCounter = 1;
    this.sessionIdCounter = 1;
  }

  // User Operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      status: "Available",
      publicKey: null,
      identityKey: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserKeys(userId: number, publicKey: string, identityKey: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      publicKey,
      identityKey
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Contact Operations
  async getContacts(userId: number): Promise<(User & { isVerified: boolean })[]> {
    const userContacts = Array.from(this.contacts.values())
      .filter(contact => contact.userId === userId);
    
    const contactsWithDetails = await Promise.all(
      userContacts.map(async contact => {
        const contactUser = await this.getUser(contact.contactUserId);
        if (!contactUser) throw new Error(`Contact user with id ${contact.contactUserId} not found`);
        
        return {
          ...contactUser,
          isVerified: contact.isVerified || false
        };
      })
    );
    
    return contactsWithDetails;
  }

  async addContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const now = new Date();
    const contact: Contact = {
      ...insertContact,
      id,
      createdAt: now
    };
    
    this.contacts.set(id, contact);
    return contact;
  }

  async verifyContact(userId: number, contactUserId: number): Promise<Contact | undefined> {
    const contact = Array.from(this.contacts.values()).find(
      c => c.userId === userId && c.contactUserId === contactUserId
    );
    
    if (!contact) return undefined;
    
    const updatedContact = {
      ...contact,
      isVerified: true
    };
    
    this.contacts.set(contact.id, updatedContact);
    return updatedContact;
  }

  // Message Operations
  async getMessages(senderId: number, receiverId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === senderId && message.receiverId === receiverId) ||
        (message.senderId === receiverId && message.receiverId === senderId)
      )
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const message: Message = {
      ...insertMessage,
      id,
      isRead: false,
      sentAt: now
    };
    
    this.messages.set(id, message);
    return message;
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
    const messagesToUpdate = Array.from(this.messages.values())
      .filter(message => 
        message.senderId === senderId && 
        message.receiverId === receiverId && 
        !message.isRead
      );
    
    for (const message of messagesToUpdate) {
      const updatedMessage = {
        ...message,
        isRead: true
      };
      this.messages.set(message.id, updatedMessage);
    }
  }

  // Session Operations
  async getSession(userId: number, contactId: number): Promise<Session | undefined> {
    const sessionKey = `${userId}-${contactId}`;
    return Array.from(this.sessions.values()).find(
      session => session.userId === userId && session.contactId === contactId
    );
  }

  async createOrUpdateSession(insertSession: InsertSession): Promise<Session> {
    const existingSession = await this.getSession(insertSession.userId, insertSession.contactId);
    
    if (existingSession) {
      const updatedSession = {
        ...existingSession,
        sessionData: insertSession.sessionData,
        lastUpdated: new Date()
      };
      
      this.sessions.set(existingSession.id.toString(), updatedSession);
      return updatedSession;
    }
    
    const id = this.sessionIdCounter++;
    const now = new Date();
    const session: Session = {
      ...insertSession,
      id,
      lastUpdated: now
    };
    
    this.sessions.set(id.toString(), session);
    return session;
  }
}

export const storage = new MemStorage();
