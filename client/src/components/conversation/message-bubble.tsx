import React from "react";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, Lock, FileIcon } from "lucide-react";

interface MessageBubbleProps {
  message: string;
  time: Date;
  isCurrentUser: boolean;
  isRead?: boolean;
  contactName?: string;
  attachment?: {
    type: string;
    name: string;
    size: string;
  };
}

export function MessageBubble({
  message,
  time,
  isCurrentUser,
  isRead = false,
  contactName = "",
  attachment,
}: MessageBubbleProps) {
  return (
    <div className={cn("flex mb-4", isCurrentUser && "justify-end")}>
      {!isCurrentUser && (
        <AvatarWithStatus
          name={contactName}
          size="sm"
          className="mr-2 mt-1"
        />
      )}
      
      <div className={cn("max-w-[75%]")}>
        <div
          className={cn(
            "p-3 rounded-lg shadow-sm",
            isCurrentUser
              ? "bg-primary text-white"
              : "bg-white text-zinc-900"
          )}
        >
          {attachment && (
            <div className={cn(
              "p-2 rounded flex items-center mb-2",
              isCurrentUser ? "bg-white bg-opacity-20" : "bg-zinc-100"
            )}>
              <FileIcon className={cn(
                "mr-2",
                isCurrentUser ? "text-white" : "text-zinc-500"
              )} size={16} />
              <div className="flex-1">
                <div className={cn(
                  "text-sm truncate",
                  isCurrentUser ? "text-white" : "text-zinc-900"
                )}>
                  {attachment.name}
                </div>
                <div className={cn(
                  "text-xs",
                  isCurrentUser ? "text-white opacity-80" : "text-zinc-500"
                )}>
                  {attachment.size} - Encrypted
                </div>
              </div>
            </div>
          )}
          <p className="text-[15px]">{message}</p>
        </div>
        
        <div
          className={cn(
            "flex items-center text-xs text-zinc-500 mt-1",
            isCurrentUser ? "justify-end mr-1" : "ml-1"
          )}
        >
          <span>{format(time, "h:mm a")}</span>
          
          {isCurrentUser && (
            <>
              {isRead ? (
                <CheckCheck className="ml-2 h-3 w-3" />
              ) : (
                <Check className="ml-2 h-3 w-3" />
              )}
            </>
          )}
          
          <Lock className="ml-2 h-3 w-3 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}
