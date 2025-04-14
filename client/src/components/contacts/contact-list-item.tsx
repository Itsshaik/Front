import React from "react";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

interface ContactListItemProps {
  name: string;
  isOnline?: boolean;
  isActive?: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  onClick: () => void;
}

export function ContactListItem({
  name,
  isOnline = false,
  isActive = false,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  onClick,
}: ContactListItemProps) {
  // Format time
  const formatTime = (date?: Date) => {
    if (!date) return "";
    
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "EEE");
    }
  };
  
  return (
    <div 
      className={cn(
        "p-4 hover:bg-lightGray border-b border-zinc-200 cursor-pointer flex items-center",
        isActive && "bg-zinc-100"
      )}
      onClick={onClick}
    >
      <AvatarWithStatus name={name} isOnline={isOnline} size="md" />
      
      <div className="ml-3 flex-1">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">{name}</h3>
          {lastMessageTime && (
            <span className="text-xs text-zinc-500">{formatTime(lastMessageTime)}</span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-zinc-500 truncate w-40">
            {lastMessage || "No messages yet"}
          </p>
          <div className="flex items-center">
            <Lock className="h-3 w-3 text-emerald-500 mr-1" />
            {unreadCount > 0 && (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                {unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
