import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertContactSchema, 
  insertMessageSchema, 
  insertSessionSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to log in" });
    }
  });
  
  app.post("/api/users/:userId/keys", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { publicKey, identityKey } = req.body;
      
      if (!publicKey || !identityKey) {
        return res.status(400).json({ message: "Public key and identity key are required" });
      }
      
      const updatedUser = await storage.updateUserKeys(userId, publicKey, identityKey);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user keys" });
    }
  });
  
  // Contact routes
  app.get("/api/users/:userId/contacts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const contacts = await storage.getContacts(userId);
      
      res.status(200).json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });
  
  app.post("/api/users/:userId/contacts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { contactUsername } = req.body;
      
      if (!contactUsername) {
        return res.status(400).json({ message: "Contact username is required" });
      }
      
      const contactUser = await storage.getUserByUsername(contactUsername);
      
      if (!contactUser) {
        return res.status(404).json({ message: "Contact user not found" });
      }
      
      // Prevent adding self as contact
      if (contactUser.id === userId) {
        return res.status(400).json({ message: "Cannot add yourself as a contact" });
      }
      
      const contactData = {
        userId,
        contactUserId: contactUser.id,
        isVerified: false
      };
      
      const contact = await storage.addContact(contactData);
      
      // Add reciprocal contact
      await storage.addContact({
        userId: contactUser.id,
        contactUserId: userId,
        isVerified: false
      });
      
      res.status(201).json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to add contact" });
    }
  });
  
  app.post("/api/users/:userId/contacts/:contactId/verify", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const contactId = parseInt(req.params.contactId);
      
      const verifiedContact = await storage.verifyContact(userId, contactId);
      
      if (!verifiedContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.status(200).json(verifiedContact);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify contact" });
    }
  });
  
  // Message routes
  app.get("/api/messages/:senderId/:receiverId", async (req: Request, res: Response) => {
    try {
      const senderId = parseInt(req.params.senderId);
      const receiverId = parseInt(req.params.receiverId);
      
      const messages = await storage.getMessages(senderId, receiverId);
      
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });
  
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.sendMessage(messageData);
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  app.post("/api/messages/:senderId/:receiverId/read", async (req: Request, res: Response) => {
    try {
      const senderId = parseInt(req.params.senderId);
      const receiverId = parseInt(req.params.receiverId);
      
      await storage.markMessagesAsRead(senderId, receiverId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // Session routes
  app.get("/api/sessions/:userId/:contactId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const contactId = parseInt(req.params.contactId);
      
      const session = await storage.getSession(userId, contactId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.status(200).json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to get session" });
    }
  });
  
  app.post("/api/sessions", async (req: Request, res: Response) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createOrUpdateSession(sessionData);
      
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create or update session" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
