import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Paperclip, Camera, Mic, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  onSendMessage: (text: string, attachment?: File | null) => void;
  isSending?: boolean;
}

export function MessageComposer({
  onSendMessage,
  isSending = false,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  const handleSendMessage = () => {
    if (message.trim() || attachment) {
      onSendMessage(message, attachment);
      setMessage("");
      setAttachment(null);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachment(files[0]);
    }
  };
  
  return (
    <div className="p-4 bg-white border-t border-zinc-200">
      <div className="flex items-end">
        <div className="flex-1 bg-zinc-100 rounded-lg p-3">
          <div className="flex items-center text-xs text-emerald-500 mb-2">
            <Lock className="h-3 w-3 mr-1" />
            <span>End-to-end encrypted</span>
          </div>
          
          {attachment && (
            <div className="mb-2 p-2 bg-white rounded-md flex items-center justify-between">
              <div className="flex items-center">
                <FileIcon className="mr-2 h-4 w-4 text-zinc-500" />
                <span className="text-sm truncate max-w-[200px]">{attachment.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setAttachment(null)}
              >
                <Cross className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent resize-none outline-none border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
          
          <div className="flex mt-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Paperclip className="h-5 w-5 text-zinc-500 hover:text-primary" />
            </label>
            
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-transparent"
            >
              <Camera className="h-5 w-5 text-zinc-500 hover:text-primary" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-transparent"
            >
              <Mic className="h-5 w-5 text-zinc-500 hover:text-primary" />
            </Button>
          </div>
        </div>
        
        <Button
          className="ml-3 w-10 h-10 rounded-full p-0 bg-primary text-white"
          onClick={handleSendMessage}
          disabled={isSending || (!message.trim() && !attachment)}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function FileIcon({ className, ...props }: React.ComponentProps<typeof Paperclip>) {
  return <Paperclip className={cn("", className)} {...props} />;
}

function Cross({ className, ...props }: React.ComponentProps<typeof Paperclip>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
