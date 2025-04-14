import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  status: text("status").default("Available"),
  createdAt: timestamp("created_at").defaultNow(),
  publicKey: text("public_key"),
  identityKey: text("identity_key"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contactUserId: integer("contact_user_id").notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  userId: true,
  contactUserId: true,
  isVerified: true,
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  encryptedContent: text("encrypted_content").notNull(),
  encryptedKey: text("encrypted_key"),
  iv: text("iv"),
  isRead: boolean("is_read").default(false),
  hasAttachment: boolean("has_attachment").default(false),
  attachmentType: text("attachment_type"),
  attachmentName: text("attachment_name"),
  attachmentSize: text("attachment_size"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  encryptedContent: true,
  encryptedKey: true,
  iv: true,
  hasAttachment: true,
  attachmentType: true,
  attachmentName: true,
  attachmentSize: true,
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contactId: integer("contact_id").notNull(),
  sessionData: text("session_data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  contactId: true,
  sessionData: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
