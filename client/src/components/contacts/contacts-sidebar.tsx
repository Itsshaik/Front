import React, { useState } from "react";
import { ContactListItem } from "./contact-list-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Search } from "lucide-react";
import { useMessages } from "@/contexts/message-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const addContactSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

type AddContactForm = z.infer<typeof addContactSchema>;

export function ContactsSidebar() {
  const { contacts, selectContact, selectedContact, addContact } = useMessages();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  
  const filteredContacts = contacts.filter(contact => 
    contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const form = useForm<AddContactForm>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      username: "",
    },
  });
  
  const onSubmit = async (data: AddContactForm) => {
    setIsAddingContact(true);
    const success = await addContact(data.username);
    setIsAddingContact(false);
    
    if (success) {
      setIsAddContactOpen(false);
      form.reset();
    }
  };
  
  return (
    <>
      <div className="w-72 border-r border-zinc-200 flex flex-col bg-white h-full">
        <div className="p-4 border-b border-zinc-200">
          <div className="relative">
            <Input
              placeholder="Search contacts"
              className="pl-10 bg-zinc-100 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <ContactListItem
                key={contact.id}
                name={contact.displayName || contact.username}
                isOnline={contact.status === "Available"}
                isActive={selectedContact?.id === contact.id}
                lastMessage={contact.lastMessage?.text}
                lastMessageTime={contact.lastMessage?.time}
                unreadCount={0} // TODO: Implement unread count
                onClick={() => selectContact(contact)}
              />
            ))
          ) : (
            <div className="p-4 text-center text-zinc-500">
              {searchQuery ? "No contacts found" : "No contacts yet"}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-zinc-200">
          <Button 
            className="w-full bg-primary text-white"
            onClick={() => setIsAddContactOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>
      
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddContactOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingContact}>
                  {isAddingContact ? "Adding..." : "Add Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
