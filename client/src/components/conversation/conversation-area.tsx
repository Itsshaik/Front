import React, { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { Shield, Phone, Video, Info } from "lucide-react";
import { useMessages } from "@/contexts/message-context";
import { useAuth } from "@/contexts/auth-context";
import { useSecureMessages } from "@/hooks/use-secure-messages";
import { format } from "date-fns";

interface ConversationAreaProps {
  onOpenProfile: () => void;
}

export function ConversationArea({ onOpenProfile }: ConversationAreaProps) {
  const { user } = useAuth();
  const { selectedContact, messages, isSendingMessage } = useMessages();
  const { sendSecureMessage } = useSecureMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // If no contact selected, show empty state
  if (!selectedContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-100">
        <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
        <p className="text-zinc-500">Choose a contact to start messaging</p>
      </div>
    );
  }
  
  const handleSendMessage = async (text: string, attachment?: File | null) => {
    if (!text.trim() && !attachment) return;
    
    await sendSecureMessage(text, attachment || undefined);
  };
  
  // Group messages by date
  const groupedMessages: Record<string, typeof messages> = {};
  
  messages.forEach(message => {
    const date = format(message.sentAt, "yyyy-MM-dd");
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });
  
  const dateLabels: Record<string, string> = {
    [format(new Date(), "yyyy-MM-dd")]: "Today",
    [format(new Date(Date.now() - 86400000), "yyyy-MM-dd")]: "Yesterday",
  };
  
  return (
    <div className="flex-1 flex flex-col bg-zinc-100">
      {/* Conversation Header */}
      <div className="p-4 bg-white border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center">
          <AvatarWithStatus
            name={selectedContact.displayName || selectedContact.username}
            isOnline={selectedContact.status === "Available"}
            size="md"
          />
          <div className="ml-3">
            <h2 className="font-medium">{selectedContact.displayName || selectedContact.username}</h2>
            <div className="text-xs text-emerald-500 flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              <span>Secure connection established</span>
            </div>
          </div>
        </div>
        
        <div className="flex">
          <button className="p-2 text-zinc-600 rounded-full hover:bg-zinc-100 mr-2" title="Audio call">
            <Phone className="h-5 w-5" />
          </button>
          <button className="p-2 text-zinc-600 rounded-full hover:bg-zinc-100 mr-2" title="Video call">
            <Video className="h-5 w-5" />
          </button>
          <button
            className="p-2 text-zinc-600 rounded-full hover:bg-zinc-100"
            title="View contact info"
            onClick={onOpenProfile}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Message Thread */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Security Notice */}
        <div className="flex justify-center mb-6">
          <div className="py-1 px-3 bg-white rounded-full text-xs text-zinc-500">
            <Shield className="h-3 w-3 mr-1 text-emerald-500 inline" />
            Messages to {selectedContact.displayName || selectedContact.username} are end-to-end encrypted. No one outside this chat can read them.
          </div>
        </div>
        
        {/* Messages grouped by date */}
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <React.Fragment key={date}>
            <div className="flex justify-center mb-6">
              <div className="py-1 px-3 bg-white rounded-full text-xs text-zinc-500">
                {dateLabels[date] || format(new Date(date), "MMMM d, yyyy")}
              </div>
            </div>
            
            {dateMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.text}
                time={message.sentAt}
                isCurrentUser={message.senderId === user?.id}
                isRead={message.isRead}
                contactName={selectedContact.displayName || selectedContact.username}
                attachment={
                  message.hasAttachment
                    ? {
                        type: message.attachmentType || "",
                        name: message.attachmentName || "File",
                        size: message.attachmentSize || "Unknown size",
                      }
                    : undefined
                }
              />
            ))}
          </React.Fragment>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Composer */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        isSending={isSendingMessage}
      />
    </div>
  );
}
